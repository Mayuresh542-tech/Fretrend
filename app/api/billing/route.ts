import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getPlan, PLANS } from "@/app/config/plans";
import { calculateContentKitAllowance } from "@/app/config/credits";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(req: NextRequest) {
  try {
    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Server missing Supabase configuration" },
        { status: 500 }
      );
    }

    const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await db.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json({ error: "Invalid session token" }, { status: 401 });
    }

    const userId = authData.user.id;
    const userEmail = authData.user.email ?? "";

    // 1. Fetch user's subscription record
    const { data: sub, error: subError } = await db
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 2. Fetch user's credit transactions
    const { data: txs } = await db
      .from("credit_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    // Compute credit sum if needed
    const totalTransactionsCredits = (txs || []).reduce((acc: number, t: any) => acc + (t.amount || 0), 0);

    // Determine active subscription info
    let planId = (sub?.plan || "free").toLowerCase();
    let status = sub?.status || "active";
    let source = sub?.source || "direct"; // "direct" | "whop"
    const sourceDisplay = source === "whop" ? "Whop Subscription" : "Direct / Main Site";
    const planConfig = getPlan(planId) || PLANS.free;
    let credits = sub?.credits ?? planConfig.monthlyCredits;

    return NextResponse.json({
      subscription: {
        id: sub?.id || null,
        plan: planId,
        planName: planConfig.name,
        price: planConfig.price,
        displayPrice: planConfig.displayPrice,
        billingPeriod: planConfig.billingPeriod,
        source,
        sourceDisplay,
        status,
        credits,
        contentKitAllowance: calculateContentKitAllowance(credits),
        renewalDate: sub?.current_period_end || null,
        startDate: sub?.current_period_start || sub?.created_at || null,
        externalCustomerId: sub?.external_customer_id || null,
      },
      user: {
        id: userId,
        email: userEmail,
      },
      recentTransactions: txs || [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load billing information" },
      { status: 500 }
    );
  }
}
