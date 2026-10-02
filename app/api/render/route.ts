import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getAuthenticatedUserId } from "@/app/lib/server/adminAuth";
import {
  deductCreditsForVideoRender,
  refundCreditsForVideoRender,
  VIDEO_RENDER_COST,
} from "@/app/lib/server/creditService";
import { renderTimelineWithFFmpeg } from "@/app/lib/server/render/ffmpegRenderer";
import { VeeloxTimelineProject } from "@/app/lib/timeline/types";

export const dynamic = "force-dynamic";

/**
 * Initiates an asynchronous server-side video rendering job.
 * Enforces authentication, credit deduction (25 credits), background worker execution,
 * and automatic credit refund on failure.
 */
export async function POST(req: NextRequest) {
  let userId: string | null = null;
  let transactionId: string | undefined;

  try {
    // 1. Authenticate user
    userId = await getAuthenticatedUserId(req);
    const adminDb = getAdminClient();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to render videos.", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      projectId,
      timeline,
    }: {
      projectId?: string;
      timeline?: VeeloxTimelineProject;
    } = body;

    if (!timeline || !timeline.tracks || !Array.isArray(timeline.tracks)) {
      return NextResponse.json(
        { error: "Invalid timeline data. Tracks array is required.", code: "INVALID_TIMELINE" },
        { status: 400 }
      );
    }

    // 2. Validate project ownership if projectId is provided
    if (projectId) {
      const { data: proj, error: projErr } = await adminDb
        .from("projects")
        .select("id, user_id")
        .eq("id", projectId)
        .maybeSingle();

      if (proj && proj.user_id && proj.user_id !== userId) {
        return NextResponse.json(
          { error: "Forbidden. You do not own this project.", code: "FORBIDDEN" },
          { status: 403 }
        );
      }
    }

    // 3. Server-side credit deduction (25 credits for full video draft/render)
    const deductResult = await deductCreditsForVideoRender(userId, projectId);
    if (!deductResult.success) {
      return NextResponse.json(
        {
          error: deductResult.error || `You need ${VIDEO_RENDER_COST} credits to render this video.`,
          code: "INSUFFICIENT_CREDITS",
          creditsRemaining: deductResult.creditsRemaining,
          requiredCredits: VIDEO_RENDER_COST,
        },
        { status: 402 }
      );
    }

    transactionId = deductResult.transactionId;

    // 4. Create record in render_jobs table
    const { data: job, error: jobErr } = await adminDb
      .from("render_jobs")
      .insert({
        user_id: userId,
        project_id: projectId || null,
        status: "queued",
        progress: 0,
        duration: timeline.duration,
        aspect_ratio: timeline.aspectRatio,
        timeline,
        created_at: new Date().toISOString(),
      })
      .select("id, status, progress, created_at")
      .single();

    if (jobErr || !job) {
      // Refund credits if job creation failed
      await refundCreditsForVideoRender(userId, transactionId, "Failed to initialize render job record");
      return NextResponse.json(
        { error: `Database error creating render job: ${jobErr?.message || "Unknown"}` },
        { status: 500 }
      );
    }

    const jobId = job.id;

    // 5. Fire-and-forget background render worker
    // Do not block the HTTP response!
    (async () => {
      try {
        console.log(`[RenderJob] Starting job ${jobId} for user ${userId}...`);

        await adminDb
          .from("render_jobs")
          .update({ status: "processing", progress: 5 })
          .eq("id", jobId);

        // Progress throttler to prevent spamming database
        let lastReportedProgress = 5;
        const progressHandler = async (progressPercent: number, message: string) => {
          if (progressPercent - lastReportedProgress >= 4 || progressPercent >= 90) {
            lastReportedProgress = progressPercent;
            await adminDb
              .from("render_jobs")
              .update({ progress: progressPercent })
              .eq("id", jobId);
          }
        };

        const renderResult = await renderTimelineWithFFmpeg(timeline, jobId, progressHandler);

        // Render Succeeded
        await adminDb
          .from("render_jobs")
          .update({
            status: "completed",
            progress: 100,
            output_url: renderResult.outputUrl,
            completed_at: new Date().toISOString(),
          })
          .eq("id", jobId);

        // If project ID exists, also sync output to public.projects
        if (projectId) {
          await adminDb
            .from("projects")
            .update({
              export_url: renderResult.outputUrl,
              status: "exported",
              updated_at: new Date().toISOString(),
            })
            .eq("id", projectId);
        }

        console.log(`[RenderJob] Job ${jobId} completed successfully!`);
      } catch (renderErr: any) {
        console.error(`[RenderJob] Job ${jobId} failed:`, renderErr);

        // Update job record with failure status
        await adminDb
          .from("render_jobs")
          .update({
            status: "failed",
            error: renderErr?.message || "FFmpeg video rendering failed.",
          })
          .eq("id", jobId);

        // Automatic Server-Side Credit Refund
        try {
          await refundCreditsForVideoRender(
            userId!,
            transactionId,
            renderErr?.message || "Render failed during video compilation"
          );
          console.log(`[RenderJob] Refunded ${VIDEO_RENDER_COST} credits to user ${userId}`);
        } catch (refundErr) {
          console.error(`[RenderJob] Failed to refund credits for job ${jobId}:`, refundErr);
        }
      }
    })();

    // 6. Return response immediately with job info
    return NextResponse.json({
      success: true,
      jobId,
      status: "queued",
      creditsRemaining: deductResult.creditsRemaining,
      message: "Render job queued. Track progress using /api/render/[id].",
    });
  } catch (err: any) {
    console.error("[Render API] Unexpected error:", err);
    if (userId && transactionId) {
      await refundCreditsForVideoRender(userId, transactionId, err?.message || "Unexpected exception");
    }
    return NextResponse.json(
      { error: err?.message || "Failed to process render request." },
      { status: 500 }
    );
  }
}
