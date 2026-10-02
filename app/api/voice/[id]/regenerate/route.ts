import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getAuthenticatedUserId } from "@/app/lib/server/adminAuth";
import { getTTSProvider } from "@/app/lib/server/tts/registry";
import { CURATED_VOICES } from "@/app/lib/server/tts/voices";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getAuthenticatedUserId(req);
    const adminDb = getAdminClient();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: existing, error: fetchErr } = await adminDb
      .from("voice_generations")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Voice generation record not found." }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      sceneId,
      text,
      voiceConfig,
    }: {
      sceneId?: string;
      text?: string;
      voiceConfig?: {
        voiceId?: string;
        speed?: number;
        stability?: number;
        similarityBoost?: number;
        language?: string;
        emotion?: string;
      };
    } = body;

    const ttsProvider = await getTTSProvider();
    const voiceId = voiceConfig?.voiceId || existing.voice_id || CURATED_VOICES[0].id;
    const speed = voiceConfig?.speed ?? existing.settings?.speed ?? 1.0;
    const stability = voiceConfig?.stability ?? existing.settings?.stability ?? 0.5;

    // Helper to upload audio buffer
    async function uploadAudioBuffer(buffer: Buffer, mimeType: string, prefix: string): Promise<string> {
      const ext = mimeType.includes("wav") ? "wav" : "mp3";
      const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;

      try {
        const { error: uploadErr } = await adminDb.storage
          .from("voiceovers")
          .upload(fileName, buffer, { contentType: mimeType, upsert: true });

        if (!uploadErr) {
          const { data: publicUrlData } = adminDb.storage.from("voiceovers").getPublicUrl(fileName);
          if (publicUrlData?.publicUrl) return publicUrlData.publicUrl;
        }
      } catch (e) {
        console.warn("[Regenerate] Storage upload fallback:", e);
      }
      return `data:${mimeType};base64,${buffer.toString("base64")}`;
    }

    // SCENE-LEVEL REGENERATION:
    if (sceneId) {
      const currentScenes: any[] = Array.isArray(existing.scenes) ? [...existing.scenes] : [];
      const sceneIndex = currentScenes.findIndex((s) => s.id === sceneId);
      const textToUse = text?.trim() || (sceneIndex >= 0 ? currentScenes[sceneIndex].text : "");

      if (!textToUse) {
        return NextResponse.json({ error: "Scene text cannot be empty." }, { status: 400 });
      }

      const sceneSpeech = await ttsProvider.generateSpeech(textToUse, {
        voiceId,
        speed,
        stability,
        language: voiceConfig?.language || existing.language,
        emotion: voiceConfig?.emotion,
      });

      const sceneAudioUrl = await uploadAudioBuffer(
        sceneSpeech.audioBuffer,
        sceneSpeech.mimeType,
        `scene_${sceneId}`
      );

      const updatedScene = {
        id: sceneId,
        label: sceneIndex >= 0 ? currentScenes[sceneIndex].label : `Scene`,
        text: textToUse,
        audioUrl: sceneAudioUrl,
        duration: sceneSpeech.duration,
        words: sceneSpeech.words,
      };

      if (sceneIndex >= 0) {
        currentScenes[sceneIndex] = updatedScene;
      } else {
        currentScenes.push(updatedScene);
      }

      await adminDb
        .from("voice_generations")
        .update({
          scenes: currentScenes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", userId);

      return NextResponse.json({
        success: true,
        scene: updatedScene,
        scenes: currentScenes,
      });
    }

    // FULL SCRIPT REGENERATION:
    const fullText = text?.trim() || existing.script_text;
    const speech = await ttsProvider.generateSpeech(fullText, {
      voiceId,
      speed,
      stability,
      language: voiceConfig?.language || existing.language,
      emotion: voiceConfig?.emotion,
    });

    const newAudioUrl = await uploadAudioBuffer(
      speech.audioBuffer,
      speech.mimeType,
      `voice_${userId.slice(0, 8)}`
    );

    const { data: updatedRecord, error: updateErr } = await adminDb
      .from("voice_generations")
      .update({
        voice_id: voiceId,
        audio_url: newAudioUrl,
        duration: speech.duration,
        words: speech.words,
        script_text: fullText,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      voiceGeneration: updatedRecord,
      audioUrl: newAudioUrl,
      duration: speech.duration,
      words: speech.words,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to regenerate voice." },
      { status: 500 }
    );
  }
}
