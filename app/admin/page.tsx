"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { isAdminEmail } from "../lib/admin";
import Sidebar from "../components/Sidebar";
import AnimatedBackground from "../components/AnimatedBackground";
import CountUp from "../components/CountUp";

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  searches: number;
  scripts: number;
}

interface AdminSuggestion {
  id: string;
  name: string | null;
  email: string | null;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
}

interface ActivityItem {
  type: "search" | "script" | "suggestion";
  label: string;
  email: string;
  created_at: string;
}

interface AdminData {
  stats: {
    totalUsers: number;
    totalSearches: number;
    totalScripts: number;
    totalSuggestions: number;
    newUsersThisWeek: number;
    mostPopularNiche: string;
  };
  users: AdminUser[];
  suggestions: AdminSuggestion[];
  recentActivity: ActivityItem[];
  popularNiches: { niche: string; count: number }[];
}

const ACTIVITY_META: Record<ActivityItem["type"], { icon: string; label: string; color: string }> = {
  search: { icon: "🔎", label: "Searched", color: "text-cyan-300" },
  script: { icon: "✨", label: "Generated", color: "text-purple-300" },
  suggestion: { icon: "💡", label: "Suggested", color: "text-amber-300" },
};

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function timeAgo(iso: string): string {
  if (!iso) return "—";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function StatCard({
  icon,
  value,
  text,
  label,
  accent,
}: {
  icon: string;
  value?: number;
  text?: string;
  label: string;
  accent: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 24 },
        show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
      }}
      whileHover={{ y: -6 }}
      className={`group relative rounded-2xl p-px bg-gradient-to-br ${accent} transition-shadow hover:shadow-[0_0_34px_-8px_rgba(124,58,237,0.6)]`}
    >
      <div className="rounded-2xl bg-[#0c0c10]/85 backdrop-blur-xl p-4 sm:p-6 h-full">
        <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">{icon}</div>
        <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-300 to-cyan-300 bg-clip-text text-transparent mb-1 truncate" title={text}>
          {text !== undefined ? text : <CountUp to={value ?? 0} />}
        </div>
        <div className="text-white/50 text-sm">{label}</div>
      </div>
    </motion.div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-2xl p-px bg-gradient-to-br from-purple-500/30 via-white/5 to-cyan-500/25"
    >
      <div className="rounded-2xl bg-[#0c0c10]/85 backdrop-blur-xl p-5 sm:p-6 h-full">
        <h3 className="flex items-center gap-2 text-lg font-bold mb-5">
          <span>{icon}</span> {title}
        </h3>
        {children}
      </div>
    </motion.div>
  );
}

export default function AdminPanel() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [marking, setMarking] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      // Client-side gate (UX only — the API enforces the real check server-side).
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user || !isAdminEmail(user.email)) {
        router.replace("/dashboard");
        return;
      }
      if (cancelled) return;
      setAuthChecked(true);

      const token = session.access_token;
      if (!token) {
        router.replace("/dashboard");
        return;
      }

      try {
        const res = await fetch("/api/admin", { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error ?? "Failed to load admin data.");
        } else {
          setData(json as AdminData);
        }
      } catch {
        if (!cancelled) setError("Network error loading admin data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function markRead(id: string) {
    setMarking(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "markRead", id }),
      });
      if (res.ok) {
        setData((prev) =>
          prev
            ? { ...prev, suggestions: prev.suggestions.map((s) => (s.id === id ? { ...s, read: true } : s)) }
            : prev,
        );
      }
    } finally {
      setMarking(null);
    }
  }

  // While verifying admin status, render nothing but the backdrop (avoids a flash
  // of admin content before a non-admin gets redirected).
  if (!authChecked) {
    return (
      <main className="relative min-h-screen text-white">
        <AnimatedBackground />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <motion.div
            className="w-12 h-12 rounded-full border-2 border-transparent border-t-purple-400 border-r-cyan-400"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </div>
      </main>
    );
  }

  const maxNiche = data?.popularNiches[0]?.count ?? 1;

  return (
    <main className="relative min-h-screen text-white flex">
      <AnimatedBackground />
      <Sidebar active="admin" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="lg:ml-64 flex-1 p-4 pt-20 lg:p-8 relative z-10"
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-3 mb-8"
        >
          <span className="text-2xl">🛡️</span>
          <div>
            <motion.h2
              className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent"
              style={{ backgroundSize: "200% auto" }}
              animate={{ backgroundPosition: ["0% center", "200% center"] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              Admin Panel
            </motion.h2>
            <p className="text-white/50 text-sm mt-1">Platform-wide stats & moderation 🔐</p>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] h-28">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 }}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
            <p className="text-red-400 font-semibold mb-1">Could not load admin data</p>
            <p className="text-white/40 text-sm">{error}</p>
          </div>
        ) : data ? (
          <div className="flex flex-col gap-8">
            {/* Stats cards */}
            <motion.div
              variants={{ show: { transition: { staggerChildren: 0.07 } } }}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6"
            >
              <StatCard icon="👥" value={data.stats.totalUsers} label="Total Users" accent="from-purple-500/30 to-cyan-500/20" />
              <StatCard icon="🔎" value={data.stats.totalSearches} label="Total Searches" accent="from-cyan-500/30 to-purple-500/20" />
              <StatCard icon="✨" value={data.stats.totalScripts} label="Scripts Generated" accent="from-fuchsia-500/30 to-purple-500/20" />
              <StatCard icon="💡" value={data.stats.totalSuggestions} label="Total Suggestions" accent="from-purple-500/30 to-cyan-500/20" />
              <StatCard icon="🆕" value={data.stats.newUsersThisWeek} label="New Users (7d)" accent="from-cyan-500/30 to-purple-500/20" />
              <StatCard icon="🏷️" text={data.stats.mostPopularNiche} label="Most Popular Niche" accent="from-fuchsia-500/30 to-purple-500/20" />
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Popular niches bar chart */}
              <Panel title="Top Niches" icon="📊">
                {data.popularNiches.length === 0 ? (
                  <p className="text-white/40 text-sm py-4 text-center">No searches logged yet.</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {data.popularNiches.map((n, i) => (
                      <div key={n.niche}>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-white/80 capitalize truncate">{n.niche}</span>
                          <span className="text-white/40 shrink-0 ml-2">{n.count}</span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-white/5 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(6, (n.count / maxNiche) * 100)}%` }}
                            transition={{ delay: 0.2 + i * 0.08, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              {/* Recent activity */}
              <div className="lg:col-span-2">
                <Panel title="Recent Activity" icon="🕒">
                  {data.recentActivity.length === 0 ? (
                    <p className="text-white/40 text-sm py-4 text-center">No activity yet.</p>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
                      {data.recentActivity.map((a, i) => {
                        const meta = ACTIVITY_META[a.type];
                        return (
                          <div
                            key={`${a.type}-${a.created_at}-${i}`}
                            className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5"
                          >
                            <span className="text-base shrink-0">{meta.icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white/90 truncate">
                                <span className={`font-medium ${meta.color}`}>{meta.label}</span>{" "}
                                <span className="text-white/70">{a.label}</span>
                              </p>
                              <p className="text-[11px] text-white/35 truncate">{a.email}</p>
                            </div>
                            <span className="text-[11px] text-white/30 shrink-0">{timeAgo(a.created_at)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Panel>
              </div>
            </div>

            {/* Users table */}
            <Panel title={`Users (${data.users.length})`} icon="👥">
              {data.users.length === 0 ? (
                <p className="text-white/40 text-sm py-4 text-center">No users yet.</p>
              ) : (
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-sm min-w-[520px]">
                    <thead>
                      <tr className="text-left text-white/40 text-xs uppercase tracking-wider border-b border-white/10">
                        <th className="py-2.5 px-2 font-medium">Email</th>
                        <th className="py-2.5 px-2 font-medium">Joined</th>
                        <th className="py-2.5 px-2 font-medium text-right">Searches</th>
                        <th className="py-2.5 px-2 font-medium text-right">Scripts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.users.map((u) => (
                        <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                          <td className="py-2.5 px-2 text-white/85 truncate max-w-[220px]" title={u.email}>
                            {u.email}
                          </td>
                          <td className="py-2.5 px-2 text-white/50 whitespace-nowrap">{formatDate(u.created_at)}</td>
                          <td className="py-2.5 px-2 text-right text-cyan-300 font-medium">{u.searches}</td>
                          <td className="py-2.5 px-2 text-right text-purple-300 font-medium">{u.scripts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            {/* Suggestions table */}
            <Panel title={`Suggestions (${data.suggestions.length})`} icon="💡">
              {data.suggestions.length === 0 ? (
                <p className="text-white/40 text-sm py-4 text-center">No suggestions yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {data.suggestions.map((s) => (
                    <div
                      key={s.id}
                      className={`rounded-xl border p-4 transition-colors ${
                        s.read ? "border-white/5 bg-white/[0.02] opacity-60" : "border-purple-500/20 bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs px-2 py-0.5 rounded-full border border-purple-400/20 bg-purple-400/10 text-purple-300">
                            {s.type}
                          </span>
                          {!s.read && (
                            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
                              New
                            </span>
                          )}
                          <span className="text-[11px] text-white/35">{formatDate(s.created_at)}</span>
                        </div>
                        {!s.read && (
                          <motion.button
                            onClick={() => markRead(s.id)}
                            disabled={marking === s.id}
                            whileTap={{ scale: 0.95 }}
                            className="w-full sm:w-auto shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-50 transition-colors"
                          >
                            {marking === s.id ? "Marking…" : "✓ Mark as read"}
                          </motion.button>
                        )}
                      </div>
                      <p className="text-sm text-white/85 leading-relaxed mb-2">{s.message}</p>
                      <p className="text-[11px] text-white/35">
                        {s.name ? `${s.name} · ` : ""}
                        {s.email ?? "anonymous"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        ) : null}
      </motion.div>
    </main>
  );
}
