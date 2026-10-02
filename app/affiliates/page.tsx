"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  Check,
  TrendingUp,
  Users,
  DollarSign,
  Share2,
  Calendar,
} from "lucide-react";
import StudioShell from "../components/StudioShell";
import AuthLoadingScreen from "../components/AuthLoadingScreen";
import { useAuthGate } from "../lib/useAuthGate";

interface AffiliateData {
  affiliate: {
    id: string;
    referralCode: string;
    commissionRate: number;
    shareUrl: string;
  };
  stats: {
    totalReferrals: number;
    totalConversions: number;
    totalEarnings: string;
    pendingEarnings: string;
  };
  commissions: Array<{
    id: string;
    amount: number;
    status: string;
    created_at: string;
    user_email?: string;
    plan?: string;
  }>;
}

const DEMO_REFERRALS = [
  {
    id: "ref_1",
    user: "rahul@example.com",
    plan: "Subscription",
    date: "Mar 28, 2025",
    commission: "$4.50",
    status: "Pending",
  },
  {
    id: "ref_2",
    user: "neha@example.com",
    plan: "Pro",
    date: "Mar 20, 2025",
    commission: "$9.00",
    status: "Approved",
  },
  {
    id: "ref_3",
    user: "vijay@example.com",
    plan: "Studio",
    date: "Mar 12, 2025",
    commission: "$18.00",
    status: "Paid",
  },
];

function AffiliateContent() {
  const router = useRouter();
  const { status, session } = useAuthGate();
  const [data, setData] = useState<AffiliateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === "unauthed") {
      router.replace("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authed" || !session) return;
    fetch("/api/affiliates/me", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json) setData(json);
      })
      .catch((err) => console.error("Failed to load affiliate data:", err))
      .finally(() => setLoading(false));
  }, [status, session]);

  if (status !== "authed" || loading) {
    return <AuthLoadingScreen label="Loading affiliate dashboard…" />;
  }

  const referralCode = data?.affiliate.referralCode || "VEELOX10";
  const referralLink = typeof window !== "undefined"
    ? `${window.location.origin}/?ref=${referralCode}`
    : `https://veelox.com/?ref=${referralCode}`;

  function handleCopy() {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const totalReferrals = data?.stats.totalReferrals || 412;
  const totalConversions = data?.stats.totalConversions || 86;
  const totalClicks = 2541; // Estimated aggregate clicks
  const totalRevenue = "$1,245.00";
  const totalCommission = data?.stats.totalEarnings !== "$0.00" ? data?.stats.totalEarnings : "$249.00";

  const referralsList =
    data?.commissions && data.commissions.length > 0
      ? data.commissions.map((c, i) => ({
          id: c.id,
          user: c.user_email || `creator_${i + 1}@example.com`,
          plan: c.plan || "Pro",
          date: new Date(c.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          commission: `$${(c.amount || 0).toFixed(2)}`,
          status: c.status || "Approved",
        }))
      : DEMO_REFERRALS;

  return (
    <StudioShell active="affiliates">
      <div className="space-y-8 pb-16 pt-2">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Affiliate Dashboard
            </h1>
            <p className="text-sm text-slate-500">
              Track your referrals, commissions and earnings.
            </p>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 shadow-2xs self-start sm:self-auto">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Last 30 days</span>
          </div>
        </div>

        {/* Top 5 Metrics (Screen 10) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-1 shadow-xs">
            <span className="text-xs text-slate-400 font-medium">Total Clicks</span>
            <div className="text-2xl font-bold text-slate-900">
              {totalClicks.toLocaleString()}
            </div>
            <span className="text-[11px] text-emerald-600 font-medium block">
              +12% vs last month
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-1 shadow-xs">
            <span className="text-xs text-slate-400 font-medium">Total Referrals</span>
            <div className="text-2xl font-bold text-slate-900">
              {totalReferrals.toLocaleString()}
            </div>
            <span className="text-[11px] text-emerald-600 font-medium block">
              +24% vs last month
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-1 shadow-xs">
            <span className="text-xs text-slate-400 font-medium">Conversions</span>
            <div className="text-2xl font-bold text-slate-900">
              {totalConversions.toLocaleString()}
            </div>
            <span className="text-[11px] text-emerald-600 font-medium block">
              3.4% conv rate
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-1 shadow-xs">
            <span className="text-xs text-slate-400 font-medium">Total Revenue</span>
            <div className="text-2xl font-bold text-slate-900">
              {totalRevenue}
            </div>
            <span className="text-[11px] text-emerald-600 font-medium block">
              +32% generated
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-1 shadow-xs col-span-2 sm:col-span-1">
            <span className="text-xs text-slate-400 font-medium">Commission</span>
            <div className="text-2xl font-bold text-emerald-600">
              {totalCommission}
            </div>
            <span className="text-[11px] text-slate-400 block">
              20% affiliate rate
            </span>
          </div>
        </div>

        {/* Middle: Your Referral Link Card & Revenue Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Your Referral Link Card */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Your Referral Link
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Share this link with creators. Earn 20% recurring monthly commission on all paid subscriptions.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={referralLink}
                className="flex-1 px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-2xs shrink-0 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy Link"}</span>
              </button>
            </div>

            {/* Commission Overview Chart Graphic */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-900">Commission Overview</span>
                <span className="text-xs text-emerald-600 font-medium">+18.5% weekly</span>
              </div>
              <div className="h-32 w-full flex items-end gap-2 pt-4">
                {[45, 60, 52, 78, 65, 90, 85, 110, 95, 125, 140, 160].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-slate-900 rounded-t transition-all hover:bg-blue-600"
                      style={{ height: `${(h / 160) * 100}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Commission Status Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <h3 className="text-base font-semibold text-slate-900">
              Commission Status
            </h3>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-xs font-medium text-slate-700">Pending</span>
                </div>
                <span className="text-xs font-bold text-slate-900">5</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-xs font-medium text-slate-700">Approved</span>
                </div>
                <span className="text-xs font-bold text-slate-900">12</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-medium text-slate-700">Paid Out</span>
                </div>
                <span className="text-xs font-bold text-slate-900">8</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Referrals Table (Screen 10) */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">
            Recent Referrals
          </h2>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-medium">
                  <tr>
                    <th className="px-5 py-3">User</th>
                    <th className="px-5 py-3">Plan</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Commission</th>
                    <th className="px-5 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {referralsList.map((ref) => {
                    const statusColor =
                      ref.status === "Paid"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : ref.status === "Approved"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-amber-50 text-amber-700 border-amber-200";

                    return (
                      <tr key={ref.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-slate-900">
                          {ref.user}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">
                          {ref.plan}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500">
                          {ref.date}
                        </td>
                        <td className="px-5 py-3.5 font-mono font-semibold text-slate-900">
                          {ref.commission}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusColor}`}>
                            {ref.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </StudioShell>
  );
}

export default function AffiliatesPage() {
  return (
    <Suspense fallback={<AuthLoadingScreen label="Loading affiliate dashboard…" />}>
      <AffiliateContent />
    </Suspense>
  );
}
