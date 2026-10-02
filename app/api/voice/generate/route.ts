import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getAuthenticatedUserId } from "@/app/lib/server/adminAuth";
import { getTTSProvider } from "@/app/lib/server/tts/registry";
import { CURATED_VOICES } from "@/app/lib/server/tts/voices";
import {
  deductCreditsForVoice,
  refundCreditsForVoice,
  completeCreditTransaction,
} from "@/app/lib/server/creditService";
import { VOICE_SYNTHESIS_COST } from "@/app/config/credits";

export const dynamic = "force-dynamic";

export interface SceneInput {
  id: string;
  label?: string;
  text: string;
}

export interface GeneratedSceneVoice {
  id: string;
  label?: string;
  text: string;
  audioUrl: string;
  duration: number;
  words: Array<{ word: string; start: number; end: number }>;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let userId: string | null = null;
  let transactionId: string | undefined;

  try {
    // 1. Authenticate user server-side via token / session cookie / dev fallback
    userId = await getAuthenticatedUserId(req);
    const adminDb = getAdminClient();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to generate voiceover.", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      projectId,
      text,
      scenes: rawScenes,
      voiceConfig,
    }: {
      projectId?: string;
      text?: string;
      scenes?: SceneInput[];
      voiceConfig?: {
        voiceId?: string;
        speed?: number;
        stability?: number;
        similarityBoost?: number;
        language?: string;
        emotion?: string;
      };
    } = body;

    // Validate script text
    const cleanText = (text || "").trim();
    const hasScenes = Array.isArray(rawScenes) && rawScenes.length > 0;

    if (!cleanText && !hasScenes) {
      return NextResponse.json(
        { error: "Script text is required for voice generation.", code: "EMPTY_SCRIPT" },
        { status: 400 }
      );
    }

    // 2. Validate credits and atomically deduct server-side
    const scriptToCharge = cleanText || rawScenes!.map((s) => s.text).join(" ");
    const deductResult = await deductCreditsForVoice(userId, scriptToCharge);

    if (!deductResult.success) {
      return NextResponse.json(
        {
          error: deductResult.error || `You need ${VOICE_SYNTHESIS_COST} credits to generate a Voiceover.`,
          code: "INSUFFICIENT_CREDITS",
          creditsRemaining: deductResult.creditsRemaining,
          requiredCredits: VOICE_SYNTHESIS_COST,
        },
        { status: 402 }
      );
    }

    transactionId = deductResult.transactionId;

    // 3. Resolve TTS Provider
    const ttsProvider = await getTTSProvider();
    const voiceId = voiceConfig?.voiceId || CURATED_VOICES[0].id;
    const selectedVoice = CURATED_VOICES.find((v) => v.id === voiceId) || CURATED_VOICES[0];

    // Helper to upload audio buffer to Supabase Storage bucket 'voiceovers'
    async function uploadAudioBuffer(buffer: Buffer, mimeType: string, prefix: string): Promise<string> {
      const ext = mimeType.includes("wav") ? "wav" : "mp3";
      const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;

      try {
        const { error: uploadErr } = await adminDb.storage
          .from("voiceovers")
          .upload(fileName, buffer, {
            contentType: mimeType,
            upsert: true,
          });

        if (!uploadErr) {
          const { data: publicUrlData } = adminDb.storage
            .from("voiceovers")
            .getPublicUrl(fileName);

          if (publicUrlData?.publicUrl) {
            return publicUrlData.publicUrl;
          }
        }
      } catch (uploadException) {
        console.warn("[Voice API] Storage upload warning:", uploadException);
      }

      // Safe fallback data URI if storage service has unexpected network issue
      return `data:${mimeType};base64,${buffer.toString("base64")}`;
    }

    // 4. Generate Main Audio
    const mainSpeech = await ttsProvider.generateSpeech(scriptToCharge, {
      voiceId,
      speed: voiceConfig?.speed ?? 1.0,
      stability: voiceConfig?.stability ?? 0.5,
      similarityBoost: voiceConfig?.similarityBoost ?? 0.75,
      language: voiceConfig?.language,
      emotion: voiceConfig?.emotion,
    });

    const mainAudioUrl = await uploadAudioBuffer(
      mainSpeech.audioBuffer,
      mainSpeech.mimeType,
      `voice_${userId.slice(0, 8)}`
    );

    // 5. Structure Scene-Level Breakdown from the synthesized words
    const generatedScenes: GeneratedSceneVoice[] = [];
    if (hasScenes) {
      let wordCursor = 0;
      for (const scene of rawScenes!) {
        const sceneText = scene.text.trim();
        if (!sceneText) continue;

        const sceneWordTokens = sceneText.split(/\s+/).filter(Boolean);
        const sceneCount = sceneWordTokens.length;
        const matchedWords = mainSpeech.words.slice(wordCursor, wordCursor + sceneCount);
        wordCursor += sceneCount;

        const sceneStart = matchedWords.length > 0 ? matchedWords[0].start : 0;
        const sceneEnd = matchedWords.length > 0 ? matchedWords[matchedWords.length - 1].end : sceneCount * 0.38;
        const sceneDuration = Number(Math.max(1, sceneEnd - sceneStart).toFixed(2));

        generatedScenes.push({
          id: scene.id,
          label: scene.label || `Scene ${generatedScenes.length + 1}`,
          text: sceneText,
          audioUrl: mainAudioUrl,
          duration: sceneDuration,
          words: matchedWords.length > 0 ? matchedWords : sceneWordTokens.map((w, wi) => ({
            word: w,
            start: Number((wi * 0.38).toFixed(2)),
            end: Number(((wi + 1) * 0.38).toFixed(2)),
          })),
        });
      }
    }

    // 6. Store metadata in database (public.voice_generations)
    const { data: voiceRecord, error: dbErr } = await adminDb
      .from("voice_generations")
      .insert({
        project_id: projectId || null,
        user_id: userId,
        provider: ttsProvider.name.toLowerCase().includes("voice")
          ? "voiceai"
          : ttsProvider.name.toLowerCase().includes("elevenlabs")
          ? "elevenlabs"
          : "mock",
        voice_id: voiceId,
        voice_name: selectedVoice.name,
        language: voiceConfig?.language || selectedVoice.language,
        settings: {
          speed: voiceConfig?.speed ?? 1.0,
          stability: voiceConfig?.stability ?? 0.5,
          similarityBoost: voiceConfig?.similarityBoost ?? 0.75,
          emotion: voiceConfig?.emotion ?? "neutral",
        },
        script_text: scriptToCharge,
        audio_url: mainAudioUrl,
        duration: mainSpeech.duration,
        scenes: generatedScenes,
        words: mainSpeech.words,
        status: "completed",
        credits_used: VOICE_SYNTHESIS_COST,
      })
      .select()
      .single();

    if (dbErr) {
      console.warn("[Voice API] DB record insert warning:", dbErr.message);
    }

    // Mark credit transaction completed
    if (transactionId) {
      await completeCreditTransaction(transactionId, voiceRecord?.id);
    }

    return NextResponse.json({
      success: true,
      voiceGeneration: voiceRecord || {
        id: `local_${Date.now()}`,
        audio_url: mainAudioUrl,
        duration: mainSpeech.duration,
        words: mainSpeech.words,
        scenes: generatedScenes,
      },
      audioUrl: mainAudioUrl,
      duration: mainSpeech.duration,
      words: mainSpeech.words,
      scenes: generatedScenes,
      creditsUsed: VOICE_SYNTHESIS_COST,
      creditsRemaining: deductResult.creditsRemaining,
      generationTimeMs: Date.now() - startTime,
    });
  } catch (err: any) {
    console.error("[Voice API] Generation failed:", err?.message || err);

    // Auto refund deducted credits upon failure
    if (userId) {
      try {
        await refundCreditsForVoice(
          userId,
          transactionId,
          err?.message || "voice_generation_failed"
        );
      } catch (refundErr) {
        console.error("[Voice API] Refund failed:", refundErr);
      }
    }

    return NextResponse.json(
      {
        error: "Voice generation failed. Your credits have been refunded.",
        code: "GENERATION_FAILED",
        refunded: true,
        details: err?.message,
      },
      { status: 500 }
    );
  }
}
