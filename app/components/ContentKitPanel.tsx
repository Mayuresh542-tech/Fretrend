"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

export interface ContentKit {
  titles: string[];
  hooks: string[];
  thumbnail_ideas: string[];
  why_trending: string;
  content_angles: string[];
  best_format: string;
  catch_window: string;
  virality_tips: string[];
  script: string;
}

/** Script length presets. Word counts assume a ~150 wpm speaking pace. */
export interface Duration {
  label: string;
  seconds: number;
  words: number;
  format: "short-form" | "long-form";
}

export const DURATIONS: Duration[] = [
  { label: "30 seconds", seconds: 30, words: 75, format: "short-form" },
  { label: "60 seconds", seconds: 60, words: 150, format: "short-form" },
  { label: "3 minutes", seconds: 180, words: 450, format: "long-form" },
  { label: "5 minutes", seconds: 300, words: 750, format: "long-form" },
  { label: "10 minutes", seconds: 600, words: 1500, format: "long-form" },
];

interface PanelProps {
  open: boolean;
  onClose: () => void;
  topic: string;
  niche?: string;
  score: number;
  started: boolean;
  duration: number;
  onDurationChange: (seconds: number) => void;
  onGenerate: () => void;
  onReconfigure: () => void;
  loading: boolean;
  needKey: boolean;
  error: string | null;
  kit: ContentKit | null;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
  onRetry: () => void;
}

/** Count words in a script for the word-count badge. */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Estimated read/record time from word count (~150 wpm speaking pace). */
function readTime(words: number): string {
  const secs = Math.round((words / 150) * 60);
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

const SCRIPT_LABELS = ["HOOK:", "INTRO:", "MAIN CONTENT:", "CTA:"];

/** Render the script, bolding the HOOK/INTRO/MAIN CONTENT/CTA section labels. */
function ScriptBody({ script }: { script: string }) {
  const parts = script.split(/(HOOK:|INTRO:|MAIN CONTENT:|CTA:)/g);
  return (
    <p className="text-sm text-white/85 leading-relaxed whitespace-pre-wrap">
      {parts.map((part, i) =>
        SCRIPT_LABELS.includes(part) ? (
          <strong key={i} className="block mt-4 first:mt-0 text-purple-300 font-bold tracking-wide">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  );
}

/** Small copy-to-clipboard button used on every item in the kit. */
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard may be blocked (insecure context) — fail quietly
    }
  }

  return (
    <motion.button
      onClick={copy}
      whileTap={{ scale: 0.9 }}
      title="Copy to clipboard"
      className={`shrink-0 px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${
        copied
          ? "text-emerald-300 border-emerald-400/30 bg-emerald-400/10"
          : "text-white/40 border-white/10 bg-white/5 hover:text-white hover:border-purple-500/40"
      }`}
    >
      {copied ? "✓ Copied" : "Copy"}
    </motion.button>
  );
}

function SectionTitle({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/40 mb-3">
      <span className="text-sm">{icon}</span>
      {children}
    </h4>
  );
}

/**
 * Coerce a list item to display text. The prompt asks Groq for plain strings,
 * but models occasionally return an object (e.g. { concept, colors, text });
 * flatten those into a readable sentence rather than crashing the render.
 */
function toText(item: unknown): string {
  if (typeof item === "string") return item;
  if (item && typeof item === "object") {
    return Object.values(item as Record<string, unknown>)
      .map((v) => (Array.isArray(v) ? v.join(", ") : String(v)))
      .filter(Boolean)
      .join(" — ");
  }
  return String(item ?? "");
}

/** A list of copyable items (titles, hooks, angles, tips…). */
function ItemList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((raw, i) => {
        const item = toText(raw);
        return (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="group flex items-start gap-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-purple-500/25 p-3 transition-colors"
        >
          <span className="shrink-0 mt-0.5 w-5 h-5 rounded-md bg-purple-500/15 text-purple-300 text-[11px] font-bold flex items-center justify-center">
            {i + 1}
          </span>
          <p className="flex-1 text-sm text-white/85 leading-snug">{item}</p>
          <CopyBtn text={item} />
        </motion.div>
        );
      })}
    </div>
  );
}

const LOADING_STEPS = [
  "Analysing the trend signal…",
  "Engineering high-CTR titles…",
  "Writing scroll-stopping hooks…",
  "Designing thumbnail concepts…",
  "Mapping your content angles…",
];

function KitSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <motion.div
        className="relative w-16 h-16 mb-6"
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute inset-0 rounded-full border-2 border-purple-500/20" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-purple-400 border-r-cyan-400" />
      </motion.div>
      <motion.p
        className="text-sm font-medium bg-gradient-to-r from-purple-200 to-cyan-200 bg-clip-text text-transparent"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      >
        Generating your content kit
      </motion.p>
      <div className="mt-6 w-full max-w-xs flex flex-col gap-2">
        {LOADING_STEPS.map((step, i) => (
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.45 }}
            className="flex items-center gap-2 text-xs text-white/40"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/60" />
            {step}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// --- Multi-Platform Kit ---

interface Platform {
  id: string;
  name: string;
  icon: string;
  accent: string; // gradient for the active-tab pill
  ring: string; // active-tab border
  dot: string; // section-bullet color
}

const PLATFORMS: Platform[] = [
  { id: "youtube", name: "YouTube", icon: "▶️", accent: "from-red-500/25 to-rose-500/10", ring: "border-rose-500/40", dot: "bg-rose-400" },
  { id: "tiktok", name: "TikTok", icon: "🎵", accent: "from-cyan-500/25 to-teal-500/10", ring: "border-cyan-500/40", dot: "bg-cyan-400" },
  { id: "reels", name: "Reels", icon: "📸", accent: "from-pink-500/25 to-fuchsia-500/10", ring: "border-pink-500/40", dot: "bg-pink-400" },
  { id: "twitter", name: "X", icon: "𝕏", accent: "from-sky-500/25 to-blue-500/10", ring: "border-sky-500/40", dot: "bg-sky-400" },
  { id: "linkedin", name: "LinkedIn", icon: "💼", accent: "from-blue-500/25 to-indigo-500/10", ring: "border-blue-500/40", dot: "bg-blue-400" },
];

interface PlatformSection {
  label: string;
  kind: "text" | "list";
  value: string | string[];
}

/** Renders one platform's generated sections with copy buttons. */
function PlatformSections({ sections, dot }: { sections: PlatformSection[]; dot: string }) {
  return (
    <div className="flex flex-col gap-3">
      {sections.map((s, i) => {
        const isList = Array.isArray(s.value);
        const list = isList ? (s.value as string[]) : [];
        // Short list items (hashtags, tags, sounds) read best as chips; long
        // ones (thread tweets) as individually-copyable stacked lines.
        const asChips = isList && list.every((v) => v.length <= 30);
        const copyAll = isList ? list.join(asChips ? " " : "\n") : (s.value as string);
        return (
          <motion.div
            key={`${s.label}-${i}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl bg-white/[0.03] border border-white/5 p-3"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <h5 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/40">
                <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                {s.label}
              </h5>
              <CopyBtn text={copyAll} />
            </div>

            {!isList ? (
              <ScriptBody script={s.value as string} />
            ) : asChips ? (
              <div className="flex flex-wrap gap-1.5">
                {list.map((chip, j) => (
                  <span
                    key={j}
                    className="px-2 py-1 rounded-md text-[11px] bg-white/5 border border-white/10 text-white/70"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {list.map((line, j) => (
                  <div
                    key={j}
                    className="group flex items-start gap-2 rounded-lg bg-white/[0.03] border border-white/5 p-2.5"
                  >
                    <p className="flex-1 text-sm text-white/85 whitespace-pre-wrap leading-snug">{line}</p>
                    <CopyBtn text={line} />
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

/**
 * Self-contained multi-platform repurposer. Lives inside the kit so both the
 * trends and alerts pages get it for free. It resolves the user's session
 * itself and calls /api/platform-kit on demand, caching each platform's result
 * so switching tabs is instant. Remount (keyed by topic) resets the cache.
 */
function MultiPlatformSection({ topic, niche, score }: { topic: string; niche?: string; score: number }) {
  const [active, setActive] = useState<string | null>(null);
  const [cache, setCache] = useState<Record<string, PlatformSection[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [needKey, setNeedKey] = useState(false);

  const activeMeta = PLATFORMS.find((p) => p.id === active) ?? null;
  const isLoading = loadingId !== null && loadingId === active;
  const activeError = active ? errors[active] : undefined;
  const activeSections = active ? cache[active] : undefined;

  async function generate(platform: string) {
    setLoadingId(platform);
    setNeedKey(false);
    setErrors((prev) => {
      const next = { ...prev };
      delete next[platform];
      return next;
    });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setNeedKey(true);
        return;
      }
      const res = await fetch("/api/platform-kit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ topic, niche: niche || "general", score, platform }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "missing_key") {
          setNeedKey(true);
          return;
        }
        const msg =
          data.error === "invalid_key"
            ? "Your Groq API key was rejected. Update it in Settings."
            : data.error ?? "Failed to generate platform content.";
        setErrors((prev) => ({ ...prev, [platform]: msg }));
        return;
      }
      setCache((prev) => ({ ...prev, [platform]: data.sections }));
    } catch {
      setErrors((prev) => ({ ...prev, [platform]: "Something went wrong — try again." }));
    } finally {
      setLoadingId((id) => (id === platform ? null : id));
    }
  }

  function selectPlatform(platform: string) {
    setActive(platform);
    setNeedKey(false);
    if (!cache[platform] && loadingId !== platform) void generate(platform);
  }

  // Which view to show — drives the AnimatePresence key for smooth swaps.
  let viewKey = "empty";
  if (active) {
    if (needKey) viewKey = "needkey";
    else if (isLoading) viewKey = `loading-${active}`;
    else if (activeError) viewKey = `error-${active}`;
    else if (activeSections) viewKey = `content-${active}`;
    else viewKey = `idle-${active}`;
  }

  return (
    <div>
      {/* Platform tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {PLATFORMS.map((p) => {
          const isActive = p.id === active;
          return (
            <motion.button
              key={p.id}
              onClick={() => selectPlatform(p.id)}
              whileTap={{ scale: 0.95 }}
              className={`relative shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                isActive ? "text-white" : "text-white/50 hover:text-white"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="platform-pill"
                  className={`absolute inset-0 rounded-lg bg-gradient-to-r ${p.accent} border ${p.ring}`}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10 text-sm">{p.icon}</span>
              <span className="relative z-10">{p.name}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Active platform content */}
      <div className="mt-3 min-h-[72px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={viewKey}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            {!active ? (
              <p className="text-center text-sm text-white/40 py-6">
                Pick a platform to generate content tailored to it.
              </p>
            ) : needKey ? (
              <div className="text-center py-6">
                <div className="text-3xl mb-2">🔑</div>
                <p className="text-sm text-white/60 mb-3">Add your Groq key to generate platform content.</p>
                <a
                  href="/settings"
                  className="inline-block px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-purple-600 to-cyan-500"
                >
                  ⚙️ Open Settings
                </a>
              </div>
            ) : isLoading ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <motion.div
                  className="w-8 h-8 mb-3 rounded-full border-2 border-purple-500/20 border-t-purple-400"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                />
                <p className="text-xs text-white/50">Optimizing for {activeMeta?.name}…</p>
              </div>
            ) : activeError ? (
              <div className="text-center py-6">
                <p className="text-sm text-red-400/80 mb-3">{activeError}</p>
                <button
                  onClick={() => void generate(active)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  ↻ Try again
                </button>
              </div>
            ) : activeSections ? (
              <PlatformSections sections={activeSections} dot={activeMeta?.dot ?? "bg-purple-400"} />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function ContentKitPanel({
  open,
  onClose,
  topic,
  niche,
  score,
  started,
  duration,
  onDurationChange,
  onGenerate,
  onReconfigure,
  loading,
  needKey,
  error,
  kit,
  saving,
  saved,
  onSave,
  onRetry,
}: PanelProps) {
  const selected = DURATIONS.find((d) => d.seconds === duration) ?? DURATIONS[1];
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />

          {/* Slide-out panel */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed top-0 right-0 z-50 h-full w-full sm:w-[480px] flex flex-col bg-[#0c0c10]/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl"
          >
            {/* Header */}
            <div className="shrink-0 px-6 py-5 border-b border-white/10 bg-gradient-to-r from-purple-600/10 to-cyan-500/10">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">✨</span>
                    <h3 className="text-base font-bold bg-gradient-to-r from-purple-200 to-cyan-200 bg-clip-text text-transparent">
                      AI Content Kit
                    </h3>
                    {score > 0 && (
                      <span className="text-[10px] font-bold text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-full px-2 py-0.5">
                        {score}/100
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/60 truncate" title={topic}>
                    {topic}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="shrink-0 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white transition-colors flex items-center justify-center"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {/* Setup — pick script length before generating */}
              {!started && (
                <div className="flex flex-col py-4">
                  <SectionTitle icon="⏱️">Video Duration</SectionTitle>
                  <p className="text-white/50 text-sm mb-4">
                    Pick a length — the script will be written to match it.
                  </p>
                  <div className="flex flex-col gap-2 mb-7">
                    {DURATIONS.map((d) => {
                      const active = d.seconds === duration;
                      return (
                        <motion.button
                          key={d.seconds}
                          onClick={() => onDurationChange(d.seconds)}
                          whileTap={{ scale: 0.99 }}
                          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                            active
                              ? "border-purple-500/50 bg-gradient-to-r from-purple-600/20 to-cyan-500/15"
                              : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <span
                              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                active ? "border-purple-400" : "border-white/20"
                              }`}
                            >
                              {active && <span className="w-2 h-2 rounded-full bg-purple-400" />}
                            </span>
                            <span className="text-sm font-medium text-white/90">{d.label}</span>
                          </span>
                          <span className="flex items-center gap-2 text-[11px]">
                            <span className="text-white/40">~{d.words} words</span>
                            <span
                              className={`px-2 py-0.5 rounded-full border ${
                                d.format === "short-form"
                                  ? "text-rose-300 border-rose-400/20 bg-rose-400/10"
                                  : "text-cyan-300 border-cyan-400/20 bg-cyan-400/10"
                              }`}
                            >
                              {d.format}
                            </span>
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                  <motion.button
                    onClick={onGenerate}
                    whileHover={{ scale: 1.01, boxShadow: "0 0 26px -8px rgba(124,58,237,0.7)" }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-600 to-cyan-500"
                  >
                    ✨ Generate Content Kit
                  </motion.button>
                </div>
              )}

              {started && loading && <KitSkeleton />}

              {started && !loading && needKey && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="text-5xl mb-4">🔑</div>
                  <h4 className="text-base font-semibold mb-2">Groq key required</h4>
                  <p className="text-white/50 text-sm max-w-xs mb-6">
                    Add your free Groq API key in Settings to unlock AI Content Kits
                  </p>
                  <a
                    href="/settings"
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-cyan-500"
                  >
                    ⚙️ Open Settings
                  </a>
                </div>
              )}

              {started && !loading && !needKey && error && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="text-5xl mb-4">⚠️</div>
                  <h4 className="text-base font-semibold mb-2">Generation failed</h4>
                  <p className="text-red-400/80 text-sm max-w-xs mb-6">{error}</p>
                  <button
                    onClick={onRetry}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    ↻ Try again
                  </button>
                </div>
              )}

              {started && !loading && !needKey && !error && kit && (
                <div className="flex flex-col gap-7">
                  {/* Full video script */}
                  {kit.script && (() => {
                    const words = countWords(kit.script);
                    return (
                      <section>
                        <div className="flex items-center justify-between mb-3">
                          <SectionTitle icon="🎥">Full Video Script</SectionTitle>
                          <CopyBtn text={kit.script} />
                        </div>
                        <div className="rounded-xl p-px bg-gradient-to-br from-purple-500/40 via-white/5 to-cyan-500/30">
                          <div className="rounded-xl bg-[#0c0c10]/80 p-4">
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              <span className="text-[11px] px-2 py-0.5 rounded-full border border-purple-400/20 bg-purple-400/10 text-purple-300">
                                {selected.label}
                              </span>
                              <span className="text-[11px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/60">
                                {words} words
                                <span className="text-white/30"> / ~{selected.words} target</span>
                              </span>
                            </div>
                            <ScriptBody script={kit.script} />
                            <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-1.5 text-[11px] text-white/40">
                              <span>⏱️</span>
                              <span>Est. read time {readTime(words)}</span>
                            </div>
                          </div>
                        </div>
                      </section>
                    );
                  })()}

                  {/* Why trending */}
                  <section>
                    <SectionTitle icon="📈">Why It&apos;s Trending</SectionTitle>
                    <div className="group relative rounded-xl bg-white/[0.03] border border-white/5 p-4">
                      <p className="text-sm text-white/80 leading-relaxed pr-2">{kit.why_trending}</p>
                      <div className="mt-3 flex justify-end">
                        <CopyBtn text={kit.why_trending} />
                      </div>
                    </div>
                  </section>

                  {/* Quick facts */}
                  <section className="grid grid-cols-1 gap-3">
                    <div className="rounded-xl bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/15 p-4">
                      <SectionTitle icon="🎬">Best Format</SectionTitle>
                      <div className="flex items-start gap-3">
                        <p className="flex-1 text-sm text-white/85 leading-snug">{kit.best_format}</p>
                        <CopyBtn text={kit.best_format} />
                      </div>
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/15 p-4">
                      <SectionTitle icon="⏳">Catch Window</SectionTitle>
                      <div className="flex items-start gap-3">
                        <p className="flex-1 text-sm text-white/85 leading-snug">{kit.catch_window}</p>
                        <CopyBtn text={kit.catch_window} />
                      </div>
                    </div>
                  </section>

                  {/* Titles */}
                  <section>
                    <SectionTitle icon="🏆">Viral Titles</SectionTitle>
                    <ItemList items={kit.titles} />
                  </section>

                  {/* Hooks */}
                  <section>
                    <SectionTitle icon="🪝">Opening Hooks</SectionTitle>
                    <ItemList items={kit.hooks} />
                  </section>

                  {/* Thumbnail ideas */}
                  <section>
                    <SectionTitle icon="🖼️">Thumbnail Ideas</SectionTitle>
                    <ItemList items={kit.thumbnail_ideas} />
                  </section>

                  {/* Content angles */}
                  <section>
                    <SectionTitle icon="🎯">Content Angles</SectionTitle>
                    <ItemList items={kit.content_angles} />
                  </section>

                  {/* Virality tips */}
                  <section>
                    <SectionTitle icon="🚀">Virality Tips</SectionTitle>
                    <ItemList items={kit.virality_tips} />
                  </section>

                  {/* Multi-platform repurposing */}
                  <section>
                    <SectionTitle icon="🌐">Multi-Platform Kit</SectionTitle>
                    <p className="text-xs text-white/40 -mt-1 mb-3">
                      Repurpose this trend with content tailored to each platform.
                    </p>
                    <MultiPlatformSection key={topic} topic={topic} niche={niche} score={score} />
                  </section>
                </div>
              )}
            </div>

            {/* Footer — Save Report */}
            {started && !loading && !needKey && !error && kit && (
              <div className="shrink-0 px-6 py-4 border-t border-white/10 bg-[#0c0c10]/80 flex gap-3">
                <motion.button
                  onClick={onReconfigure}
                  whileTap={{ scale: 0.98 }}
                  title="Pick a different length and regenerate"
                  className="shrink-0 px-4 py-3 rounded-xl font-medium bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 hover:text-white transition"
                >
                  ⏱️ Length
                </motion.button>
                <motion.button
                  onClick={onSave}
                  disabled={saving || saved}
                  whileHover={{ scale: saving || saved ? 1 : 1.01 }}
                  whileTap={{ scale: saving || saved ? 1 : 0.99 }}
                  className="flex-1 py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-600 to-cyan-500 disabled:opacity-60 transition"
                >
                  {saving ? "Saving…" : saved ? "✅ Report Saved" : "💾 Save Report"}
                </motion.button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
