"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/Sidebar";
import AnimatedBackground from "../components/AnimatedBackground";

const TYPES = ["New Feature", "Bug Report", "Improvement", "Other"] as const;
type SuggestionType = (typeof TYPES)[number];

const TYPE_ICON: Record<SuggestionType, string> = {
  "New Feature": "✨",
  "Bug Report": "🐞",
  Improvement: "📈",
  Other: "💬",
};

export default function Suggestions() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState<SuggestionType>("New Feature");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    if (!message.trim()) {
      setError("Please enter your suggestion before submitting.");
      return;
    }

    setSubmitting(true);
    const { error: insertError } = await supabase.from("suggestions").insert({
      name: name.trim() || null,
      email: email.trim() || null,
      type,
      message: message.trim(),
    });
    setSubmitting(false);

    if (insertError) {
      setError(
        insertError.message.includes("suggestions")
          ? "Suggestions table missing. Run migration 0003_suggestions.sql in Supabase."
          : insertError.message,
      );
      return;
    }

    setSubmitted(true);
  }

  function reset() {
    setName("");
    setEmail("");
    setType("New Feature");
    setMessage("");
    setSubmitted(false);
    setError("");
  }

  return (
    <main className="relative min-h-screen text-white flex">
      <AnimatedBackground />
      <Sidebar active="suggestions" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="lg:ml-64 flex-1 p-4 pt-20 lg:p-8 relative z-10"
      >
        <div className="max-w-2xl mx-auto">
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
              Suggestions &amp; Feedback
            </motion.h2>
            <p className="text-white/50 text-sm mt-1">
              Help shape Fretrend — every idea, bug, and nudge is read 💜
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {submitted ? (
              /* Thank-you state */
              <motion.div
                key="thanks"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="relative rounded-2xl p-px bg-gradient-to-br from-purple-500/40 via-white/5 to-cyan-500/30"
              >
                <div className="rounded-2xl bg-[#0c0c10]/85 backdrop-blur-xl p-10 text-center">
                  <motion.div
                    className="text-6xl mb-4"
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
                  >
                    🎉
                  </motion.div>
                  <h3 className="text-xl font-bold mb-2">Thank you!</h3>
                  <p className="text-white/60 text-sm max-w-sm mx-auto mb-6">
                    Your {TYPE_ICON[type]} {type.toLowerCase()} has been received. We genuinely read
                    every submission — thanks for helping make Fretrend better.
                  </p>
                  <button
                    onClick={reset}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-cyan-500"
                  >
                    Submit another
                  </button>
                </div>
              </motion.div>
            ) : (
              /* Form */
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="relative rounded-2xl p-px bg-gradient-to-br from-purple-500/30 via-white/5 to-cyan-500/25"
              >
                <div className="rounded-2xl bg-[#0c0c10]/85 backdrop-blur-xl p-6 flex flex-col gap-5">
                  {/* Name + Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-white/60 mb-1.5">
                        Name <span className="text-white/30">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/60 mb-1.5">
                        Email <span className="text-white/30">(optional)</span>
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500 transition"
                      />
                    </div>
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-sm text-white/60 mb-1.5">Suggestion type</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {TYPES.map((t) => {
                        const active = t === type;
                        return (
                          <motion.button
                            key={t}
                            type="button"
                            onClick={() => setType(t)}
                            whileTap={{ scale: 0.97 }}
                            className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-colors ${
                              active
                                ? "border-purple-500/50 bg-gradient-to-r from-purple-600/25 to-cyan-500/15 text-white"
                                : "border-white/10 bg-white/[0.03] text-white/50 hover:text-white hover:bg-white/[0.06]"
                            }`}
                          >
                            <span className="block text-base mb-0.5">{TYPE_ICON[t]}</span>
                            {t}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm text-white/60 mb-1.5">
                      Your suggestion <span className="text-purple-400">*</span>
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={6}
                      placeholder="Tell us what's on your mind — a feature you'd love, a bug you hit, anything…"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500 transition resize-none"
                    />
                  </div>

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                      <p className="text-red-400 text-sm">{error}</p>
                    </div>
                  )}

                  <motion.button
                    onClick={submit}
                    disabled={submitting}
                    whileHover={{ scale: submitting ? 1 : 1.01, boxShadow: "0 0 26px -8px rgba(124,58,237,0.7)" }}
                    whileTap={{ scale: submitting ? 1 : 0.99 }}
                    className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-600 to-cyan-500 disabled:opacity-50 transition"
                  >
                    {submitting ? "Sending…" : "🚀 Submit Suggestion"}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </main>
  );
}
