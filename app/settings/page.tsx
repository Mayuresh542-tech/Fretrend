"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuthGate } from "../lib/useAuthGate";
import { supabase } from "../lib/supabase";
import {
  BRAND_VOICES,
  CUSTOM_VOICE,
  CUSTOM_VOICE_ID,
  DEFAULT_BRAND_VOICE,
} from "../lib/brandVoice";
import Sidebar from "../components/Sidebar";
import AnimatedBackground from "../components/AnimatedBackground";
import AuthLoadingScreen from "../components/AuthLoadingScreen";

export default function Settings() {
  const router = useRouter();
  const [groqKey, setGroqKey] = useState("");
  const [showGroq, setShowGroq] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [loading, setLoading] = useState(true);

  // --- Brand Voice ---
  const [voice, setVoice] = useState<string>(DEFAULT_BRAND_VOICE);
  const [customVoice, setCustomVoice] = useState("");
  const [voiceSaving, setVoiceSaving] = useState(false);
  const [voiceSaved, setVoiceSaved] = useState(false);
  const [voiceError, setVoiceError] = useState("");

  const { status, session } = useAuthGate();

  // Protected page: redirect logged-out visitors once the gate resolves.
  useEffect(() => {
    if (status === "unauthed") router.replace("/login");
  }, [status, router]);

  // Load the existing key once authed so saving never overwrites with an empty
  // string. The key is decrypted server-side; the access token identifies the user.
  const loadedRef = useRef(false);
  useEffect(() => {
    if (status !== "authed" || !session || loadedRef.current) return;
    loadedRef.current = true;
    (async () => {
      try {
        const res = await fetch("/api/keys", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setGroqKey(data.groqKey ?? "");
        }
      } catch {
        /* leave the field blank on load failure */
      }

      // Brand Voice lives in the (RLS-protected) profiles row — read it directly.
      // Any failure (columns not yet migrated) just leaves the Balanced default.
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("brand_voice, brand_voice_custom")
          .eq("id", session.user.id)
          .maybeSingle();
        if (profile) {
          setVoice(profile.brand_voice ?? DEFAULT_BRAND_VOICE);
          setCustomVoice(profile.brand_voice_custom ?? "");
        }
      } catch {
        /* keep the Balanced default on load failure */
      }

      setLoading(false);
    })();
  }, [status, session]);

  async function saveKeys() {
    if (!session) return;
    setSaving(true);
    setSaveError("");

    // The key is AES-encrypted on the server before it's written to Supabase.
    const res = await fetch("/api/keys", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ groqKey: groqKey.trim() }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setSaveError(data.error ?? "Failed to save key.");
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  // Persist the chosen Brand Voice to the user's profile row. Upsert (rather than
  // update) so it still works if the row somehow doesn't exist yet; only the voice
  // columns are written, so onboarding_completed is left untouched.
  async function saveVoice() {
    if (!session) return;
    setVoiceSaving(true);
    setVoiceError("");

    const { error } = await supabase.from("profiles").upsert(
      {
        id: session.user.id,
        brand_voice: voice,
        brand_voice_custom: voice === CUSTOM_VOICE_ID ? customVoice.trim() : "",
      },
      { onConflict: "id" },
    );

    setVoiceSaving(false);

    if (error) {
      setVoiceError(
        error.message.includes("brand_voice")
          ? "Brand Voice columns missing. Run migration 0009_profiles_brand_voice.sql in Supabase."
          : error.message,
      );
      return;
    }

    setVoiceSaved(true);
    setTimeout(() => setVoiceSaved(false), 3000);
  }

  if (status !== "authed") {
    return <AuthLoadingScreen label={status === "loading" ? "Loading your session…" : "Redirecting…"} />;
  }

  return (
    <main className="relative min-h-screen text-white flex">
      <AnimatedBackground />
      <Sidebar active="settings" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="lg:ml-64 flex-1 p-4 pt-20 lg:p-8 relative z-10"
      >
        <div className="mb-8">
          <motion.h2
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent"
            style={{ backgroundSize: "200% auto" }}
          >
            Settings
          </motion.h2>
          <p className="text-white/50 text-sm mt-1">
            Add your API key — you pay providers directly, we charge nothing extra
          </p>
        </div>

        <div className="mb-6 bg-purple-600/10 border border-purple-500/20 rounded-2xl p-4">
          <p className="text-purple-400 text-sm">
            💡 Add a Groq key (free &amp; fast) to power AI trend analysis
          </p>
        </div>

        {loading ? (
          <div className="max-w-2xl flex flex-col gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 animate-pulse h-28" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl flex flex-col gap-4"
          >
            <div className="rounded-2xl p-px bg-gradient-to-br from-purple-500/30 via-white/5 to-cyan-500/25">
              <div className="rounded-2xl bg-[#0c0c10]/85 backdrop-blur-xl p-6">
                <h3 className="text-lg font-semibold mb-1">⚡ Groq API Key</h3>
                <p className="text-white/40 text-sm mb-4">Fast AI analysis — free tier available</p>
                <div className="relative">
                  <input
                    type={showGroq ? "text" : "password"}
                    placeholder="gsk_..."
                    value={groqKey}
                    onChange={(e) => setGroqKey(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500 transition"
                  />
                  <button
                    onClick={() => setShowGroq((s) => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-sm"
                  >
                    {showGroq ? "Hide" : "Show"}
                  </button>
                </div>
                <p className="flex items-start gap-2 text-white/40 text-xs mt-3">
                  <span aria-hidden>🔒</span>
                  <span>
                    Your API key is encrypted and stored securely. We never use your key
                    for anything other than generating your content.
                  </span>
                </p>
              </div>
            </div>

            {saveError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-red-400 text-sm font-mono">{saveError}</p>
              </div>
            )}

            <motion.button
              onClick={saveKeys}
              disabled={saving}
              whileHover={{ scale: 1.01, boxShadow: "0 0 26px -8px rgba(124,58,237,0.7)" }}
              whileTap={{ scale: 0.99 }}
              className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-600 to-cyan-500 transition disabled:opacity-50"
            >
              {saving ? "Saving..." : saved ? "✅ Saved!" : "Save API Key"}
            </motion.button>
          </motion.div>
        )}

        {/* Brand Voice — sets the tone the AI matches across every content kit */}
        {!loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl flex flex-col gap-4 mt-8"
          >
            <div className="rounded-2xl p-px bg-gradient-to-br from-purple-500/30 via-white/5 to-cyan-500/25">
              <div className="rounded-2xl bg-[#0c0c10]/85 backdrop-blur-xl p-6">
                <h3 className="text-lg font-semibold mb-1">🎙️ Brand Voice</h3>
                <p className="text-white/40 text-sm mb-5">
                  Pick the tone &amp; personality the AI matches in every title, hook, and script.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[...BRAND_VOICES, CUSTOM_VOICE].map((v, i) => {
                    const active = voice === v.id;
                    return (
                      <motion.button
                        key={v.id}
                        onClick={() => setVoice(v.id)}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 * i, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        whileHover={{ scale: 1.03, y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        className={`relative flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${
                          active
                            ? `bg-gradient-to-br ${v.gradient} ${v.ring}`
                            : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20"
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="voice-check"
                            className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-[11px] font-bold text-[#0c0c10]"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                          >
                            ✓
                          </motion.span>
                        )}
                        <span className="text-xl">{v.icon}</span>
                        <span className="text-sm font-semibold text-white/90">{v.label}</span>
                        <span className="text-[11px] leading-snug text-white/40">{v.description}</span>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Free-text description for the Custom voice */}
                <AnimatePresence initial={false}>
                  {voice === CUSTOM_VOICE_ID && (
                    <motion.div
                      key="custom-field"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4">
                        <label className="block text-xs font-medium text-white/50 mb-2">
                          Describe your voice
                        </label>
                        <textarea
                          value={customVoice}
                          onChange={(e) => setCustomVoice(e.target.value)}
                          rows={3}
                          maxLength={400}
                          placeholder="e.g. sarcastic and Gen-Z with lots of slang, never takes itself too seriously"
                          className="w-full resize-none px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:border-purple-500 transition"
                        />
                        <p className="text-[11px] text-white/30 mt-1.5">
                          {customVoice.length}/400 — the AI writes everything in this voice.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {voiceError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-red-400 text-sm font-mono">{voiceError}</p>
              </div>
            )}

            <motion.button
              onClick={saveVoice}
              disabled={voiceSaving || (voice === CUSTOM_VOICE_ID && !customVoice.trim())}
              whileHover={{ scale: 1.01, boxShadow: "0 0 26px -8px rgba(124,58,237,0.7)" }}
              whileTap={{ scale: 0.99 }}
              className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-600 to-cyan-500 transition disabled:opacity-50"
            >
              {voiceSaving ? "Saving..." : voiceSaved ? "✅ Voice Saved!" : "Save Brand Voice"}
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </main>
  );
}
