import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getOrCreateAffiliate } from "@/app/lib/server/affiliateService";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(req: NextRequest) {
  try {
    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Server missing Supabase config" }, { status: 500 });
    }

    const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await db.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const affiliate = await getOrCreateAffiliate(authData.user.id, authData.user.email || "");

    // Fetch referrals and commissions for this affiliate
    const [referralsRes, commissionsRes] = await Promise.all([
      db.from("affiliate_referrals").select("*").eq("affiliate_id", affiliate.id),
      db.from("affiliate_commissions").select("*").eq("affiliate_id", affiliate.id),
    ]);

    const referrals = referralsRes.data || [];
    const commissions = commissionsRes.data || [];

    const totalCommissionsEarned = commissions.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const pendingCommissions = commissions
      .filter((c) => c.status === "pending")
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

    return NextResponse.json({
      affiliate: {
        id: affiliate.id,
        referralCode: affiliate.referral_code,
        commissionRate: affiliate.commission_rate,
        shareUrl: `/?ref=${affiliate.referral_code}`,
      },
      stats: {
        totalReferrals: referrals.length,
        totalConversions: commissions.length,
        totalEarnings: `$${totalCommissionsEarned.toFixed(2)}`,
        pendingEarnings: `$${pendingCommissions.toFixed(2)}`,
      },
      commissions,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load affiliate data" }, { status: 500 });
  }
}
