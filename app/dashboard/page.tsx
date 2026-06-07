"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import AnimatedBackground from "../components/AnimatedBackground";
import CountUp from "../components/CountUp";

interface TrendItem {
  title: string;
  source: string;
  trendScore: number;
  category: string;
  url?: string;
}

const STATS = [
  { icon: "📡", to: 5, suffix: "", label: "Live Sources", accent: "from-purple-500/30 to-cyan-500/20" },
  { icon: "🏷️", to: 8, suffix: "", label: "Categories", accent: "from-cyan-500/30 to-purple-500/20" },
  { icon: "🔥", to: 99, suffix: "", label: "Max Trend Score", accent: "from-fuchsia-500/30 to-purple-500/20" },
  { icon: "⚡", to: 0, suffix: "", label: "Current Plan", accent: "from-purple-500/30 to-cyan-500/20", text: "Free" },
];

const SOURCE_DOT: Record<string, string> = {
  "Google Trends": "bg-blue-400",
  HackerNews: "bg-orange-400",
  Reddit: "bg-red-400",
  YouTube: "bg-rose-400",
  "Google News": "bg-teal-400",
};

function scoreColor(score: number) {
  if (score >= 80) return "from-rose-500 to-orange-400";
  if (score >= 60) return "from-orange-400 to-amber-300";
  return "from-emerald-500 to-teal-400";
}

export default function Dashboard() {
  const router = useRouter();
  const [topTrends, setTopTrends] = useState<TrendItem[]>([]);
  const [trendsLoading, setTrendsLoading] = useState(true);

  useEffect(() => {
    async function getUser() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) router.push("/login");
    }
    getUser();
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    async function loadTopTrends() {
      try {
        const res = await fetch("/api/trends", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ niche: "technology" }),
        });
        const data = await res.json();
        if (!cancelled && res.ok) setTopTrends((data.trends ?? []).slice(0, 5));
      } catch {
        // widget is best-effort; ignore failures
      } finally {
        if (!cancelled) setTrendsLoading(false);
      }
    }
    loadTopTrends();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="relative min-h-screen text-white flex">
      <AnimatedBackground />
      <Sidebar active="dashboard" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="ml-64 flex-1 p-8 relative z-10"
      >
        {/* Animated gradient header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex justify-between items-center mb-8"
        >
          <div>
            <motion.h2
              className="text-3xl font-extrabold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent"
              style={{ backgroundSize: "200% auto" }}
              animate={{ backgroundPosition: ["0% center", "200% center"] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              Dashboard
            </motion.h2>
            <p className="text-white/50 text-sm mt-1">Welcome back — the web is moving fast 👋</p>
          </div>
          <motion.a
            href="/trends"
            whileHover={{ scale: 1.05, boxShadow: "0 0 30px -6px rgba(124,58,237,0.7)" }}
            whileTap={{ scale: 0.96 }}
            className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-600 to-cyan-500"
          >
            🔥 Explore Trends
          </motion.a>
        </motion.div>

        {/* Stats */}
        <motion.div
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          {STATS.map((s) => (
            <motion.div
              key={s.label}
              variants={{
                hidden: { opacity: 0, y: 24 },
                show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
              }}
              whileHover={{ y: -6 }}
              className={`group relative rounded-2xl p-px bg-gradient-to-br ${s.accent} transition-shadow hover:shadow-[0_0_34px_-8px_rgba(124,58,237,0.6)]`}
            >
              <div className="rounded-2xl bg-[#0c0c10]/85 backdrop-blur-xl p-6 h-full">
                <div className="text-3xl mb-3">{s.icon}</div>
                <div className="text-3xl font-bold bg-gradient-to-r from-purple-300 to-cyan-300 bg-clip-text text-transparent mb-1">
                  {s.text ? s.text : <CountUp to={s.to} suffix={s.suffix} />}
                </div>
                <div className="text-white/50 text-sm">{s.label}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Top Trends widget */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-2 relative rounded-2xl p-px bg-gradient-to-br from-purple-500/30 via-white/5 to-cyan-500/25"
          >
            <div className="rounded-2xl bg-[#0c0c10]/85 backdrop-blur-xl p-6 h-full">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔥</span>
                  <h3 className="text-lg font-bold">Today&apos;s Top Trends</h3>
                  <span className="text-[10px] uppercase tracking-wider text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-2 py-0.5">
                    Tech
                  </span>
                </div>
                <a href="/trends" className="text-sm text-purple-300 hover:text-purple-200 transition-colors">
                  View all →
                </a>
              </div>

              {trendsLoading ? (
                <div className="flex flex-col gap-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="relative overflow-hidden h-12 rounded-xl bg-white/5">
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                        animate={{ x: ["-100%", "100%"] }}
                        transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut", delay: i * 0.12 }}
                      />
                    </div>
                  ))}
                </div>
              ) : topTrends.length === 0 ? (
                <p className="text-white/40 text-sm py-6 text-center">
                  Live trend feed unavailable right now — open the Trends page to scan any niche.
                </p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {topTrends.map((t, i) => (
                    <motion.div
                      key={`${t.title}-${i}`}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 + i * 0.08, duration: 0.4 }}
                      whileHover={{ x: 4 }}
                      className="group flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-purple-500/30 transition-colors"
                    >
                      <span className="text-sm font-bold text-white/25 w-5 shrink-0 text-center">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-white/90">
                          {t.url ? (
                            <a href={t.url} target="_blank" rel="noopener noreferrer" className="hover:text-purple-300">
                              {t.title}
                            </a>
                          ) : (
                            t.title
                          )}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${SOURCE_DOT[t.source] ?? "bg-white/40"}`} />
                          <span className="text-[11px] text-white/40">{t.source}</span>
                        </div>
                      </div>
                      <div className="w-24 shrink-0">
                        <div className="flex justify-end text-xs font-bold text-white/50 mb-1">{t.trendScore}</div>
                        <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full bg-gradient-to-r ${scoreColor(t.trendScore)}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${t.trendScore}%` }}
                            transition={{ delay: 0.45 + i * 0.08, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Quick start card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative rounded-2xl p-px bg-gradient-to-br from-cyan-500/30 via-white/5 to-purple-500/25"
          >
            <div className="rounded-2xl bg-[#0c0c10]/85 backdrop-blur-xl p-6 h-full flex flex-col items-center text-center justify-center">
              <motion.div
                className="text-5xl mb-4"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                🔍
              </motion.div>
              <h3 className="text-lg font-bold mb-2">Scan Any Niche</h3>
              <p className="text-white/50 text-sm mb-6">
                Pull trending topics from 5 sources in real time — ranked &amp; scored.
              </p>
              <div className="flex flex-col gap-3 w-full">
                <motion.a
                  href="/trends"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-5 py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-600 to-cyan-500"
                >
                  🚀 Explore Trends
                </motion.a>
                <motion.a
                  href="/settings"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                >
                  ⚙️ Add API Key
                </motion.a>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </main>
  );
}
