import { NextRequest, NextResponse } from "next/server";
import { recordAffiliateReferral } from "@/app/lib/server/affiliateService";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, referralCode, source } = body;

    if (!userId || !referralCode) {
      return NextResponse.json({ ok: false, error: "Missing userId or referralCode" }, { status: 400 });
    }

    const recorded = await recordAffiliateReferral(referralCode, userId, source || "direct");
    return NextResponse.json({ ok: recorded });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
