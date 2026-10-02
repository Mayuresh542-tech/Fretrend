import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getAuthenticatedUserId } from "@/app/lib/server/adminAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const adminDb = getAdminClient();
    const userId = (await getAuthenticatedUserId(req)) || "guest";

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No video file provided." }, { status: 400 });
    }

    const mimeType = file.type || "video/mp4";
    const validMimes = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/ogg"];

    if (!validMimes.includes(mimeType) && !file.name.match(/\.(mp4|webm|mov|mkv|avi)$/i)) {
      return NextResponse.json(
        { error: "Invalid video format. Please upload MP4, WebM, or MOV files." },
        { status: 400 }
      );
    }

    // Max 100MB
    const MAX_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 100MB limit. Please compress or select a smaller clip." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = file.name.split(".").pop() || "mp4";
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${userId}_${Date.now()}_${cleanName.slice(0, 30)}.${ext}`;

    const { error: uploadError } = await adminDb.storage
      .from("videos")
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error("[Media Upload] Supabase upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload video to cloud storage: " + uploadError.message },
        { status: 500 }
      );
    }

    const { data: publicData } = adminDb.storage.from("videos").getPublicUrl(fileName);
    const videoUrl = publicData?.publicUrl || "";

    return NextResponse.json({
      success: true,
      video: {
        id: fileName,
        title: file.name,
        thumbnail: "",
        videoUrl,
        sizeBytes: file.size,
        duration: 0,
        source: "upload",
      },
    });
  } catch (err: any) {
    console.error("[Media Upload] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error during video upload." },
      { status: 500 }
    );
  }
}
