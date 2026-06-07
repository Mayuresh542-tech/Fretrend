"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/Sidebar";
import AnimatedBackground from "../components/AnimatedBackground";
import ContentKitPanel, { DURATIONS, type ContentKit } from "../components/ContentKitPanel";

interface TrendItem {
  title: string;
  source: "Google Trends" | "HackerNews" | "Reddit" | "YouTube" | "Google News";
  trendScore: number;
  label: string;
  category: string;
  url?: string;
}

interface SourceCounts {
  googleTrends: number;
  hackerNews: number;
  reddit: number;
  googleNews: number;
  youtube: number;
}

interface Cache {
  niche: string;
  trends: TrendItem[];
  sources: SourceCounts;
  savedAt: number;
}

const CACHE_KEY = "vidril_trends_cache_v2";
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

const CATEGORIES = ["All", "Tech", "Finance", "Entertainment", "News", "Sports", "Gaming", "Other"];

const SOURCE_STYLES: Record<string, { color: string; bg: string; border: string; dot: string }> = {
  "Google Trends": { color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20", dot: "bg-blue-400" },
  HackerNews:     { color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20", dot: "bg-orange-400" },
  Reddit:         { color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20", dot: "bg-red-400" },
  YouTube:        { color: "text-rose-400", bg: "bg-rose-400/10", border: "border-rose-400/20", dot: "bg-rose-400" },
  "Google News":  { color: "text-teal-400", bg: "bg-teal-400/10", border: "border-teal-400/20", dot: "bg-teal-400" },
};

const CATEGORY_STYLES: Record<string, string> = {
  Tech:          "text-purple-400 bg-purple-400/10 border-purple-400/20",
  Finance:       "text-green-400 bg-green-400/10 border-green-400/20",
  Entertainment: "text-pink-400 bg-pink-400/10 border-pink-400/20",
  News:          "text-blue-300 bg-blue-300/10 border-blue-300/20",
  Sports:        "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  Gaming:        "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
  Other:         "text-white/40 bg-white/5 border-white/10",
};

/** Virality tier: red = hot, orange = rising, green = emerging. */
function viralityStyle(score: number) {
  if (score >= 80)
    return { label: "🔥 Hot", text: "text-rose-400", bar: "from-rose-500 to-orange-400", glow: "rgba(244,63,94,0.45)", ring: "border-rose-500/30" };
  if (score >= 60)
    return { label: "📈 Rising", text: "text-orange-400", bar: "from-orange-400 to-amber-300", glow: "rgba(251,146,60,0.4)", ring: "border-orange-500/30" };
  return { label: "🌱 Emerging", text: "text-emerald-400", bar: "from-emerald-500 to-teal-400", glow: "rgba(16,185,129,0.4)", ring: "border-emerald-500/30" };
}

function ContentKitButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className="relative overflow-hidden w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-purple-600 to-cyan-500 text-white"
    >
      <span className="relative z-10">✨ Generate AI Content Kit</span>
      <motion.span
        className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/35 to-transparent"
        initial={{ x: "-150%" }}
        animate={{ x: "150%" }}
        transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.4, ease: "easeInOut" }}
      />
    </motion.button>
  );
}

export default function Trends() {
  const [niche, setNiche] = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allTrends, setAllTrends] = useState<TrendItem[]>([]);
  const [sources, setSources] = useState<SourceCounts | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [cachedNiche, setCachedNiche] = useState("");
  const [lastFetched, setLastFetched] = useState<number | null>(null);

  // --- AI Content Kit panel state ---
  const [kitOpen, setKitOpen] = useState(false);
  const [kitStarted, setKitStarted] = useState(false);
  const [kitDuration, setKitDuration] = useState(60); // seconds
  const [kitTrend, setKitTrend] = useState<TrendItem | null>(null);
  const [kitLoading, setKitLoading] = useState(false);
  const [kitData, setKitData] = useState<ContentKit | null>(null);
  const [kitError, setKitError] = useState<string | null>(null);
  const [needKey, setNeedKey] = useState(false);
  const [savingKit, setSavingKit] = useState(false);
  const [savedKit, setSavedKit] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      const cache: Cache = JSON.parse(raw);
      if (Date.now() - cache.savedAt < CACHE_TTL) {
        setNiche(cache.niche);
        setCachedNiche(cache.niche);
        setAllTrends(cache.trends);
        setSources(cache.sources ?? null);
        setLastFetched(cache.savedAt);
        setSearched(true);
      }
    } catch {
      // ignore corrupt cache
    }
  }, []);

  async function findTrends(forceNiche?: string) {
    const query = (forceNiche ?? niche).trim();
    if (!query) return;
    setLoading(true);
    setError("");
    setSearched(true);
    setSelectedCategory("All");

    try {
      const res = await fetch("/api/trends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche: query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch trends");

      const results: TrendItem[] = data.trends ?? [];
      const srcCounts: SourceCounts = data.sources ?? { googleTrends: 0, hackerNews: 0, reddit: 0, googleNews: 0, youtube: 0 };
      const now = Date.now();

      setAllTrends(results);
      setSources(srcCounts);
      setCachedNiche(query);
      setLastFetched(now);

      localStorage.setItem(CACHE_KEY, JSON.stringify({ niche: query, trends: results, sources: srcCounts, savedAt: now } satisfies Cache));
    } catch (err: any) {
      setError(err.message);
      setAllTrends([]);
    } finally {
      setLoading(false);
    }
  }

  // Open the panel on its duration-selector step — generation starts on demand.
  function openKit(trend: TrendItem) {
    setKitTrend(trend);
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
      // Read the user's saved Groq key from Supabase (same table the Settings page writes to)
      let groqKey = "";
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("api_keys")
          .select("groq_key")
          .eq("user_id", user.id)
          .maybeSingle();
        groqKey = (data?.groq_key ?? "").trim();
      }

      if (!groqKey) {
        setNeedKey(true);
        return;
      }

      const res = await fetch("/api/content-kit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: kitTrend.title,
          niche: cachedNiche || niche || "general",
          score: kitTrend.trendScore,
          groqKey,
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
    } catch (err: any) {
      setKitError(err.message ?? "Something went wrong.");
    } finally {
      setKitLoading(false);
    }
  }

  async function saveReport() {
    if (!kitData || !kitTrend) return;
    setSavingKit(true);
    setKitError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setKitError("Log in to save reports.");
        return;
      }

      const { error } = await supabase.from("content_kits").insert({
        user_id: user.id,
        topic: kitTrend.title,
        niche: cachedNiche || niche || null,
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

  const displayed = selectedCategory === "All"
    ? allTrends
    : allTrends.filter((t) => t.category === selectedCategory);

  const availableCategories = CATEGORIES.filter(
    (c) => c === "All" || allTrends.some((t) => t.category === c)
  );

  function timeAgo(ts: number): string {
    const mins = Math.round((Date.now() - ts) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  }

  return (
    <main className="relative min-h-screen text-white flex">
      <AnimatedBackground />
      <Sidebar active="trends" />

      <div className="ml-64 flex-1 p-8 relative z-10">
        <div className="max-w-4xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mb-8"
          >
            <motion.h2
              className="text-3xl font-extrabold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent"
              style={{ backgroundSize: "200% auto" }}
              animate={{ backgroundPosition: ["0% center", "200% center"] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              Trend Radar
            </motion.h2>
            <p className="text-white/50 text-sm mt-1">
              Real-time intelligence across Google Trends, HackerNews, Reddit, YouTube &amp; Google News
            </p>
          </motion.div>

          {/* Search bar with glowing focus border */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="flex gap-3 mb-5"
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
                placeholder="Enter a niche — AI, Finance, Gaming, Crypto…"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={(e) => e.key === "Enter" && findTrends()}
                className="w-full px-4 py-3 bg-white/[0.03] backdrop-blur-xl rounded-xl text-white placeholder-white/30 focus:outline-none transition"
              />
            </motion.div>
            <motion.button
              onClick={() => findTrends()}
              disabled={loading}
              whileHover={{ scale: 1.04, boxShadow: "0 0 26px -6px rgba(124,58,237,0.7)" }}
              whileTap={{ scale: 0.96 }}
              className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-600 to-cyan-500 disabled:opacity-50 whitespace-nowrap"
            >
              {loading ? "Scanning…" : "Find Trends"}
            </motion.button>
            {searched && !loading && (
              <motion.button
                onClick={() => findTrends(cachedNiche)}
                whileHover={{ scale: 1.08, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                title="Refresh results"
                className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition text-white/60 hover:text-white"
              >
                ↻
              </motion.button>
            )}
          </motion.div>

          {/* Source summary pills */}
          {sources && !loading && allTrends.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-wrap gap-2 mb-6"
            >
              {([
                ["Google Trends", sources.googleTrends],
                ["HackerNews", sources.hackerNews],
                ["Reddit", sources.reddit],
                ["Google News", sources.googleNews],
                ["YouTube", sources.youtube],
              ] as [string, number][]).map(([src, count], i) => {
                if (!count) return null;
                const s = SOURCE_STYLES[src];
                return (
                  <motion.span
                    key={src}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${s.color} ${s.bg} ${s.border}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    {src} ({count})
                  </motion.span>
                );
              })}
              {lastFetched && (
                <span className="text-xs text-white/20 px-2 py-1 self-center">Updated {timeAgo(lastFetched)}</span>
              )}
            </motion.div>
          )}

          {/* Category filter chips */}
          {allTrends.length > 0 && !loading && (
            <div className="flex flex-wrap gap-2 mb-6">
              {availableCategories.map((cat) => {
                const count = cat === "All" ? allTrends.length : allTrends.filter((t) => t.category === cat).length;
                const isActive = selectedCategory === cat;
                return (
                  <motion.button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`relative px-3 py-1.5 rounded-lg text-sm font-medium transition border ${
                      isActive
                        ? "bg-gradient-to-r from-purple-600 to-cyan-500 border-transparent text-white"
                        : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {cat} <span className="opacity-60 text-xs">({count})</span>
                  </motion.button>
                );
              })}
            </div>
          )}

          {/* Loading skeleton with shimmer */}
          {loading && (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 h-[120px]">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 }}
                  />
                  <div className="flex items-start gap-4">
                    <div className="w-7 h-7 bg-white/10 rounded-lg shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-2.5">
                      <div className="h-4 bg-white/10 rounded w-3/4" />
                      <div className="flex gap-2">
                        <div className="h-3 bg-white/5 rounded-full w-20" />
                        <div className="h-3 bg-white/5 rounded-full w-16" />
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full w-full" />
                    </div>
                    <div className="w-16 h-12 bg-white/5 rounded-lg shrink-0" />
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
              <p className="text-red-400 font-semibold mb-1">Could not fetch trends</p>
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
                📡
              </motion.div>
              <h3 className="text-lg font-semibold mb-2">Scan 5 sources at once</h3>
              <p className="text-white/40 text-sm max-w-sm">
                Enter any niche to pull trending topics from Google Trends, HackerNews, Reddit, YouTube, and Google News simultaneously.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                {["AI", "Finance", "Gaming", "Crypto", "Sports", "Health"].map((s, i) => (
                  <motion.button
                    key={s}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.06 }}
                    whileHover={{ scale: 1.08, y: -2 }}
                    onClick={() => { setNiche(s); findTrends(s); }}
                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white/50 hover:text-white hover:border-purple-500/40 transition"
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* No results after search */}
          {!loading && !error && searched && allTrends.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="text-5xl mb-4">😶</div>
              <h3 className="text-lg font-semibold mb-2">No trends found</h3>
              <p className="text-white/40 text-sm max-w-xs">
                Try a broader niche like &ldquo;Tech&rdquo;, &ldquo;Finance&rdquo;, or &ldquo;Gaming&rdquo;.
              </p>
            </div>
          )}

          {/* No results for selected category */}
          {!loading && !error && searched && allTrends.length > 0 && displayed.length === 0 && (
            <div className="text-center py-12 text-white/30 text-sm">
              No {selectedCategory} results in this batch. Try refreshing or pick another category.
            </div>
          )}

          {/* Results */}
          {!loading && displayed.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-white/40 text-sm">
                  <span className="text-white/70 font-medium">{displayed.length}</span> trends for &ldquo;
                  <span className="text-white/70">{cachedNiche}</span>&rdquo;
                  {selectedCategory !== "All" && <span className="text-purple-400"> · {selectedCategory}</span>}
                </p>
              </div>

              <AnimatePresence mode="popLayout">
                <div className="flex flex-col gap-3">
                  {displayed.map((trend, i) => {
                    const src = SOURCE_STYLES[trend.source] ?? SOURCE_STYLES["Google News"];
                    const catStyle = CATEGORY_STYLES[trend.category] ?? CATEGORY_STYLES["Other"];
                    const vir = viralityStyle(trend.trendScore);

                    return (
                      <motion.div
                        layout
                        key={`${trend.source}-${trend.title}-${i}`}
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ delay: Math.min(i * 0.05, 0.5), duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                        whileHover={{ scale: 1.015, y: -2, boxShadow: `0 0 34px -8px ${vir.glow}` }}
                        className={`group relative rounded-2xl border ${vir.ring} bg-white/[0.03] backdrop-blur-xl p-5 transition-colors`}
                      >
                        <div className="flex items-start gap-4">
                          {/* Rank */}
                          <span className="text-lg font-bold text-white/20 w-7 shrink-0 text-center pt-0.5">{i + 1}</span>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white leading-snug mb-2" title={trend.title}>
                              {trend.url ? (
                                <a href={trend.url} target="_blank" rel="noopener noreferrer" className="hover:text-purple-300 transition-colors">
                                  {trend.title}
                                </a>
                              ) : trend.title}
                            </p>

                            <div className="flex items-center flex-wrap gap-1.5 mb-3">
                              <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${src.color} ${src.bg} ${src.border}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${src.dot}`} />
                                {trend.source}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${catStyle}`}>{trend.category}</span>
                              <span className={`text-xs font-medium ${vir.text}`}>{vir.label}</span>
                            </div>

                            {/* Animated trend-score progress bar */}
                            <div className="flex items-center gap-3">
                              <div className="h-1.5 flex-1 rounded-full bg-white/5 overflow-hidden">
                                <motion.div
                                  className={`h-full rounded-full bg-gradient-to-r ${vir.bar}`}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${trend.trendScore}%` }}
                                  transition={{ delay: Math.min(i * 0.05, 0.5) + 0.15, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                                />
                              </div>
                              <span className="text-xs text-white/40 shrink-0">{trend.label}</span>
                            </div>
                          </div>

                          {/* Virality score */}
                          <div className="flex flex-col items-center shrink-0 w-16">
                            <span className="text-[10px] uppercase tracking-wider text-white/30 mb-0.5">Virality</span>
                            <span className={`text-2xl font-extrabold ${vir.text}`}>{trend.trendScore}</span>
                            <span className="text-[10px] text-white/20">/100</span>
                          </div>
                        </div>

                        {/* Content kit CTA — revealed on hover */}
                        <div className="mt-4 pt-4 border-t border-white/5 flex justify-end opacity-70 group-hover:opacity-100 transition-opacity">
                          <ContentKitButton onClick={() => openKit(trend)} />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </AnimatePresence>
            </>
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
