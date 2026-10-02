"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthGate } from "@/app/lib/useAuthGate";
import { getPlan, PlanConfig, getAllPlans } from "@/app/config/plans";
import StudioShell from "@/app/components/StudioShell";

export default function CheckoutPlanPage() {
  const router = useRouter();
  const params = useParams();
  const planParam = typeof params?.plan === "string" ? params.plan : "creator";
  const { status, session } = useAuthGate();

  const planConfig = getPlan(planParam);
  const selectedPlan: PlanConfig = planConfig && planConfig.id !== "free" ? planConfig : getPlan("creator")!;
  const [email, setEmail] = useState<string>("");
  const [referralCode, setReferralCode] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [checkoutResult, setCheckoutResult] = useState<any | null>(null);

  // Auto-fill logged in user email
  useEffect(() => {
    if (session?.user?.email && !email) {
      setEmail(session.user.email);
    }
  }, [session, email]);

  // Read ref from URL params or localStorage if available
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get("ref") || localStorage.getItem("veelox_ref");
      if (ref) setReferralCode(ref);
    }
  }, []);

  if (!selectedPlan) {
    return (
      <StudioShell active="upgrade">
        <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
          <p className="text-slate-400">Plan not found.</p>
          <Link href="/pricing" className="text-sky-400 underline text-sm">
            View All Plans
          </Link>
        </div>
      </StudioShell>
    );
  }

  async function handleContinueToPayment(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setCheckoutResult(null);

    if (!email || !email.includes("@")) {
      setErrorMessage("Please enter a valid billing email address.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/checkout/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan?.id,
          email,
          referralCode: referralCode.trim() || undefined,
          userId: session?.user?.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to initialize checkout.");
      }

      setCheckoutResult(data);
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred during checkout initialization.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <StudioShell active="upgrade">
      <div className="max-w-5xl mx-auto w-full py-8 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <Link href="/pricing" className="hover:text-white transition">
            Pricing
          </Link>
          <span>/</span>
          <span className="text-sky-400 uppercase font-semibold">
            {selectedPlan.name} Plan Checkout
          </span>
        </div>

        {/* Page Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider bg-sky-500/10 border border-sky-500/30 text-sky-400">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            <span>Direct Website Checkout</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Order Summary &amp; Checkout
          </h1>
          <p className="text-xs text-slate-400">
            Review your plan details, configure billing identity, and proceed.
          </p>
        </div>

        {/* Main Checkout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form & Payment Gateway Placeholder (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <form
              onSubmit={handleContinueToPayment}
              className="p-6 sm:p-7 rounded-3xl bg-[#0D0F15] border border-[#202534] space-y-6 shadow-xl"
            >
              <div className="border-b border-[#202534] pb-4">
                <h2 className="text-base font-bold text-white font-heading">
                  1. Billing Identity
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Your receipts, credits, and AI account privileges are linked to this email.
                </p>
              </div>

              {/* Email Input */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-slate-300 block">
                  Customer Email <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="creator@example.com"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-[#12151E] border border-[#202534] text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-sky-500 transition font-sans"
                />
                {session?.user?.email && (
                  <p className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                    <span>✓</span> Auto-filled from your authenticated Veelox account.
                  </p>
                )}
              </div>

              {/* Optional Referral Code */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-slate-300 block">
                  Affiliate / Referral Code (Optional)
                </label>
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  placeholder="e.g. VIRAL20"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#12151E] border border-[#202534] text-white text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-sky-500 transition uppercase"
                />
              </div>

              {/* Error Notice */}
              {errorMessage && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2.5">
                  <span className="font-bold shrink-0">⚠️</span>
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Payment Provider Placeholder Status */}
              {checkoutResult && (
                <div className="p-5 rounded-2xl bg-[#12151E] border border-sky-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white font-mono flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      Payment Gateway Integration Placeholder
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      SANDBOX / PENDING GATEWAY
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {checkoutResult.message}
                  </p>

                  <div className="pt-2 border-t border-[#202534] flex flex-col sm:flex-row items-center gap-3">
                    {selectedPlan.whopCheckoutUrl && (
                      <a
                        href={selectedPlan.whopCheckoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs uppercase tracking-wider transition text-center shadow-lg shadow-emerald-500/20"
                      >
                        Activate via Whop Store Now →
                      </a>
                    )}
                    <Link
                      href="/pricing"
                      className="text-xs text-slate-400 hover:text-white transition"
                    >
                      Compare other tiers
                    </Link>
                  </div>
                </div>
              )}

              {/* Continue to Payment CTA */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-white hover:bg-slate-100 text-zinc-950 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-[0_0_24px_rgba(255,255,255,0.25)] hover:shadow-[0_0_32px_rgba(255,255,255,0.4)] active:scale-[0.99]"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
                    <span>Preparing Secure Order…</span>
                  </span>
                ) : (
                  <span>Continue to Payment</span>
                )}
              </button>

              <div className="text-center">
                <p className="text-[11px] text-slate-400">
                  Direct payment processing will not fake a charge or activate subscriptions without genuine verification.
                </p>
              </div>
            </form>

            {/* Alternative: Whop Store Option */}
            <div className="p-6 rounded-3xl bg-[#0D0F15] border border-[#202534] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                  Prefer Subscribing with Whop?
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  LIVE NOW
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Whop is our official community &amp; subscription channel. When you purchase on Whop, your Veelox account is instantly linked via verified webhook and your AI credits are provisioned immediately.
              </p>
              <div className="pt-2">
                <a
                  href={selectedPlan.whopCheckoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#12151E] hover:bg-[#181D2A] text-slate-200 text-xs font-medium border border-[#202534] hover:border-slate-700 transition"
                >
                  <span>Open Whop Checkout ({selectedPlan.displayPrice}/mo)</span>
                  <span className="text-sky-400 font-bold">↗</span>
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & Feature Breakdown (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 sm:p-7 rounded-3xl bg-[#0D0F15] border border-[#202534] space-y-6 shadow-xl sticky top-8">
              <div className="border-b border-[#202534] pb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-white font-heading">
                  Order Summary
                </h2>
                <span className="text-[11px] font-mono text-sky-400 px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 uppercase">
                  {selectedPlan.name} Tier
                </span>
              </div>

              {/* Price Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Plan Selected</span>
                  <span className="text-white font-medium">{selectedPlan.name} Plan</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Billing Period</span>
                  <span className="text-white font-medium capitalize">{selectedPlan.billingPeriod}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Monthly AI Credits</span>
                  <span className="text-sky-400 font-mono font-bold">
                    {selectedPlan.monthlyCredits.toLocaleString()} Credits
                  </span>
                </div>

                <div className="pt-3 border-t border-[#202534] flex items-baseline justify-between">
                  <span className="text-sm font-bold text-white">Due Today</span>
                  <div className="text-right">
                    <span className="text-2xl font-extrabold text-white font-mono">
                      {selectedPlan.displayPrice}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 block">
                      /{selectedPlan.billingPeriod}
                    </span>
                  </div>
                </div>
              </div>

              {/* Features List */}
              <div className="pt-4 border-t border-[#202534] space-y-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                  Included in this plan:
                </span>
                <ul className="space-y-2.5">
                  {selectedPlan.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                      <span className="text-emerald-400 font-bold text-sm leading-none shrink-0 mt-0.5">✓</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Security & Guarantee Note */}
              <div className="pt-4 border-t border-[#202534] space-y-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-2 text-slate-300 font-semibold">
                  <span className="text-emerald-400 text-xs">🔒</span>
                  <span>Direct Subscription Terms</span>
                </div>
                <p>
                  No lock-in contracts. Cancel or modify anytime via your billing dashboard. Unused credits roll over during active subscriptions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StudioShell>
  );
}
