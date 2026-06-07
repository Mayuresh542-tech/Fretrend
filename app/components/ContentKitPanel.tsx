"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

export default function ContentKitPanel({
  open,
  onClose,
  topic,
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
