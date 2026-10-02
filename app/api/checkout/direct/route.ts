import { NextRequest, NextResponse } from "next/server";
import { createDirectCheckout } from "@/app/lib/server/checkoutService";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { planId, email, referralCode, userId } = body;

    if (!planId) {
      return NextResponse.json({ error: "Plan ID is required" }, { status: 400 });
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email address is required" }, { status: 400 });
    }

    const result = await createDirectCheckout({
      planId,
      email,
      referralCode,
      userId,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to initialize checkout" },
      { status: 400 },
    );
  }
}
