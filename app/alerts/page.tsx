"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { useAuthGate } from "../lib/useAuthGate";
import Sidebar from "../components/Sidebar";
import AnimatedBackground from "../components/AnimatedBackground";
import AuthLoadingScreen from "../components/AuthLoadingScreen";
import ContentKitPanel, { DURATIONS, type ContentKit } from "../components/ContentKitPanel";
import {
  type AlertTrend,
  readNicheCache,
  writeNicheCache,
  clearNicheCache,
  fetchNicheTrends,
  freshness,
  writeAlertsSummary,
} from "../lib/alerts";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];
const TOP_N = 5; // trends shown per niche card

interface NicheState {
  trends: AlertTrend[];
  savedAt: number;
  loading: boolean;
  error?: string;
}

const SOURCE_DOT: Record<string, string> = {
  "Google Trends": "bg-blue-400",
  HackerNews: "bg-orange-400",
  Reddit: "bg-red-400",
  YouTube: "bg-rose-400",
  "Google News": "bg-teal-400",
};

function scoreText(score: number): string {
  if (score >= 80) return "text-rose-400";
  if (score >= 60) return "text-orange-400";
  return "text-emerald-400";
}

export default function Alerts() {
  const router = useRouter();
  const { status, session } = useAuthGate();

  // null = not loaded yet; [] = loaded, none saved.
  const [niches, setNiches] = useState<string[] | null>(null);
  const [alerts, setAlerts] = useState<Record<string, NicheState>>({});
  const [newNiche, setNewNiche] = useState("");
  const [adding, setAdding] = useState(false);

  // --- AI Content Kit panel state (mirrors the trends page) ---
  const [kitOpen, setKitOpen] = useState(false);
  const [kitStarted, setKitStarted] = useState(false);
  const [kitDuration, setKitDuration] = useState(60);
  const [kitTrend, setKitTrend] = useState<AlertTrend | null>(null);
  const [kitNiche, setKitNiche] = useState("");
  const [kitLoading, setKitLoading] = useState(false);
  const [kitData, setKitData] = useState<ContentKit | null>(null);
  const [kitError, setKitError] = useState<string | null>(null);
  const [needKey, setNeedKey] = useState(false);
  const [savingKit, setSavingKit] = useState(false);
  const [savedKit, setSavedKit] = useState(false);

  // Protected page: redirect logged-out visitors once the gate resolves.
  useEffect(() => {
    if (status === "unauthed") router.replace("/login");
  }, [status, router]);

  // Fetch (or read from cache) the live trends for one niche.
  const loadNiche = useCallback(async (niche: string, force = false) => {
    const cached = force ? null : readNicheCache(niche);
    if (cached) {
      setAlerts((prev) => ({
        ...prev,
        [niche]: { trends: cached.trends, savedAt: cached.savedAt, loading: false },
      }));
      return;
    }
    setAlerts((prev) => ({
      ...prev,
      [niche]: { trends: prev[niche]?.trends ?? [], savedAt: prev[niche]?.savedAt ?? 0, loading: true },
    }));
    try {
      const trends = await fetchNicheTrends(niche);
      const savedAt = Date.now();
      writeNicheCache({ niche, trends, savedAt });
      setAlerts((prev) => ({ ...prev, [niche]: { trends, savedAt, loading: false } }));
    } catch {
      setAlerts((prev) => ({
        ...prev,
        [niche]: {
          trends: prev[niche]?.trends ?? [],
          savedAt: prev[niche]?.savedAt ?? 0,
          loading: false,
          error: "Couldn't load trends — try refreshing.",
        },
      }));
    }
  }, []);

  // Load the saved niche list once authed, then kick off a fetch for each.
  // Run-once ref guard with NO cancel-on-cleanup (see the saved/admin pitfall).
  const loadedRef = useRef(false);
  useEffect(() => {
    if (status !== "authed" || !session || loadedRef.current) return;
    loadedRef.current = true;
    (async () => {
      const { data } = await supabase
        .from("saved_niches")
        .select("niche")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: true });
      const list = (data ?? []).map((r: { niche: string }) => r.niche);
      setNiches(list);
      list.forEach((n) => void loadNiche(n));
    })();
  }, [status, session, loadNiche]);

  // Keep the sidebar/dashboard bell in sync with the total trends shown.
  useEffect(() => {
    if (niches === null) return;
    const total = niches.reduce((sum, n) => sum + (alerts[n]?.trends.length ?? 0), 0);
    writeAlertsSummary({ total, niches: niches.length, savedAt: Date.now() });
  }, [alerts, niches]);

  async function addNiche() {
    const n = newNiche.trim();
    if (!n || !session) return;
    if ((niches ?? []).some((x) => x.toLowerCase() === n.toLowerCase())) {
      setNewNiche("");
      return;
    }
    setAdding(true);
    try {
      const { error } = await supabase
        .from("saved_niches")
        .insert({ user_id: session.user.id, niche: n });
      // 23505 = unique violation (already saved) — treat as success.
      if (error && error.code !== "23505") return;
      setNiches((prev) => [...(prev ?? []), n]);
      setNewNiche("");
      void loadNiche(n);
    } finally {
      setAdding(false);
    }
  }

  async function removeNiche(niche: string) {
    if (!session) return;
    setNiches((prev) => (prev ?? []).filter((n) => n !== niche));
    setAlerts((prev) => {
      const next = { ...prev };
      delete next[niche];
      return next;
    });
    clearNicheCache(niche);
    await supabase
      .from("saved_niches")
      .delete()
      .eq("user_id", session.user.id)
      .eq("niche", niche);
  }

  function refreshAll() {
    (niches ?? []).forEach((n) => void loadNiche(n, true));
  }

  // --- Content kit (open from a clicked trend) ---
  function openKit(trend: AlertTrend, niche: string) {
    setKitTrend(trend);
    setKitNiche(niche);
    setKitOpen(true);
    setKitStarted(false);
    setKitData(null);
    setKitError(null);
    setNeedKey(false);
    setSavedKit(false);
    setKitLoading(false);
  }

  async function runKit() {
    if (!kitTrend) return;
    setKitStarted(true);
    setKitData(null);
    setKitError(null);
    setNeedKey(false);
    setSavedKit(false);
    setKitLoading(true);

    const dur = DURATIONS.find((d) => d.seconds === kitDuration) ?? DURATIONS[1];
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s) {
        setNeedKey(true);
        return;
      }
      const res = await fetch("/api/content-kit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.access_token}` },
        body: JSON.stringify({
          topic: kitTrend.title,
          niche: kitNiche || "general",
          score: kitTrend.trendScore,
          durationLabel: dur.label,
          wordCount: dur.words,
          format: dur.format,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "missing_key") {
          setNeedKey(true);
          return;
        }
        if (data.error === "invalid_key") {
          throw new Error("Your Groq API key was rejected. Update it in Settings.");
        }
        throw new Error(data.error ?? "Failed to generate content kit.");
      }
      setKitData(data.kit);
    } catch (err) {
      setKitError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setKitLoading(false);
    }
  }

  async function saveReport() {
    if (!kitData || !kitTrend) return;
    setSavingKit(true);
    setKitError(null);
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const user = s?.user;
      if (!user) {
        setKitError("Log in to save reports.");
        return;
      }
      const { error } = await supabase.from("content_kits").insert({
        user_id: user.id,
        topic: kitTrend.title,
        niche: kitNiche || null,
        virality_score: kitTrend.trendScore,
        kit: kitData,
      });
      if (error) {
        setKitError(
          error.message.includes("content_kits")
            ? "Saved-reports table missing. Run migration 0002_content_kits.sql in Supabase."
            : error.message,
        );
        return;
      }
      setSavedKit(true);
      setTimeout(() => setSavedKit(false), 3000);
    } finally {
      setSavingKit(false);
    }
  }

  if (status !== "authed") {
    return <AuthLoadingScreen label={status === "loading" ? "Loading your session…" : "Redirecting…"} />;
  }

  const totalTrends = (niches ?? []).reduce((sum, n) => sum + (alerts[n]?.trends.length ?? 0), 0);

  return (
    <main className="relative min-h-screen text-white flex">
      <AnimatedBackground />
      <Sidebar active="alerts" />

      <div className="lg:ml-64 flex-1 p-4 pt-20 lg:p-8 relative z-10">
        <div className="max-w-4xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="flex items-start justify-between gap-3 mb-6"
          >
            <div>
              <h2 className="flex items-center gap-2 text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent">
                <motion.span
                  className="text-transparent bg-clip-text"
                  animate={{ rotate: [0, -12, 12, -8, 8, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 3 }}
                >
                  🔔
                </motion.span>
                Trend Alerts
              </h2>
              <p className="text-white/50 text-sm mt-1">
                {niches && niches.length > 0
                  ? `${totalTrends} trending topics across ${niches.length} saved ${niches.length === 1 ? "niche" : "niches"}`
                  : "Personalized trend feeds for the niches you care about"}
              </p>
            </div>
            {niches && niches.length > 0 && (
              <motion.button
                onClick={refreshAll}
                whileHover={{ scale: 1.05, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                title="Refresh all niches"
                className="shrink-0 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition text-white/60 hover:text-white"
              >
                ↻
              </motion.button>
            )}
          </motion.div>

          {/* Add-niche form */}
          {niches && niches.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="flex flex-col sm:flex-row gap-3 mb-8"
            >
              <input
                type="text"
                placeholder="Add a niche to track — AI, Finance, Gaming…"
                value={newNiche}
                onChange={(e) => setNewNiche(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addNiche()}
                className="flex-1 px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500 transition"
              />
              <motion.button
                onClick={addNiche}
                disabled={adding || !newNiche.trim()}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-600 to-cyan-500 disabled:opacity-50 whitespace-nowrap"
              >
                {adding ? "Adding…" : "🔔 Add Niche"}
              </motion.button>
            </motion.div>
          )}

          {/* Initial loading of the saved-niche list */}
          {niches === null && (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 h-48">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Empty state — no saved niches */}
          {niches && niches.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <motion.div
                className="text-6xl mb-5"
                animate={{ y: [0, -10, 0], rotate: [0, -10, 10, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              >
                🔔
              </motion.div>
              <h3 className="text-xl font-bold mb-2">No saved niches yet</h3>
              <p className="text-white/50 text-sm max-w-sm mb-7">
                Save your favorite niches to get personalized trend alerts! We&apos;ll keep an eye on what&apos;s trending so you never miss a viral moment.
              </p>
              <motion.a
                href="/trends"
                whileHover={{ scale: 1.05, boxShadow: "0 0 30px -6px rgba(124,58,237,0.7)" }}
                whileTap={{ scale: 0.96 }}
                className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-600 to-cyan-500"
              >
                🔥 Explore Trends
              </motion.a>
            </motion.div>
          )}

          {/* Niche alert cards */}
          {niches && niches.length > 0 && (
            <div className="flex flex-col gap-5">
              <AnimatePresence mode="popLayout">
                {niches.map((niche, idx) => {
                  const state = alerts[niche];
                  const trends = (state?.trends ?? []).slice(0, TOP_N);
                  const count = state?.trends.length ?? 0;
                  return (
                    <motion.div
                      layout
                      key={niche}
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ delay: Math.min(idx * 0.06, 0.4), duration: 0.5, ease: EASE }}
                      className="relative rounded-2xl p-px bg-gradient-to-br from-purple-500/30 via-white/5 to-cyan-500/25"
                    >
                      <div className="rounded-2xl bg-[#0c0c10]/85 backdrop-blur-xl p-5 sm:p-6">
                        {/* Card header */}
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="min-w-0">
                            <h3 className="flex items-center gap-2 text-lg font-bold truncate">
                              <span>🔥</span>
                              <span className="capitalize truncate">{niche}</span>
                              <span className="text-white/40 font-normal text-sm whitespace-nowrap">
                                — {state?.loading && count === 0 ? "scanning…" : `${count} trending ${count === 1 ? "topic" : "topics"}`}
                              </span>
                            </h3>
                            {state?.savedAt ? (
                              <p className="text-[11px] text-white/30 mt-1">{freshness(state.savedAt)}</p>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <motion.button
                              onClick={() => void loadNiche(niche, true)}
                              whileHover={{ scale: 1.1, rotate: 90 }}
                              whileTap={{ scale: 0.9 }}
                              title="Refresh this niche"
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white transition"
                            >
                              ↻
                            </motion.button>
                            <motion.button
                              onClick={() => void removeNiche(niche)}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              title="Remove from alerts"
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-red-400 hover:border-red-500/30 transition"
                            >
                              ✕
                            </motion.button>
                          </div>
                        </div>

                        {/* Card body */}
                        {state?.loading && count === 0 ? (
                          <div className="flex flex-col gap-2">
                            {Array.from({ length: 4 }).map((_, i) => (
                              <div key={i} className="relative overflow-hidden h-11 rounded-xl bg-white/5">
                                <motion.div
                                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                                  animate={{ x: ["-100%", "100%"] }}
                                  transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut", delay: i * 0.12 }}
                                />
                              </div>
                            ))}
                          </div>
                        ) : state?.error && count === 0 ? (
                          <div className="flex items-center justify-between gap-3 rounded-xl bg-red-500/5 border border-red-500/20 p-4">
                            <p className="text-sm text-red-400/80">{state.error}</p>
                            <button
                              onClick={() => void loadNiche(niche, true)}
                              className="shrink-0 text-sm text-white/60 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 transition"
                            >
                              ↻ Retry
                            </button>
                          </div>
                        ) : trends.length === 0 ? (
                          <p className="text-sm text-white/40 py-6 text-center">
                            No trends right now — check back soon or refresh.
                          </p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {trends.map((trend, i) => (
                              <motion.button
                                key={`${trend.title}-${i}`}
                                onClick={() => openKit(trend, niche)}
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05, duration: 0.35 }}
                                whileHover={{ x: 4 }}
                                className="group flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-purple-500/30 transition-colors text-left"
                              >
                                <span className="text-sm font-bold text-white/25 w-5 shrink-0 text-center">{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-white/90 truncate" title={trend.title}>
                                    {trend.title}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span className={`w-1.5 h-1.5 rounded-full ${SOURCE_DOT[trend.source] ?? "bg-white/40"}`} />
                                    <span className="text-[11px] text-white/40">{trend.source}</span>
                                    <span className={`text-[11px] font-semibold ${scoreText(trend.trendScore)}`}>· {trend.trendScore}</span>
                                  </div>
                                </div>
                                {trend.url && (
                                  <a
                                    href={trend.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    title="Open source"
                                    className="shrink-0 text-white/20 hover:text-cyan-300 transition px-1"
                                  >
                                    ↗
                                  </a>
                                )}
                                <span className="shrink-0 text-[11px] font-semibold text-purple-300/0 group-hover:text-purple-300 transition-colors whitespace-nowrap">
                                  ✨ Kit
                                </span>
                              </motion.button>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* AI Content Kit slide-out panel */}
      <ContentKitPanel
        open={kitOpen}
        onClose={() => setKitOpen(false)}
        topic={kitTrend?.title ?? ""}
        score={kitTrend?.trendScore ?? 0}
        started={kitStarted}
        duration={kitDuration}
        onDurationChange={setKitDuration}
        onGenerate={runKit}
        onReconfigure={() => setKitStarted(false)}
        loading={kitLoading}
        needKey={needKey}
        error={kitError}
        kit={kitData}
        saving={savingKit}
        saved={savedKit}
        onSave={saveReport}
        onRetry={runKit}
      />
    </main>
  );
}
