"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthGate } from "../lib/useAuthGate";
import { supabase } from "../lib/supabase";
import {
  BRAND_VOICES,
  CUSTOM_VOICE,
  CUSTOM_VOICE_ID,
  DEFAULT_BRAND_VOICE,
  buildVoiceInstruction,
} from "../lib/brandVoice";
import StudioShell from "../components/StudioShell";
import AuthLoadingScreen from "../components/AuthLoadingScreen";

type SettingsTab = "profile" | "voice" | "keys" | "preferences" | "security";

export default function Settings() {
  const router = useRouter();
  const { status, session } = useAuthGate();

  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [loading, setLoading] = useState(true);

  // API Keys state
  const [youtubeKey, setYoutubeKey] = useState("");
  const [showYoutube, setShowYoutube] = useState(false);
  const [savingKeys, setSavingKeys] = useState(false);
  const [keysSaved, setKeysSaved] = useState(false);
  const [keysError, setKeysError] = useState("");

  // Brand Voice state
  const [voice, setVoice] = useState<string>(DEFAULT_BRAND_VOICE);
  const [customVoice, setCustomVoice] = useState("");
  const [savingVoice, setSavingVoice] = useState(false);
  const [voiceSaved, setVoiceSaved] = useState(false);
  const [voiceError, setVoiceError] = useState("");

  // Preferences state
  const [defaultDuration, setDefaultDuration] = useState("60");
  const [defaultPlatform, setDefaultPlatform] = useState("youtube");
  const [prefSaved, setPrefSaved] = useState(false);

  // Security state
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (status === "unauthed") router.replace("/login");
  }, [status, router]);

  const loadedRef = useRef(false);
  useEffect(() => {
    if (status !== "authed" || !session || loadedRef.current) return;
    loadedRef.current = true;

    (async () => {
      try {
        // Load API Keys
        const res = await fetch("/api/keys", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setYoutubeKey(data.youtubeApiKey ?? "");
        }
      } catch {
        // ignore
      }

      try {
        // Load Brand Voice
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
        // ignore
      }

      // Load preferences from localStorage
      if (typeof window !== "undefined") {
        const storedDur = localStorage.getItem("fretrend_pref_duration");
        if (storedDur) setDefaultDuration(storedDur);
        const storedPlat = localStorage.getItem("fretrend_pref_platform");
        if (storedPlat) setDefaultPlatform(storedPlat);
      }

      setLoading(false);
    })();
  }, [status, session]);

  async function saveKeys() {
    if (!session) return;
    setSavingKeys(true);
    setKeysError("");

    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          youtubeApiKey: youtubeKey.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to save API keys");
      }

      setKeysSaved(true);
      setTimeout(() => setKeysSaved(false), 3000);
    } catch (err) {
      setKeysError(err instanceof Error ? err.message : "Failed to encrypt and store credentials.");
    } finally {
      setSavingKeys(false);
    }
  }

  async function saveVoice() {
    if (!session) return;
    setSavingVoice(true);
    setVoiceError("");

    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: session.user.id,
          brand_voice: voice,
          brand_voice_custom: voice === CUSTOM_VOICE_ID ? customVoice.trim() : null,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      setVoiceSaved(true);
      setTimeout(() => setVoiceSaved(false), 3000);
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : "Failed to save brand voice.");
    } finally {
      setSavingVoice(false);
    }
  }

  function savePreferences() {
    if (typeof window !== "undefined") {
      localStorage.setItem("fretrend_pref_duration", defaultDuration);
      localStorage.setItem("fretrend_pref_platform", defaultPlatform);
      setPrefSaved(true);
      setTimeout(() => setPrefSaved(false), 2500);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      router.replace("/login");
    } catch {
      setLoggingOut(false);
    }
  }

  if (status !== "authed" || loading) {
    return <AuthLoadingScreen label="Loading settings…" />;
  }

  const activeInstruction = buildVoiceInstruction(voice, customVoice);

  return (
    <StudioShell active="settings">
      <div className="max-w-5xl mx-auto w-full space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1A2030] pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-sky-500/10 border border-sky-500/20 text-sky-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                Workspace Calibration
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Workspace Settings
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">
              Manage your creator credentials, API keys, brand voice directives, and subscription.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/settings/billing"
              className="px-3.5 py-2 rounded-lg text-xs font-medium bg-[#11141E] hover:bg-[#161B28] border border-[#202738] text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <span>💳</span>
              <span>Billing &amp; Usage</span>
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 border-b border-[#1A2030] pb-3 overflow-x-auto scrollbar-none">
          {[
            { id: "profile" as SettingsTab, label: "Profile", icon: "👤" },
            { id: "voice" as SettingsTab, label: "Brand Voice Studio", icon: "🎭" },
            { id: "keys" as SettingsTab, label: "API Credentials", icon: "🔐" },
            { id: "preferences" as SettingsTab, label: "Preferences", icon: "⚡" },
            { id: "security" as SettingsTab, label: "Security & Sessions", icon: "🛡️" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-sky-500/15 border border-sky-500/30 text-sky-300 font-semibold"
                    : "text-slate-400 hover:text-white hover:bg-[#11141E] border border-transparent"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: Profile */}
        {activeTab === "profile" && (
          <div className="space-y-6">
            <div className="p-6 sm:p-8 rounded-2xl bg-[#0D0F15] border border-[#202534] relative overflow-hidden shadow-[0_16px_50px_rgba(0,0,0,0.5)]">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white font-heading">Creator Identity</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Your authenticated creator credentials and tier status.</p>
                </div>
                <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-sky-500/10 text-sky-300 border border-sky-500/30 shadow-[0_0_12px_rgba(14,165,233,0.2)]">
                  ACTIVE SESSION
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-[#12151E] border border-[#202534]">
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-500 block mb-1">
                    Authenticated Email
                  </span>
                  <span className="text-sm font-semibold text-white font-mono">{session?.user.email}</span>
                </div>

                <div className="p-4 rounded-xl bg-[#12151E] border border-[#202534]">
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-500 block mb-1">
                    Account ID
                  </span>
                  <span className="text-xs font-mono text-slate-300 truncate block">{session?.user.id}</span>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-sky-500/5 border border-sky-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-sky-300">Community Lifetime Access</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                  </div>
                  <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                    Veelox is a creator-first platform. You have access to trend intelligence, AI video creation studio, multi-track timeline editing, and MP4 rendering.
                  </p>
                </div>
                <span className="px-3 py-1.5 rounded-full bg-sky-500/10 text-sky-300 text-xs font-bold font-mono whitespace-nowrap border border-sky-500/30">
                  CREATOR TIER
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Brand Voice Studio */}
        {activeTab === "voice" && (
          <div className="p-6 sm:p-8 rounded-2xl bg-[#0D0F15] border border-[#202534] space-y-6 shadow-[0_16px_50px_rgba(0,0,0,0.5)]">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white font-heading">Brand Voice Calibration</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Defines the tonal signature injected into Gemini AI system prompts so generated scripts match your personality.
                  </p>
                </div>
                <span className="text-[10px] font-mono uppercase px-3 py-1 rounded-full bg-[#12151E] border border-[#202534] text-sky-300 font-semibold">
                  7 VOICES AVAILABLE
                </span>
              </div>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {BRAND_VOICES.map((b) => {
                const isSelected = voice === b.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => setVoice(b.id)}
                    className={`p-4 rounded-xl text-left border transition-all flex flex-col justify-between group cursor-pointer ${
                      isSelected
                        ? "border-sky-500 bg-sky-500/10 shadow-[0_0_24px_rgba(14,165,233,0.25)]"
                        : "border-[#202534] bg-[#12151E] hover:bg-[#161A26] hover:border-[#2A3144]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl group-hover:scale-110 transition-transform">{b.icon}</span>
                      <span
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected ? "border-sky-400 bg-sky-500/20" : "border-slate-600"
                        }`}
                      >
                        {isSelected && <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(14,165,233,0.8)]" />}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block group-hover:text-sky-300 transition-colors">{b.label}</span>
                      <span className="text-[11px] text-slate-400 block mt-0.5 leading-snug">{b.description}</span>
                    </div>
                  </button>
                );
              })}

              {/* Custom Voice Card */}
              <button
                onClick={() => setVoice(CUSTOM_VOICE_ID)}
                className={`p-4 rounded-xl text-left border transition-all flex flex-col justify-between group cursor-pointer ${
                  voice === CUSTOM_VOICE_ID
                    ? "border-sky-500 bg-sky-500/10 shadow-[0_0_24px_rgba(14,165,233,0.25)]"
                    : "border-[#202534] bg-[#12151E] hover:bg-[#161A26] hover:border-[#2A3144]"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl group-hover:scale-110 transition-transform">{CUSTOM_VOICE.icon}</span>
                  <span
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                      voice === CUSTOM_VOICE_ID ? "border-sky-400 bg-sky-500/20" : "border-slate-600"
                    }`}
                  >
                    {voice === CUSTOM_VOICE_ID && <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(14,165,233,0.8)]" />}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-bold text-white block group-hover:text-sky-300 transition-colors">{CUSTOM_VOICE.label}</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5 leading-snug">{CUSTOM_VOICE.description}</span>
                </div>
              </button>
            </div>

            {/* Custom Voice Input */}
            {voice === CUSTOM_VOICE_ID && (
              <div className="p-4 rounded-xl bg-[#12151E] border border-sky-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-sky-300 block">
                    Describe your custom tone &amp; stylistic directives:
                  </label>
                  <span className="text-[10px] font-mono text-slate-500">{customVoice.length} characters</span>
                </div>
                <textarea
                  value={customVoice}
                  onChange={(e) => setCustomVoice(e.target.value)}
                  rows={3}
                  placeholder="e.g. Fast-paced tech explainer with sarcastic humor, short punchy analogies, zero buzzwords, and high technical authority."
                  className="w-full p-3 bg-[#08090C] border border-[#202534] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/70 focus:shadow-[0_0_16px_rgba(14,165,233,0.2)] transition resize-none leading-relaxed font-sans"
                />
              </div>
            )}

            {/* Active Voice Preview */}
            <div className="p-4 rounded-xl bg-[#12151E] border border-[#202534]">
              <span className="text-[10px] uppercase font-mono font-bold text-slate-500 block mb-1">
                Active System Prompt Directive:
              </span>
              <p className="text-xs text-sky-300 font-mono leading-relaxed break-words">
                &ldquo;{activeInstruction}&rdquo;
              </p>
            </div>

            {voiceError && <p className="text-xs text-rose-400 font-mono">{voiceError}</p>}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={saveVoice}
                disabled={savingVoice}
                className="px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider bg-white hover:bg-slate-100 text-zinc-950 shadow-[0_0_24px_rgba(255,255,255,0.25)] transition disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {savingVoice ? "Saving Calibration…" : voiceSaved ? "Tone Calibrated ✓" : "Save Brand Voice"}
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: API Keys */}
        {activeTab === "keys" && (
          <div className="p-6 sm:p-8 rounded-2xl bg-[#0D0F15] border border-[#202534] space-y-6 shadow-[0_16px_50px_rgba(0,0,0,0.5)]">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <h2 className="text-lg font-bold text-white font-heading">Encrypted API Credentials</h2>
                <span className="text-[10px] font-mono font-bold px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 flex items-center gap-1.5 shadow-[0_0_12px_rgba(14,165,233,0.2)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                  AES-256-GCM Hardware Encrypted
                </span>
              </div>
              <p className="text-xs text-slate-400 max-w-xl">
                Keys are authenticated and encrypted at rest with server-side envelope encryption. Plaintext is never stored or exposed.
              </p>
            </div>

            {/* Veelox AI Engine Status */}
            <div className="space-y-2 p-4 sm:p-5 rounded-xl bg-[#12151E] border border-[#202534]">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>✨</span>
                  <span>Veelox AI Engine</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/30">
                    Google Gemini 2.0
                  </span>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active & Managed
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Powers automated Content Kit synthesis, viral hooks, thumbnail concepts, scripts, and multi-platform repurposing. Fully configured on the server — no user API key required.
              </p>
            </div>

            {/* YouTube Key Input */}
            <div className="space-y-2 p-4 sm:p-5 rounded-xl bg-[#12151E] border border-[#202534]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white flex items-center gap-2">
                  <span>▶️</span>
                  <span>YouTube Data API v3 Key</span>
                  <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-[#0D0F15] text-slate-400 border border-[#202534]">
                    Optional
                  </span>
                </label>
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-sky-400 hover:text-sky-300 hover:underline font-mono flex items-center gap-1"
                >
                  Google Cloud Console ↗
                </a>
              </div>
              <div className="relative">
                <input
                  type={showYoutube ? "text" : "password"}
                  value={youtubeKey}
                  onChange={(e) => setYoutubeKey(e.target.value)}
                  placeholder="AIzaSy••••••••••••••••••••••••••••••••"
                  className="w-full px-4 py-2.5 bg-[#08090C] border border-[#202534] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/70 focus:shadow-[0_0_16px_rgba(14,165,233,0.2)] font-mono tracking-wider transition"
                />
                <button
                  type="button"
                  onClick={() => setShowYoutube(!showYoutube)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded bg-[#12151E] cursor-pointer"
                >
                  {showYoutube ? "Hide" : "Show"}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Enables YouTube competitor analysis, live channel telemetry, and view count benchmark feeds.
              </p>
            </div>

            {keysError && <p className="text-xs text-rose-400 font-mono">{keysError}</p>}

            <div className="pt-2">
              <button
                onClick={saveKeys}
                disabled={savingKeys}
                className="px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider bg-white hover:bg-slate-100 text-zinc-950 shadow-[0_0_24px_rgba(255,255,255,0.25)] transition disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {savingKeys ? "Encrypting with AES-256-GCM…" : keysSaved ? "Stored Safely ✓" : "Save Encrypted Credentials"}
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: Preferences */}
        {activeTab === "preferences" && (
          <div className="p-6 sm:p-8 rounded-2xl bg-[#0D0F15] border border-[#202534] space-y-6 shadow-[0_16px_50px_rgba(0,0,0,0.5)]">
            <div>
              <h2 className="text-lg font-bold text-white font-heading">Studio Defaults</h2>
              <p className="text-xs text-slate-400 mt-0.5">Preset options for Content Kit generation workflows.</p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-white block">
                Default Target Script Length:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {[
                  { label: "30 Seconds", sub: "Shorts / Reels", val: "30" },
                  { label: "60 Seconds", sub: "TikTok / Shorts", val: "60" },
                  { label: "3 Minutes", sub: "Deep Dive", val: "180" },
                  { label: "5 Minutes", sub: "Mini Document", val: "300" },
                  { label: "10 Minutes", sub: "Long-Form YT", val: "600" },
                ].map((dur) => (
                  <button
                    key={dur.val}
                    onClick={() => setDefaultDuration(dur.val)}
                    className={`p-3.5 rounded-xl text-left border transition cursor-pointer ${
                      defaultDuration === dur.val
                        ? "bg-sky-500/10 border-sky-500/50 text-sky-300 font-bold shadow-[0_0_14px_rgba(14,165,233,0.2)]"
                        : "bg-[#12151E] border-[#202534] text-slate-400 hover:text-white hover:border-[#2A3144]"
                    }`}
                  >
                    <span className="text-xs font-bold block">{dur.label}</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">{dur.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-[#202534]">
              <label className="text-xs font-bold text-white block">
                Primary Platform Focus:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {[
                  { id: "youtube", label: "YouTube" },
                  { id: "tiktok", label: "TikTok" },
                  { id: "reels", label: "Instagram" },
                  { id: "x", label: "X / Twitter" },
                  { id: "linkedin", label: "LinkedIn" },
                ].map((plat) => (
                  <button
                    key={plat.id}
                    onClick={() => setDefaultPlatform(plat.id)}
                    className={`p-3 rounded-xl text-center text-xs font-semibold border transition cursor-pointer ${
                      defaultPlatform === plat.id
                        ? "bg-sky-500/10 border-sky-500/50 text-sky-300 font-bold shadow-[0_0_14px_rgba(14,165,233,0.2)]"
                        : "bg-[#12151E] border-[#202534] text-slate-400 hover:text-white hover:border-[#2A3144]"
                    }`}
                  >
                    {plat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-[#202534]">
              <button
                onClick={savePreferences}
                className="px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider bg-white hover:bg-slate-100 text-zinc-950 shadow-[0_0_24px_rgba(255,255,255,0.25)] transition cursor-pointer active:scale-95"
              >
                {prefSaved ? "Preferences Saved ✓" : "Save Preferences"}
              </button>
            </div>
          </div>
        )}

        {/* TAB 5: Security */}
        {activeTab === "security" && (
          <div className="p-6 sm:p-8 rounded-2xl bg-[#0D0F15] border border-[#202534] space-y-6 shadow-[0_16px_50px_rgba(0,0,0,0.5)]">
            <div>
              <h2 className="text-lg font-bold text-white font-heading">Security &amp; Session Management</h2>
              <p className="text-xs text-slate-400 mt-0.5">Control your authentication tokens, sessions, and data isolation.</p>
            </div>

            <div className="p-4 rounded-xl bg-[#12151E] border border-[#202534] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Cryptographic Isolation</span>
                <span className="text-[10px] font-mono text-sky-300 bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-500/30">
                  SECURE
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Row-Level Security (RLS) is enforced strictly on all tables (`saved_scripts`, `saved_niches`, `profiles`). Each user has a cryptographically isolated tenant envelope.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#12151E] border border-[#202534] space-y-2">
              <span className="text-xs font-bold text-white block">Session Token</span>
              <p className="text-xs font-mono text-slate-400 truncate">
                Bearer: {session?.access_token ? `${session.access_token.slice(0, 28)}••••••••••••` : "None"}
              </p>
            </div>

            <div className="pt-4 border-t border-[#202534] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Sign Out</span>
                <span className="text-[11px] text-slate-400">End current browser session and invalidate tokens.</span>
              </div>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {loggingOut ? "Signing Out…" : "Sign Out of Veelox"}
              </button>
            </div>
          </div>
        )}
      </div>
    </StudioShell>
  );
}
