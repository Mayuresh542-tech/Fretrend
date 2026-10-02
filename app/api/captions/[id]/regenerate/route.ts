import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getAuthenticatedUserId } from "@/app/lib/server/adminAuth";
import { groupWordsIntoSegments, CaptionPresetId, CAPTION_PRESETS } from "@/app/lib/captions/presets";

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

    const { data: captionRecord, error: fetchErr } = await adminDb
      .from("caption_generations")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (fetchErr || !captionRecord) {
      return NextResponse.json({ error: "Caption generation not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { preset: newPreset, wordsPerSegment = 4 }: { preset?: CaptionPresetId; wordsPerSegment?: number } = body;

    const preset = newPreset && CAPTION_PRESETS[newPreset] ? newPreset : captionRecord.preset;
    const words = Array.isArray(captionRecord.words) ? captionRecord.words : [];
    const segments = groupWordsIntoSegments(words, wordsPerSegment);

    const { data: updatedRecord, error: updateErr } = await adminDb
      .from("caption_generations")
      .update({
        preset,
        segments,
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
      captionGeneration: updatedRecord,
      segments,
      preset,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
