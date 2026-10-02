import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/app/lib/server/adminAuth";
import { groupWordsIntoSegments, TTSWordTimestamp } from "@/app/lib/captions/presets";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const elevenLabsKey =
      process.env.ELEVENLABS_API_KEY || "sk_acb75205876d9cd1aac6f4b139ac669aec257feca0e61a85";

    if (!elevenLabsKey) {
      return NextResponse.json(
        { error: "ElevenLabs API key is not configured for transcription." },
        { status: 503 }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    let fileBuffer: Buffer | null = null;
    let fileName = "video_audio.mp4";
    let mimeType = "video/mp4";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const videoUrl = formData.get("videoUrl") as string | null;

      if (file) {
        const arrayBuffer = await file.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
        fileName = file.name;
        mimeType = file.type || "video/mp4";
      } else if (videoUrl) {
        // Fetch from public video URL
        const videoRes = await fetch(videoUrl);
        if (!videoRes.ok) {
          throw new Error(`Failed to download video from URL: status ${videoRes.status}`);
        }
        const ab = await videoRes.arrayBuffer();
        fileBuffer = Buffer.from(ab);
        fileName = videoUrl.split("/").pop() || "footage.mp4";
      }
    } else {
      const body = await req.json().catch(() => ({}));
      const videoUrl = body.videoUrl;
      if (videoUrl) {
        const videoRes = await fetch(videoUrl);
        if (!videoRes.ok) {
          throw new Error(`Failed to download video from URL: status ${videoRes.status}`);
        }
        const ab = await videoRes.arrayBuffer();
        fileBuffer = Buffer.from(ab);
        fileName = videoUrl.split("/").pop() || "footage.mp4";
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json(
        { error: "No video or audio file provided for transcription." },
        { status: 400 }
      );
    }

    // Call ElevenLabs Scribe Speech-to-Text API
    const elevenFormData = new FormData();
    elevenFormData.append("model_id", "scribe_v1");

    // Convert Buffer to Blob
    const audioBlob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType });
    elevenFormData.append("file", audioBlob, fileName);


    const elevenRes = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "xi-api-key": elevenLabsKey,
      },
      body: elevenFormData,
    });

    if (!elevenRes.ok) {
      const errJson = await elevenRes.json().catch(() => ({}));
      console.warn("[Transcribe API] ElevenLabs Scribe returned error:", elevenRes.status, errJson);
      return NextResponse.json(
        {
          error:
            errJson?.detail?.message ||
            errJson?.message ||
            `ElevenLabs transcription failed with status ${elevenRes.status}`,
        },
        { status: elevenRes.status }
      );
    }

    const elevenData = await elevenRes.json();
    const rawWords = elevenData.words || [];

    // Filter and format word timestamps
    const words: TTSWordTimestamp[] = rawWords
      .filter((w: any) => w.type !== "audio_event" && w.text && w.text.trim())
      .map((w: any) => ({
        word: String(w.text).trim(),
        start: Number(w.start ?? 0),
        end: Number(w.end ?? (w.start ?? 0) + 0.3),
      }));

    const fullTranscript =
      elevenData.text || words.map((w) => w.word).join(" ");

    // Group words into natural kinetic caption segments (3-4 words per segment)
    const segments = groupWordsIntoSegments(words, 4);

    return NextResponse.json({
      success: true,
      transcript: fullTranscript,
      words,
      segments,
      duration: elevenData.audio_duration_secs || (words.length > 0 ? words[words.length - 1].end : 0),
      language: elevenData.language_code || "eng",
    });
  } catch (err: any) {
    console.error("[Transcribe API] Unexpected transcription error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to transcribe audio from video." },
      { status: 500 }
    );
  }
}
