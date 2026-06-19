"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useAuthGate } from "../lib/useAuthGate";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import AnimatedBackground from "../components/AnimatedBackground";
import AuthLoadingScreen from "../components/AuthLoadingScreen";
import type { ContentKit } from "../components/ContentKitPanel";

interface SavedKit {
  id: string;
  topic: string;
  niche: string | null;
  virality_score: number | null;
  kit: ContentKit;
  created_at: string;
}

/** Virality tier styling — mirrors the Trends page tiers. */
function viralityStyle(score: number) {
  if (score >= 80) return { label: "🔥 Hot", text: "text-rose-400", bar: "from-rose-500 to-orange-400", ring: "border-rose-500/30" };
  if (score >= 60) return { label: "📈 Rising", text: "text-orange-400", bar: "from-orange-400 to-amber-300", ring: "border-orange-500/30" };
  return { label: "🌱 Emerging", text: "text-emerald-400", bar: "from-emerald-500 to-teal-400", ring: "border-emerald-500/30" };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** Coerce a kit list item to text — models sometimes return objects. */
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

const SCRIPT_LABELS = ["HOOK:", "INTRO:", "MAIN CONTENT:", "CTA:"];

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

/** Small copy-to-clipboard button. `full` stretches it on mobile. */
function CopyBtn({ text, label = "Copy", full = false }: { text: string; label?: string; full?: boolean }) {
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
      className={`${full ? "w-full sm:w-auto text-center" : "shrink-0"} px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
        copied
          ? "text-emerald-300 border-emerald-400/30 bg-emerald-400/10"
          : "text-white/40 border-white/10 bg-white/5 hover:text-white hover:border-purple-500/40"
      }`}
    >
      {copied ? "✓ Copied" : label}
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

function ItemList({ items }: { items: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="flex flex-col gap-2">
      {items.map((raw, i) => {
        const item = toText(raw);
        return (
          <div
            key={i}
            className="group flex items-start gap-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-purple-500/25 p-3 transition-colors"
          >
            <span className="shrink-0 mt-0.5 w-5 h-5 rounded-md bg-purple-500/15 text-purple-300 text-[11px] font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <p className="flex-1 text-sm text-white/85 leading-snug">{item}</p>
            <CopyBtn text={item} />
          </div>
        );
      })}
    </div>
  );
}

/** The expandable detail body for one saved kit. */
function KitDetails({ kit }: { kit: ContentKit }) {
  return (
    <div className="flex flex-col gap-7 pt-5 mt-5 border-t border-white/10">
      {kit.script && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <SectionTitle icon="🎥">Full Video Script</SectionTitle>
            <CopyBtn text={kit.script} label="Copy script" />
          </div>
          <div className="rounded-xl p-px bg-gradient-to-br from-purple-500/40 via-white/5 to-cyan-500/30">
            <div className="rounded-xl bg-[#0c0c10]/80 p-4">
              <ScriptBody script={kit.script} />
            </div>
          </div>
        </section>
      )}

      {kit.why_trending && (
        <section>
          <SectionTitle icon="📈">Why It&apos;s Trending</SectionTitle>
          <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
            <p className="text-sm text-white/80 leading-relaxed">{kit.why_trending}</p>
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {kit.best_format && (
          <div className="rounded-xl bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/15 p-4">
            <SectionTitle icon="🎬">Best Format</SectionTitle>
            <p className="text-sm text-white/85 leading-snug">{kit.best_format}</p>
          </div>
        )}
        {kit.catch_window && (
          <div className="rounded-xl bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/15 p-4">
            <SectionTitle icon="⏳">Catch Window</SectionTitle>
            <p className="text-sm text-white/85 leading-snug">{kit.catch_window}</p>
          </div>
        )}
      </section>

      {kit.titles?.length > 0 && (
        <section>
          <SectionTitle icon="🏆">Viral Titles</SectionTitle>
          <ItemList items={kit.titles} />
        </section>
      )}
      {kit.hooks?.length > 0 && (
        <section>
          <SectionTitle icon="🪝">Opening Hooks</SectionTitle>
          <ItemList items={kit.hooks} />
        </section>
      )}
      {kit.thumbnail_ideas?.length > 0 && (
        <section>
          <SectionTitle icon="🖼️">Thumbnail Ideas</SectionTitle>
          <ItemList items={kit.thumbnail_ideas} />
        </section>
      )}
      {kit.content_angles?.length > 0 && (
        <section>
          <SectionTitle icon="🎯">Content Angles</SectionTitle>
          <ItemList items={kit.content_angles} />
        </section>
      )}
      {kit.virality_tips?.length > 0 && (
        <section>
          <SectionTitle icon="🚀">Virality Tips</SectionTitle>
          <ItemList items={kit.virality_tips} />
        </section>
      )}
    </div>
  );
}

function SavedCard({
  report,
  expanded,
  onToggle,
  onDelete,
  deleting,
}: {
  report: SavedKit;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const score = report.virality_score ?? 0;
  const vir = viralityStyle(score);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={`relative rounded-2xl border ${vir.ring} bg-white/[0.03] backdrop-blur-xl p-5 transition-colors`}
    >
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white leading-snug mb-2" title={report.topic}>
            {report.topic}
          </p>
          <div className="flex items-center flex-wrap gap-1.5 mb-3">
            {report.niche && (
              <span className="text-xs px-2 py-0.5 rounded-full border border-purple-400/20 bg-purple-400/10 text-purple-300">
                #{report.niche}
              </span>
            )}
            {report.virality_score != null && (
              <span className={`text-xs font-medium ${vir.text}`}>{vir.label}</span>
            )}
            <span className="text-xs px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/40">
              📅 {formatDate(report.created_at)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 max-w-xs rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className={`h-full rounded-full bg-gradient-to-r ${vir.bar}`}
                initial={{ width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center shrink-0 w-16">
          <span className="text-[10px] uppercase tracking-wider text-white/30 mb-0.5">Virality</span>
          <span className={`text-2xl font-extrabold ${vir.text}`}>{score}</span>
          <span className="text-[10px] text-white/20">/100</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex">
          {report.kit?.script && <CopyBtn text={report.kit.script} label="📋 Copy script" full />}
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <motion.button
            onClick={onToggle}
            whileTap={{ scale: 0.97 }}
            className="w-full sm:w-auto px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            {expanded ? "Hide details ▲" : "View details ▼"}
          </motion.button>
          <motion.button
            onClick={onDelete}
            disabled={deleting}
            whileTap={{ scale: 0.9 }}
            title="Delete saved report"
            className="w-full sm:w-auto px-3 py-1.5 rounded-lg text-xs font-medium border border-red-500/20 bg-red-500/5 text-red-400/80 hover:text-red-300 hover:bg-red-500/15 disabled:opacity-50 transition-colors"
          >
            {deleting ? "Deleting…" : "🗑 Delete"}
          </motion.button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="details"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <KitDetails kit={report.kit} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function SavedScripts() {
  const router = useRouter();
  const [reports, setReports] = useState<SavedKit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { status, session } = useAuthGate();

  // Redirect only once the gate has resolved and found no session.
  useEffect(() => {
    if (status === "unauthed") router.push("/login");
  }, [status, router]);

  // Load saved reports once we're authed. The loadedRef guard makes the body run
  // a single time. We deliberately do NOT cancel on cleanup: useAuthGate changes
  // the `session` object identity (it sets it from getSession() and again from
  // onAuthStateChange), and React Strict Mode re-invokes effects in dev — both
  // re-run this effect. A cleanup that aborted the one in-flight request would
  // leave `loading` stuck true forever, because the re-run is blocked by
  // loadedRef and never starts a replacement request.
  const loadedRef = useRef(false);
  useEffect(() => {
    if (status !== "authed" || !session || loadedRef.current) return;
    loadedRef.current = true;

    (async () => {
      const { data, error: fetchError } = await supabase
        .from("content_kits")
        .select("id, topic, niche, virality_score, kit, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (fetchError) {
        setError(
          fetchError.message.includes("content_kits")
            ? "Saved-reports table missing. Run migration 0002_content_kits.sql in Supabase."
            : fetchError.message,
        );
      } else {
        setReports((data as SavedKit[]) ?? []);
      }
      setLoading(false);
    })();
  }, [status, session]);

  async function deleteReport(id: string) {
    setDeletingId(id);
    const { error: delError } = await supabase.from("content_kits").delete().eq("id", id);
    setDeletingId(null);
    if (delError) {
      setError(delError.message);
      return;
    }
    setReports((prev) => prev.filter((r) => r.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  if (status !== "authed") {
    return <AuthLoadingScreen label={status === "loading" ? "Loading your session…" : "Redirecting…"} />;
  }

  return (
    <main className="relative min-h-screen text-white flex">
      <AnimatedBackground />
      <Sidebar active="saved" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="lg:ml-64 flex-1 p-4 pt-20 lg:p-8 relative z-10"
      >
        <div className="max-w-4xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mb-8"
          >
            <motion.h2
              className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent"
              style={{ backgroundSize: "200% auto" }}
              animate={{ backgroundPosition: ["0% center", "200% center"] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              Saved Scripts
            </motion.h2>
            <p className="text-white/50 text-sm mt-1">
              Every AI Content Kit you&apos;ve saved — scripts, hooks, titles &amp; more 🔖
            </p>
          </motion.div>

          {/* Loading skeleton */}
          {loading && (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 h-[140px]">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 }}
                  />
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
              <p className="text-red-400 font-semibold mb-1">Could not load saved scripts</p>
              <p className="text-white/40 text-sm">{error}</p>
            </motion.div>
          )}

          {/* Empty state */}
          {!loading && !error && reports.length === 0 && (
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
                🔖
              </motion.div>
              <h3 className="text-lg font-semibold mb-2">No saved scripts yet</h3>
              <p className="text-white/40 text-sm max-w-sm mb-6">
                Generate an AI Content Kit from any trend and hit <span className="text-white/70">Save Report</span> —
                it&apos;ll show up here for easy access.
              </p>
              <motion.a
                href="/trends"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-600 to-cyan-500"
              >
                🔥 Explore Trends
              </motion.a>
            </motion.div>
          )}

          {/* Reports */}
          {!loading && !error && reports.length > 0 && (
            <>
              <p className="text-white/40 text-sm mb-4">
                <span className="text-white/70 font-medium">{reports.length}</span> saved{" "}
                {reports.length === 1 ? "report" : "reports"}
              </p>
              <div className="flex flex-col gap-3">
                <AnimatePresence mode="popLayout">
                  {reports.map((report) => (
                    <SavedCard
                      key={report.id}
                      report={report}
                      expanded={expandedId === report.id}
                      onToggle={() => setExpandedId((cur) => (cur === report.id ? null : report.id))}
                      onDelete={() => deleteReport(report.id)}
                      deleting={deletingId === report.id}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </main>
  );
}
