"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { useAuthGate } from "../lib/useAuthGate";
import Sidebar from "../components/Sidebar";
import AnimatedBackground from "../components/AnimatedBackground";
import AuthLoadingScreen from "../components/AuthLoadingScreen";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

interface CompetitorVideo {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  views: number;
  likes: number;
  publishedAt: string | null;
  url: string;
}

interface TitleFormula {
  formula: string;
  example: string;
}

interface CompetitorAnalysis {
  whatsWorking: string[];
  contentGaps: string[];
  titleFormulas: TitleFormula[];
}

interface Cache {
  niche: string;
  videos: CompetitorVideo[];
  averageViews: number;
  analysis: CompetitorAnalysis | null;
  savedAt: number;
}

const CACHE_KEY = "fretrend_competitors_cache_v1";
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

const EXAMPLES = ["AI Tools", "Personal Finance", "Fitness", "Productivity", "Crypto", "Cooking"];

/** Compact view/like counts: 1.2M, 345K, 980. */
function formatCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "") + "K";
  return String(n);
}

function uploadAgo(iso: string | null): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const days = Math.floor((Date.now() - t) / 86_400_000);
  if (days < 1) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  if (days < 365) {
    const mo = Math.floor(days / 30);
    return `${mo} month${mo === 1 ? "" : "s"} ago`;
  }
  const yr = Math.floor(days / 365);
  return `${yr} year${yr === 1 ? "" : "s"} ago`;
}

export default function Competitors() {
  const router = useRouter();
  const { status } = useAuthGate();

  const [niche, setNiche] = useState("");
  const [focused, setFocused] = useState(false);
  const [searched, setSearched] = useState(false);
  const [cachedNiche, setCachedNiche] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [videos, setVideos] = useState<CompetitorVideo[]>([]);
  const [averageViews, setAverageViews] = useState(0);

  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<CompetitorAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState("");
  const [needGroqKey, setNeedGroqKey] = useState(false);

  // Protected page: redirect logged-out visitors once the gate resolves.
  useEffect(() => {
    if (status === "unauthed") router.replace("/login");
  }, [status, router]);

  // Restore the last analysis from cache so revisits are instant.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      const cache: Cache = JSON.parse(raw);
      if (Date.now() - cache.savedAt < CACHE_TTL) {
        setNiche(cache.niche);
        setCachedNiche(cache.niche);
        setVideos(cache.videos);
        setAverageViews(cache.averageViews);
        setAnalysis(cache.analysis);
        setSearched(true);
      }
    } catch {
      // ignore corrupt cache
    }
  }, []);

  function writeCache(next: Partial<Cache>) {
    try {
      const bundle: Cache = {
        niche: next.niche ?? cachedNiche,
        videos: next.videos ?? videos,
        averageViews: next.averageViews ?? averageViews,
        analysis: next.analysis !== undefined ? next.analysis : analysis,
        savedAt: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(bundle));
    } catch {
      // quota/serialization issues are non-fatal
    }
  }

  async function runAnalysis(query: string, vids: CompetitorVideo[]) {
    setAnalyzing(true);
    setAnalysis(null);
    setAnalysisError("");
    setNeedGroqKey(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setNeedGroqKey(true);
        return;
      }
      const res = await fetch("/api/competitors/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          niche: query,
          videos: vids.map((v) => ({ title: v.title, views: v.views, channel: v.channel })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "missing_key") {
          setNeedGroqKey(true);
          return;
        }
        if (data.error === "invalid_key") {
          throw new Error("Your Groq API key was rejected. Update it in Settings.");
        }
        throw new Error(data.error ?? "Failed to analyze competitors.");
      }
      setAnalysis(data.analysis);
      writeCache({ niche: query, videos: vids, analysis: data.analysis });
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function analyze(forceNiche?: string) {
    const query = (forceNiche ?? niche).trim();
    if (!query) return;

    setLoading(true);
    setSearched(true);
    setError("");
    setVideos([]);
    setAverageViews(0);
    setAnalysis(null);
    setAnalysisError("");
    setNeedGroqKey(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ niche: query }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "missing_youtube_key") {
          throw new Error("No YouTube API key configured. Add YOUTUBE_API_KEY to .env.local (or save your key in Settings).");
        }
        if (data.error === "invalid_youtube_key") {
          throw new Error("The YouTube API key was rejected. Check it's valid and the YouTube Data API v3 is enabled.");
        }
        throw new Error(data.error ?? "Failed to fetch competitors.");
      }

      const vids: CompetitorVideo[] = data.videos ?? [];
      setVideos(vids);
      setAverageViews(data.averageViews ?? 0);
      setCachedNiche(query);
      writeCache({ niche: query, videos: vids, averageViews: data.averageViews ?? 0, analysis: null });

      // Kick off the AI analysis once the videos are in.
      if (vids.length > 0) void runAnalysis(query, vids);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }

  if (status !== "authed") {
    return <AuthLoadingScreen label={status === "loading" ? "Loading your session…" : "Redirecting…"} />;
  }

  const topViews = videos.length ? videos[0].views : 0;

  return (
    <main className="relative min-h-screen text-white flex">
      <AnimatedBackground />
      <Sidebar active="competitors" />

      <div className="lg:ml-64 flex-1 p-4 pt-20 lg:p-8 relative z-10">
        <div className="max-w-5xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="mb-8"
          >
            <h2 className="flex items-center gap-2 text-2xl sm:text-3xl font-extrabold">
              <span>📊</span>
              <motion.span
                className="bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent"
                style={{ backgroundSize: "200% auto" }}
                animate={{ backgroundPosition: ["0% center", "200% center"] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              >
                Competitor Analysis
              </motion.span>
            </h2>
            <p className="text-white/50 text-sm mt-1">
              See what&apos;s winning on YouTube in your niche, then find the gaps your competitors are missing.
            </p>
          </motion.div>

          {/* Search bar */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-3 mb-8"
          >
            <motion.div
              className="flex-1 rounded-xl"
              animate={{
                boxShadow: focused
                  ? "0 0 0 1px rgba(124,58,237,0.9), 0 0 28px rgba(124,58,237,0.35)"
                  : "0 0 0 1px rgba(255,255,255,0.08), 0 0 0 rgba(124,58,237,0)",
              }}
              transition={{ duration: 0.3 }}
            >
              <input
                type="text"
                placeholder="Enter your niche or topic — AI Tools, Fitness, Personal Finance…"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={(e) => e.key === "Enter" && analyze()}
                className="w-full px-4 py-3 bg-white/[0.03] backdrop-blur-xl rounded-xl text-white placeholder-white/30 focus:outline-none transition"
              />
            </motion.div>
            <motion.button
              onClick={() => analyze()}
              disabled={loading}
              whileHover={{ scale: 1.04, boxShadow: "0 0 26px -6px rgba(124,58,237,0.7)" }}
              whileTap={{ scale: 0.96 }}
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-600 to-cyan-500 disabled:opacity-50 whitespace-nowrap"
            >
              {loading ? "Analyzing…" : "📊 Analyze"}
            </motion.button>
            {searched && !loading && (
              <motion.button
                onClick={() => analyze(cachedNiche)}
                whileHover={{ scale: 1.08, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                title="Re-run analysis"
                className="w-full sm:w-auto px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition text-white/60 hover:text-white"
              >
                ↻
              </motion.button>
            )}
          </motion.div>

          {/* Loading skeleton */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                  <motion.div
                    className="absolute inset-0 z-10 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 }}
                  />
                  <div className="aspect-video bg-white/5" />
                  <div className="p-4 space-y-2.5">
                    <div className="h-4 bg-white/10 rounded w-5/6" />
                    <div className="h-3 bg-white/5 rounded w-1/2" />
                    <div className="flex gap-2">
                      <div className="h-3 bg-white/5 rounded-full w-16" />
                      <div className="h-3 bg-white/5 rounded-full w-20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center"
            >
              <p className="text-red-400 font-semibold mb-1">Could not analyze competitors</p>
              <p className="text-white/40 text-sm">{error}</p>
            </motion.div>
          )}

          {/* Empty state — not yet searched */}
          {!loading && !error && !searched && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <motion.div
                className="text-6xl mb-4"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                📊
              </motion.div>
              <h3 className="text-lg font-semibold mb-2">Analyze your competition</h3>
              <p className="text-white/40 text-sm max-w-sm">
                Enter a niche to pull the top YouTube videos, benchmark their views, and get an AI breakdown of what&apos;s working and where the gaps are.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                {EXAMPLES.map((s, i) => (
                  <motion.button
                    key={s}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.06 }}
                    whileHover={{ scale: 1.08, y: -2 }}
                    onClick={() => { setNiche(s); analyze(s); }}
                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white/50 hover:text-white hover:border-purple-500/40 transition"
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* No results after search */}
          {!loading && !error && searched && videos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="text-5xl mb-4">😶</div>
              <h3 className="text-lg font-semibold mb-2">No videos found</h3>
              <p className="text-white/40 text-sm max-w-xs">
                Try a broader or more common niche like &ldquo;Fitness&rdquo;, &ldquo;Investing&rdquo;, or &ldquo;Gaming&rdquo;.
              </p>
            </div>
          )}

          {/* Results */}
          {!loading && !error && videos.length > 0 && (
            <div className="flex flex-col gap-8">
              {/* Benchmark strip */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
                className="grid grid-cols-3 gap-3"
              >
                {[
                  { label: "Avg Views (Benchmark)", value: formatCompact(averageViews), accent: "from-purple-500/20 to-cyan-500/10", text: "text-purple-200" },
                  { label: "Top Video Views", value: formatCompact(topViews), accent: "from-rose-500/20 to-orange-500/10", text: "text-rose-200" },
                  { label: "Videos Analyzed", value: String(videos.length), accent: "from-emerald-500/20 to-teal-500/10", text: "text-emerald-200" },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05 + i * 0.06 }}
                    className={`rounded-2xl border border-white/10 bg-gradient-to-br ${stat.accent} backdrop-blur-xl p-4 sm:p-5`}
                  >
                    <p className="text-[11px] uppercase tracking-wider text-white/40 mb-1">{stat.label}</p>
                    <p className={`text-2xl sm:text-3xl font-extrabold ${stat.text}`}>{stat.value}</p>
                  </motion.div>
                ))}
              </motion.div>

              {/* Video grid */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">
                    Top videos for &ldquo;<span className="text-purple-300">{cachedNiche}</span>&rdquo;
                  </h3>
                  <span className="text-xs text-white/40">ranked by views</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {videos.map((v, i) => (
                    <motion.a
                      key={v.id}
                      href={v.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.05, 0.5), duration: 0.45, ease: EASE }}
                      whileHover={{ y: -3, boxShadow: "0 0 34px -10px rgba(124,58,237,0.6)" }}
                      className="group relative rounded-2xl border border-white/10 hover:border-purple-500/40 bg-white/[0.03] backdrop-blur-xl overflow-hidden transition-colors"
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-video overflow-hidden bg-white/5">
                        {v.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={v.thumbnail}
                            alt={v.title}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl text-white/20">▶</div>
                        )}
                        <span className="absolute top-2 left-2 min-w-6 h-6 px-1.5 flex items-center justify-center rounded-md text-xs font-bold bg-black/70 backdrop-blur-sm text-white">
                          #{i + 1}
                        </span>
                        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-xs font-semibold bg-black/75 backdrop-blur-sm text-white">
                          {formatCompact(v.views)} views
                        </span>
                      </div>

                      {/* Meta */}
                      <div className="p-4">
                        <p className="font-semibold text-white leading-snug line-clamp-2 group-hover:text-purple-200 transition-colors" title={v.title}>
                          {v.title}
                        </p>
                        <p className="text-sm text-white/50 mt-1.5 truncate">{v.channel}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
                          <span className="flex items-center gap-1">👁 {formatCompact(v.views)}</span>
                          {v.likes > 0 && <span className="flex items-center gap-1">👍 {formatCompact(v.likes)}</span>}
                          {v.publishedAt && <span>· {uploadAgo(v.publishedAt)}</span>}
                        </div>
                      </div>
                    </motion.a>
                  ))}
                </div>
              </section>

              {/* AI Analysis */}
              <section className="flex flex-col gap-5">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold">AI Competitor Breakdown</h3>
                  {analyzing && (
                    <span className="flex items-center gap-1.5 text-xs text-purple-300/80">
                      <motion.span
                        className="w-1.5 h-1.5 rounded-full bg-purple-400"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                      />
                      generating insights…
                    </span>
                  )}
                </div>

                {/* Idle (e.g. restored from cache without an analysis) — offer to run it */}
                {!analysis && !analyzing && !analysisError && !needGroqKey && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
                    <p className="text-white/60 text-sm mb-4">
                      Generate an AI breakdown of what&apos;s working, the content gaps, and winning title formulas for these videos.
                    </p>
                    <motion.button
                      onClick={() => runAnalysis(cachedNiche, videos)}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      className="px-5 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-purple-600 to-cyan-500"
                    >
                      ✨ Generate Breakdown
                    </motion.button>
                  </div>
                )}

                {/* Needs Groq key */}
                {needGroqKey && !analyzing && (
                  <div className="rounded-2xl border border-purple-500/30 bg-purple-600/10 p-6 text-center">
                    <p className="text-purple-200 font-semibold mb-1">✨ Add a Groq key to unlock AI insights</p>
                    <p className="text-white/50 text-sm mb-4">
                      The video benchmark above is ready. Connect your free Groq API key to generate What&apos;s Working, Content Gaps &amp; Title Formulas.
                    </p>
                    <a
                      href="/settings"
                      className="inline-block px-5 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-purple-600 to-cyan-500"
                    >
                      Go to Settings →
                    </a>
                  </div>
                )}

                {/* Analysis error */}
                {analysisError && !analyzing && (
                  <div className="flex items-center justify-between gap-3 rounded-2xl bg-red-500/5 border border-red-500/20 p-4">
                    <p className="text-sm text-red-400/80">{analysisError}</p>
                    <button
                      onClick={() => runAnalysis(cachedNiche, videos)}
                      className="shrink-0 text-sm text-white/60 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 transition"
                    >
                      ↻ Retry
                    </button>
                  </div>
                )}

                {/* Analysis loading skeleton */}
                {analyzing && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 h-44">
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent"
                          animate={{ x: ["-100%", "100%"] }}
                          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
                        />
                        <div className="h-4 w-1/3 bg-white/10 rounded mb-4" />
                        <div className="space-y-2.5">
                          {Array.from({ length: 4 }).map((__, j) => (
                            <div key={j} className="h-3 bg-white/5 rounded w-full" />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Analysis content */}
                <AnimatePresence>
                  {analysis && !analyzing && (
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col gap-4"
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* What's Working */}
                        <AnalysisPanel
                          title="What's Working"
                          icon="✅"
                          accent="from-emerald-500/30 via-white/5 to-emerald-400/10"
                          dot="bg-emerald-400"
                          items={analysis.whatsWorking}
                          empty="No clear patterns surfaced — try a broader niche."
                        />
                        {/* Content Gaps */}
                        <AnalysisPanel
                          title="Content Gaps"
                          icon="🎯"
                          accent="from-purple-500/30 via-white/5 to-cyan-500/10"
                          dot="bg-purple-400"
                          items={analysis.contentGaps}
                          empty="No obvious gaps found — this niche looks saturated."
                        />
                      </div>

                      {/* Title Formulas */}
                      <div className="relative rounded-2xl p-px bg-gradient-to-br from-cyan-500/30 via-white/5 to-purple-500/20">
                        <div className="rounded-2xl bg-[#0c0c10]/85 backdrop-blur-xl p-5 sm:p-6">
                          <h4 className="flex items-center gap-2 font-bold mb-4">
                            <span>📝</span> Winning Title Formulas
                          </h4>
                          {analysis.titleFormulas.length === 0 ? (
                            <p className="text-sm text-white/40">No repeatable title formulas detected.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {analysis.titleFormulas.map((f, i) => (
                                <motion.div
                                  key={`${f.formula}-${i}`}
                                  initial={{ opacity: 0, y: 12 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: i * 0.05 }}
                                  className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                                >
                                  <p className="text-sm font-semibold text-cyan-200">{f.formula}</p>
                                  {f.example && (
                                    <p className="text-xs text-white/50 mt-1.5 italic">e.g. &ldquo;{f.example}&rdquo;</p>
                                  )}
                                </motion.div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function AnalysisPanel({
  title,
  icon,
  accent,
  dot,
  items,
  empty,
}: {
  title: string;
  icon: string;
  accent: string;
  dot: string;
  items: string[];
  empty: string;
}) {
  return (
    <div className={`relative rounded-2xl p-px bg-gradient-to-br ${accent}`}>
      <div className="rounded-2xl bg-[#0c0c10]/85 backdrop-blur-xl p-5 sm:p-6 h-full">
        <h4 className="flex items-center gap-2 font-bold mb-4">
          <span>{icon}</span> {title}
        </h4>
        {items.length === 0 ? (
          <p className="text-sm text-white/40">{empty}</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {items.map((item, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-2.5 text-sm text-white/80 leading-relaxed"
              >
                <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                <span>{item}</span>
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
