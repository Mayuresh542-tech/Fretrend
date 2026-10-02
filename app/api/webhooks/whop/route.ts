import { NextRequest, NextResponse } from "next/server";
import { verifyWhopSignature, processWhopWebhook } from "@/app/lib/server/whopService";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature =
      req.headers.get("webhook-signature") ||
      req.headers.get("whop-signature") ||
      req.headers.get("x-whop-signature");

    // 1. Verify signature
    const isValid = verifyWhopSignature(rawBody, signature);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    // Determine event ID for idempotency
    const eventId =
      payload.event_id ||
      payload.id ||
      req.headers.get("webhook-id") ||
      `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // 2. Process event idempotently
    const result = await processWhopWebhook(payload, eventId);

    return NextResponse.json({
      received: true,
      processed: !result.duplicate,
      message: result.message,
    });
  } catch (err: any) {
    console.error("[Whop Webhook Error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process webhook" },
      { status: 500 },
    );
  }
}
