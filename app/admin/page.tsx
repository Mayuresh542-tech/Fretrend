"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  CreditCard,
  Zap,
  TrendingUp,
  Globe,
  ShoppingBag,
  ExternalLink,
} from "lucide-react";
import { useAuthGate } from "@/app/lib/useAuthGate";
import { isAdminEmail } from "@/app/lib/admin";
import StudioShell from "@/app/components/StudioShell";
import AuthLoadingScreen from "@/app/components/AuthLoadingScreen";

interface SegmentStats {
  total: number;
  active: number;
  paid: number;
  free: number;
  creator: number;
  studio: number;
  recentSignups: number;
  activeSubscriptions: number;
  revenue: number;
  recentUsers: Array<{
    id: string;
    email: string;
    createdAt: string;
    plan: string;
    status: string;
    credits: number;
  }>;
}

interface DashboardResponse {
  topLevel: {
    totalUsers: number;
    totalPayingUsers: number;
    activeSubscriptions: number;
    totalRevenue: number;
    directRevenue: number;
    whopRevenue: number;
    creditsConsumed: number;
    aiGenerations: number;
    newUsers: number;
    conversionRate: string;
  };
  columns: {
    mainSite: SegmentStats;
    whop: SegmentStats;
  };
}

function AdminContent() {
  const router = useRouter();
  const { status, session } = useAuthGate();
  const isAdmin = status === "authed" && isAdminEmail(session?.user?.email);

  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthed" || (status === "authed" && !isAdmin)) {
      router.replace("/dashboard");
    }
  }, [status, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin || !session) return;
    fetch("/api/admin/dashboard", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load admin stats");
        return res.json();
      })
      .then((json) => setData(json))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isAdmin, session]);

  if (!isAdmin) {
    return <AuthLoadingScreen label="Verifying admin credentials…" />;
  }

  const top = data?.topLevel;

  return (
    <StudioShell active="admin">
      <div className="space-y-8 pb-16 pt-2">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Admin Dashboard
            </h1>
            <p className="text-sm text-slate-500">
              System performance, user metrics and revenue overview.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link
              href="/admin/providers"
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors shadow-2xs"
            >
              API Providers
            </Link>
            <Link
              href="/admin/users"
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors shadow-2xs"
            >
              Manage Users
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
            <span>Notice: {error}</span>
          </div>
        )}

        {/* 6 Top Level Metrics (Screen 9) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-1 shadow-xs">
            <span className="text-xs text-slate-400 font-medium">Total Users</span>
            <div className="text-2xl font-bold text-slate-900">
              {loading ? "…" : top?.totalUsers.toLocaleString() ?? "0"}
            </div>
            <span className="text-[11px] text-slate-400 block">
              +{top?.newUsers ?? 0} this week
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-1 shadow-xs">
            <span className="text-xs text-slate-400 font-medium">Paid Users</span>
            <div className="text-2xl font-bold text-slate-900">
              {loading ? "…" : top?.totalPayingUsers.toLocaleString() ?? "0"}
            </div>
            <span className="text-[11px] text-emerald-600 block">
              {top?.conversionRate ?? "0%"} conv
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-1 shadow-xs">
            <span className="text-xs text-slate-400 font-medium">Active Subs</span>
            <div className="text-2xl font-bold text-slate-900">
              {loading ? "…" : top?.activeSubscriptions.toLocaleString() ?? "0"}
            </div>
            <span className="text-[11px] text-slate-400 block">Paid active</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-1 shadow-xs">
            <span className="text-xs text-slate-400 font-medium">Revenue</span>
            <div className="text-2xl font-bold text-slate-900">
              ${loading ? "…" : top?.totalRevenue.toLocaleString() ?? "0"}
            </div>
            <span className="text-[11px] text-slate-400 block">MRR run rate</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-1 shadow-xs">
            <span className="text-xs text-slate-400 font-medium">Credits Used</span>
            <div className="text-2xl font-bold text-slate-900">
              {loading ? "…" : top?.creditsConsumed.toLocaleString() ?? "0"}
            </div>
            <span className="text-[11px] text-slate-400 block">Total burned</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-1 shadow-xs">
            <span className="text-xs text-slate-400 font-medium">AI Generations</span>
            <div className="text-2xl font-bold text-slate-900">
              {loading ? "…" : top?.aiGenerations.toLocaleString() ?? "0"}
            </div>
            <span className="text-[11px] text-slate-400 block">Pipelines run</span>
          </div>
        </div>

        {/* Customer Acquisition Segmentation: Main Site Users vs Whop Users */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. Main Site Users */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Main Site Users</h3>
                  <span className="text-xs text-slate-400">Direct organic &amp; referral registrations</span>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                Direct
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="text-xs text-slate-400 block">Users</span>
                <span className="text-xl font-bold text-slate-900">
                  {loading ? "…" : data?.columns.mainSite.total ?? 0}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Paid Subs</span>
                <span className="text-xl font-bold text-slate-900">
                  {loading ? "…" : data?.columns.mainSite.paid ?? 0}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Revenue</span>
                <span className="text-xl font-bold text-slate-900">
                  ${loading ? "…" : data?.columns.mainSite.revenue ?? 0}
                </span>
              </div>
            </div>

            {/* Recent Signups Table */}
            <div className="pt-2">
              <span className="text-xs font-semibold text-slate-700 block mb-2">
                Recent Signups
              </span>
              <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 font-medium">
                    <tr>
                      <th className="px-3 py-2">User</th>
                      <th className="px-3 py-2">Plan</th>
                      <th className="px-3 py-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data?.columns.mainSite.recentUsers && data.columns.mainSite.recentUsers.length > 0 ? (
                      data.columns.mainSite.recentUsers.slice(0, 4).map((u) => (
                        <tr key={u.id}>
                          <td className="px-3 py-2 text-slate-900 truncate max-w-[140px]">
                            {u.email}
                          </td>
                          <td className="px-3 py-2 capitalize text-slate-600">{u.plan}</td>
                          <td className="px-3 py-2 text-right">
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700">
                              {u.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-3 py-4 text-center text-slate-400">
                          {loading ? "Loading users…" : "No direct signups yet"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 2. Whop Store Users */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Whop Users</h3>
                  <span className="text-xs text-slate-400">Whop Marketplace marketplace customers</span>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                Whop Store
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="text-xs text-slate-400 block">Users</span>
                <span className="text-xl font-bold text-slate-900">
                  {loading ? "…" : data?.columns.whop.total ?? 0}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Paid Subs</span>
                <span className="text-xl font-bold text-slate-900">
                  {loading ? "…" : data?.columns.whop.paid ?? 0}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Revenue</span>
                <span className="text-xl font-bold text-slate-900">
                  ${loading ? "…" : data?.columns.whop.revenue ?? 0}
                </span>
              </div>
            </div>

            {/* Recent Whop Customers Table */}
            <div className="pt-2">
              <span className="text-xs font-semibold text-slate-700 block mb-2">
                Recent Whop Members
              </span>
              <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 font-medium">
                    <tr>
                      <th className="px-3 py-2">User</th>
                      <th className="px-3 py-2">Plan</th>
                      <th className="px-3 py-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data?.columns.whop.recentUsers && data.columns.whop.recentUsers.length > 0 ? (
                      data.columns.whop.recentUsers.slice(0, 4).map((u) => (
                        <tr key={u.id}>
                          <td className="px-3 py-2 text-slate-900 truncate max-w-[140px]">
                            {u.email}
                          </td>
                          <td className="px-3 py-2 capitalize text-slate-600">{u.plan}</td>
                          <td className="px-3 py-2 text-right">
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700">
                              {u.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-3 py-4 text-center text-slate-400">
                          {loading ? "Loading users…" : "Data not available yet"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StudioShell>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<AuthLoadingScreen label="Loading admin dashboard…" />}>
      <AdminContent />
    </Suspense>
  );
}
