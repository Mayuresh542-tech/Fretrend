"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useAuthGate } from "./lib/useAuthGate";

export default function Home() {
  const { status, session } = useAuthGate();
  const [activeWorkflowPhase, setActiveWorkflowPhase] = useState<"trend" | "kit" | "voice" | "video">("trend");
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const isAuthed = status === "authed" && !!session;

  const PIPELINE_PHASES = [
    { id: "trend", num: "01", label: "TREND RADAR", title: "Live Signal Surveillance" },
    { id: "kit", num: "02", label: "GEMINI CONTENT KIT", title: "Viral Hooks & Paced Script" },
    { id: "voice", num: "03", label: "VOICE & B-ROLL", title: "Ultra-Realistic Narration" },
    { id: "video", num: "04", label: "RENDERED VIDEO", title: "1080p MP4 Timeline" },
  ] as const;

  const TREND_EXAMPLES = [
    {
      title: "Autonomous AI Agents in 2026",
      source: "Google Trends",
      badge: "Breakout",
      score: 96,
      category: "Technology",
      summary: "Surging curiosity around standalone AI swarms replacing traditional SaaS dashboards.",
      angle: "Real-world test: Can agents run an e-commerce brand for 7 days?",
    },
    {
      title: "Next.js 16 Server Actions & Edge Video",
      source: "Hacker News",
      badge: "Velocity",
      score: 93,
      category: "Dev & Code",
      summary: "Massive debate on low-latency web streaming and server-side rendering pipelines.",
      angle: "Dissecting the top 3 architectural mistakes 90% of developers make.",
    },
    {
      title: "Solo Creator Video Workflows",
      source: "YouTube Search",
      badge: "Surge",
      score: 89,
      category: "Creator Economy",
      summary: "High retention demand for automated video editing pipelines over manual timelines.",
      angle: "How solo creators publish high-CTR videos with zero editors.",
    },
  ];

  const POPULAR_TEMPLATES = [
    {
      title: "Viral AI Tech Breakdown",
      ratio: "9:16 Shorts / Reels",
      category: "Tech & Innovation",
      image: "/images/dashboard/template_ai_robot.jpg",
      badge: "Curated",
      format: "9:16 Vertical",
    },
    {
      title: "Daily Motivation & Mindset",
      ratio: "9:16 Vertical Video",
      category: "Personal Growth",
      image: "/images/dashboard/template_daily_motivation.jpg",
      badge: "High Retention",
      format: "9:16 Vertical",
    },
    {
      title: "SaaS Product Review & Demo",
      ratio: "16:9 Long-Form",
      category: "Software & SaaS",
      image: "/images/dashboard/template_product_review.jpg",
      badge: "Showcase",
      format: "16:9 Widescreen",
    },
    {
      title: "Cinematic Travel & Vlog",
      ratio: "9:16 Vertical Story",
      category: "Lifestyle & Travel",
      image: "/images/dashboard/template_travel_vlog.jpg",
      badge: "Cinematic",
      format: "9:16 Vertical",
    },
  ];

  const FAQS = [
    {
      q: "How does Veelox find viral trends before they saturate?",
      a: "Veelox continuously monitors Google Trends, YouTube Search Velocity, Reddit discussions, and Hacker News. Our virality algorithm filters out noise, detects breakout inflection points, and scores topics from 1 to 100 before mainstream algorithmic saturation.",
    },
    {
      q: "What AI engine powers the Content Kit generation?",
      a: "Content Kits are powered by server-side Google Gemini models, producing high-CTR titles, 3-second visual hooks, contrarian angles, thumbnail visual directions, and complete spoken scripts formatted for exact video pacing.",
    },
    {
      q: "Do I need to be a video editor to produce videos on Veelox?",
      a: "Zero editing experience required. Veelox automates timeline composition, voiceover synthesis, stock asset matching from Pexels and Pixabay, and kinetic on-screen caption styling.",
    },
    {
      q: "Can I export videos to all social platforms?",
      a: "Yes. Veelox provides one-click repurposing kits formatted for YouTube, TikTok, Instagram Reels, X (Twitter), and LinkedIn with native descriptions, tags, and script cadences.",
    },
  ];

  return (
    <div className="relative min-h-screen bg-[#08090C] text-[#F8FAFC] selection:bg-sky-500/30 selection:text-white font-sans antialiased overflow-x-hidden">
      {/* Cinematic Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-sky-500/15 via-blue-600/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-[35%] -left-48 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-[65%] -right-48 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px]" />
      </div>

      {/* Top Session Notification Banner (For Logged-in Creators) */}
      {isAuthed && (
        <div className="relative z-50 bg-[#12151E] border-b border-[#202534] px-4 py-2 text-center text-xs text-slate-300 flex items-center justify-center gap-3">
          <span className="flex items-center gap-1.5 text-sky-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Signed in as {session?.user?.email?.split("@")[0]}
          </span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <Link
            href="/dashboard"
            className="font-semibold text-white hover:text-sky-300 transition-colors inline-flex items-center gap-1"
          >
            Enter Creator Workspace <span className="text-sky-400">→</span>
          </Link>
        </div>
      )}

      {/* Modern Top Header */}
      <header className="sticky top-0 inset-x-0 h-16 z-40 border-b border-[#202534]/80 bg-[#08090C]/85 backdrop-blur-xl transition-all">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-[0_0_16px_rgba(14,165,233,0.35)] group-hover:scale-105 transition-transform duration-200">
              <svg className="w-4 h-4 text-white fill-current" viewBox="0 0 24 24">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-wider text-white font-heading uppercase leading-tight">
                VEELOX
              </span>
              <span className="text-[10px] text-slate-400 font-mono leading-tight">AI Creator Engine</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <a href="#pipeline" className="hover:text-white transition-colors">Creation Pipeline</a>
            <a href="#trends" className="hover:text-white transition-colors">Trend Radar</a>
            <a href="#templates" className="hover:text-white transition-colors">Templates</a>
            <a href="#workflow" className="hover:text-white transition-colors">Why Veelox</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {isAuthed ? (
              <Link
                href="/dashboard"
                className="text-xs font-bold px-5 py-2 rounded-full bg-white hover:bg-slate-100 text-zinc-950 shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all flex items-center gap-1.5"
              >
                <span>Go to Dashboard</span>
                <span>→</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-xs font-medium px-3.5 py-1.5 text-slate-300 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="text-xs font-bold px-4 py-2 rounded-full bg-white hover:bg-slate-100 text-zinc-950 shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all"
                >
                  Start Free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-16 pb-24 space-y-24 md:space-y-32">
        {/* HERO SECTION */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-8">
          {/* Eyebrow badge */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-sky-500/30 bg-sky-950/40 text-sky-300 text-xs font-medium tracking-wide mb-6 shadow-[0_0_24px_-4px_rgba(14,165,233,0.25)] backdrop-blur-md"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            <span>AI CREATOR ENGINE • FROM VIRAL SIGNAL TO 1080P MP4</span>
          </motion.div>

          {/* Grand Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08] mb-6 font-heading"
          >
            Turn Breakout Trends Into <br />
            <span className="bg-gradient-to-r from-sky-400 via-blue-300 to-cyan-200 bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(14,165,233,0.35)]">
              Publish-Ready Viral Videos.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed font-normal"
          >
            Veelox monitors real-time audience demand, drafts viral hooks &amp; Gemini scripts, generates realistic voices, and assembles the finished video automatically.
          </motion.p>

          {/* Primary Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10"
          >
            <Link
              href={isAuthed ? "/dashboard" : "/signup"}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full font-bold text-xs sm:text-sm uppercase tracking-wider bg-white hover:bg-slate-100 text-zinc-950 shadow-[0_0_30px_rgba(255,255,255,0.25)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <span>{isAuthed ? "Open Creator Workspace" : "Start Creating Free"}</span>
              <span>→</span>
            </Link>

            <Link
              href="/trends"
              className="w-full sm:w-auto px-7 py-3.5 rounded-full font-medium text-xs sm:text-sm bg-[#12151E] hover:bg-[#1A1F2C] border border-[#202534] hover:border-sky-500/40 text-slate-200 hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <span>Explore Trend Radar</span>
              <span className="font-mono text-cyan-400 text-xs">● Live</span>
            </Link>
          </motion.div>

          {/* Stats Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto pt-6 border-t border-[#202534]/60 text-left">
            {[
              { val: "10x", label: "Faster Content Output" },
              { val: "5 Feeds", label: "Real-time Trend Signals" },
              { val: "Gemini 2.0", label: "Paced Viral Scripting" },
              { val: "1080p MP4", label: "Auto Rendered & Captioned" },
            ].map((stat, i) => (
              <div key={i} className="p-3.5 rounded-2xl bg-[#0D0F15]/60 border border-[#202534] backdrop-blur-sm">
                <span className="text-xl sm:text-2xl font-extrabold text-white font-heading block">{stat.val}</span>
                <span className="text-xs text-slate-400 mt-0.5 block">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* INTERACTIVE PIPELINE STUDIO PREVIEW */}
          <motion.div
            id="pipeline"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mt-14 rounded-3xl border border-[#202534] bg-[#0D0F15] shadow-[0_24px_60px_rgba(0,0,0,0.7)] p-4 sm:p-7 text-left max-w-5xl mx-auto overflow-hidden relative"
          >
            {/* Window Top Controls */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#202534]">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]/80" />
                <span className="ml-3 text-[11px] font-mono text-slate-500">app.veelox.com/studio</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider px-3 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                  Autonomous Pipeline Ready
                </span>
              </div>
            </div>

            {/* Pipeline Stage Tabs */}
            <div className="flex items-center gap-2 mb-6 border-b border-[#202534] pb-3 overflow-x-auto no-scrollbar">
              {PIPELINE_PHASES.map((phase, idx) => (
                <div key={phase.id} className="flex items-center gap-2 shrink-0">
                  {idx > 0 && <span className="text-slate-600 text-xs">→</span>}
                  <button
                    onClick={() => setActiveWorkflowPhase(phase.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                      activeWorkflowPhase === phase.id
                        ? "bg-sky-500/20 text-sky-200 border border-sky-500/40 shadow-[0_0_16px_rgba(14,165,233,0.25)]"
                        : "text-slate-400 hover:text-white hover:bg-[#12151E] border border-transparent"
                    }`}
                  >
                    <span className="text-slate-500 text-[10px]">{phase.num}</span>
                    <span>{phase.label}</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Dynamic Stage Content Panel */}
            <AnimatePresence mode="wait">
              {activeWorkflowPhase === "trend" && (
                <motion.div
                  key="trend"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                  {TREND_EXAMPLES.map((trend, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-2xl bg-[#12151E] border border-[#202534] hover:border-sky-500/40 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20">
                          {trend.source}
                        </span>
                        <span className="text-xs font-mono font-bold text-emerald-400">{trend.badge}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-white mb-2 leading-snug">{trend.title}</h4>
                      <p className="text-xs text-slate-400 mb-3">{trend.summary}</p>
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-2 border-t border-[#202534]">
                        <span>Score: {trend.score}/100</span>
                        <Link href={`/trends`} className="text-sky-400 hover:underline">
                          View Signal →
                        </Link>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {activeWorkflowPhase === "kit" && (
                <motion.div
                  key="kit"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-2xl bg-[#12151E] border border-[#202534] p-5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-sky-300 uppercase tracking-wider font-semibold">
                      Gemini 2.0 Content Kit Engine: Paced Spoken Script &amp; Hooks
                    </span>
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      High CTR Titles
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-[#08090C] border border-[#202534]">
                      <span className="text-[10px] font-mono text-sky-400 uppercase block mb-1">
                        High-Retention Hook
                      </span>
                      <h5 className="text-xs font-semibold text-white mb-1">
                        &ldquo;In less than 12 months, apps as we know them are disappearing. Here is what is taking their place.&rdquo;
                      </h5>
                      <span className="text-[10px] text-slate-500">First 3 Seconds • Instant Pattern Interrupt</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#08090C] border border-[#202534]">
                      <span className="text-[10px] font-mono text-cyan-400 uppercase block mb-1">
                        Thumbnail Concept
                      </span>
                      <h5 className="text-xs font-semibold text-white mb-1">
                        Split contrast image: Glowing AI core vs fading phone apps with bold overlay &lsquo;IT FINALLY HAPPENED&rsquo;.
                      </h5>
                      <span className="text-[10px] text-slate-500">Subject, Color Contrast &amp; Curiosity Trigger</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeWorkflowPhase === "voice" && (
                <motion.div
                  key="voice"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-2xl bg-[#12151E] border border-[#202534] p-5 space-y-3 font-mono text-xs"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#202534]">
                    <span className="text-sky-400 font-bold">SCENE 01 [0:00 - 0:06]</span>
                    <span className="text-slate-400">VOICE CADENCE &amp; 4K B-ROLL SYNC</span>
                  </div>
                  <div className="text-white">
                    <span className="text-slate-500">AUDIO TRACK: </span>&ldquo;By 2026, you won&apos;t touch a standard software application ever again.&rdquo;
                  </div>
                  <div className="text-slate-400">
                    <span className="text-slate-500">AUTO-MATCHED B-ROLL: </span>Cinematic high-contrast shot of futuristic creator workstation with ambient cinematic lighting (Pexels 4K).
                  </div>
                  <div className="text-emerald-400">
                    <span className="text-slate-500">KINETIC CAPTION: </span>STOP USING APPS
                  </div>
                </motion.div>
              )}

              {activeWorkflowPhase === "video" && (
                <motion.div
                  key="video"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-2xl bg-[#12151E] border border-[#202534] p-5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                        Rendered Timeline Video (1080p MP4 Ready)
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
                      Publish-Ready
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-[#08090C] border border-[#202534]">
                      <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Timeline Composition</span>
                      <p className="text-slate-300 font-semibold">6 Scenes • 58s Duration • 30 FPS</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#08090C] border border-[#202534]">
                      <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Voice &amp; Audio Pacing</span>
                      <p className="text-slate-300 font-semibold">Ultra-Realistic Voiceover + Dynamic Pacing</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#08090C] border border-[#202534]">
                      <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Animated Motion Captions</span>
                      <p className="text-sky-400 font-semibold">Word-by-word kinetic highlight style</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </section>

        {/* 5-AI-TOOLS ARCHITECTURE ROW */}
        <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-mono font-semibold uppercase tracking-widest text-sky-400">
              The Autonomous Video Engine
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 font-heading">
              Five AI Tools. One Unified Workflow.
            </h2>
            <p className="text-sm text-slate-400 max-w-xl mx-auto mt-2">
              Everything required to go from raw internet chatter to viral video assets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {[
              {
                title: "Trend Finder",
                desc: "Real-time algorithmic surveillance across 5 global platforms.",
                icon: "📈",
                accent: "border-sky-500/30 bg-sky-500/10 text-sky-400",
              },
              {
                title: "Script Generator",
                desc: "Gemini 2.0 synthesis for curiosity hooks, titles & spoken script.",
                icon: "✨",
                accent: "border-blue-500/30 bg-blue-600/10 text-blue-400",
              },
              {
                title: "Voice Generator",
                desc: "Emotional human cadence voiceovers in multiple natural accents.",
                icon: "🎙️",
                accent: "border-emerald-500/30 bg-emerald-600/10 text-emerald-400",
              },
              {
                title: "Asset Matcher",
                desc: "Millions of 4K royalty-free videos automatically synced to script lines.",
                icon: "🎬",
                accent: "border-amber-500/30 bg-amber-600/10 text-amber-400",
              },
              {
                title: "Video Editor",
                desc: "Automated Remotion timeline assembly with kinetic captions.",
                icon: "⚡",
                accent: "border-cyan-500/30 bg-cyan-600/10 text-cyan-400",
              },
            ].map((tool, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-[#0D0F15] border border-[#202534] hover:border-sky-500/50 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  <div className={`w-10 h-10 rounded-xl ${tool.accent} border flex items-center justify-center text-lg mb-4`}>
                    {tool.icon}
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1.5 group-hover:text-sky-300 transition-colors">
                    {tool.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{tool.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* POPULAR VIDEO TEMPLATES SHOWCASE */}
        <section id="templates" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-xs font-mono font-semibold uppercase tracking-widest text-sky-400">
                Pre-Built Formats
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 font-heading">
                Tested Viral Formats &amp; Blueprints
              </h2>
            </div>
            <Link
              href={isAuthed ? "/dashboard" : "/signup"}
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors inline-flex items-center gap-1 self-start md:self-auto"
            >
              Browse all templates in studio <span>→</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {POPULAR_TEMPLATES.map((tmpl, idx) => (
              <div
                key={idx}
                className="rounded-2xl overflow-hidden bg-[#0D0F15] border border-[#202534] hover:border-sky-500/40 transition-all group flex flex-col"
              >
                <div className="relative aspect-[9/12] w-full overflow-hidden bg-slate-900">
                  <Image
                    src={tmpl.image}
                    alt={tmpl.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0D0F15] via-transparent to-black/20" />
                  <span className="absolute top-3 left-3 text-[10px] font-mono px-2.5 py-1 rounded-full bg-black/60 text-white backdrop-blur-md border border-white/10">
                    {tmpl.badge}
                  </span>
                  <span className="absolute bottom-3 right-3 text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/80 text-white font-bold backdrop-blur-md">
                    {tmpl.format}
                  </span>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 block mb-1">{tmpl.ratio}</span>
                    <h4 className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">
                      {tmpl.title}
                    </h4>
                  </div>
                  <Link
                    href="/create"
                    className="mt-3 text-xs font-semibold text-slate-400 group-hover:text-sky-400 transition-colors inline-flex items-center gap-1"
                  >
                    Use Template <span>→</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* COMPARISON: OLD MANUAL WORKFLOW VS VEELOX */}
        <section id="workflow" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-6 sm:p-10 rounded-3xl bg-[#0D0F15] border border-[#202534] shadow-[0_16px_50px_rgba(0,0,0,0.5)]">
            <div className="text-center mb-10">
              <span className="text-xs font-mono font-semibold uppercase tracking-widest text-sky-400">
                The Leverage Shift
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1.5 font-heading">
                Stop Spending 8 Hours Per Video
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Old Way */}
              <div className="p-6 rounded-2xl bg-[#08090C] border border-rose-500/20 space-y-4">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                  <span>✕</span>
                  <span>Legacy Creator Workflow</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="text-rose-500">●</span>
                    <span>2+ hours researching random topics without search data</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-500">●</span>
                    <span>Staring at blank doc trying to write compelling hooks</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-500">●</span>
                    <span>Recording 20 voice takes and manually editing out breaths</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-500">●</span>
                    <span>Searching stock video libraries clip-by-clip for hours</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-500">●</span>
                    <span>Manually typing and aligning animated subtitles in Premiere</span>
                  </li>
                </ul>
                <div className="pt-2 text-xs font-mono text-rose-300 font-semibold">
                  Average time: 6 to 9 hours per video
                </div>
              </div>

              {/* Veelox Way */}
              <div className="p-6 rounded-2xl bg-sky-950/20 border border-sky-500/30 shadow-[0_0_30px_rgba(14,165,233,0.12)] space-y-4">
                <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                  <span>✓</span>
                  <span>Veelox Autonomous Engine</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-200">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400">●</span>
                    <span>Instant breakout trend discovery scored by algorithm</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400">●</span>
                    <span>Gemini 2.0 writes structured hooks, titles, and timed script</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400">●</span>
                    <span>Realistic human-grade voiceover generated in 3 seconds</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400">●</span>
                    <span>4K B-roll clips auto-selected and matched to narration lines</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400">●</span>
                    <span>Automated timeline render with kinetic word-highlight captions</span>
                  </li>
                </ul>
                <div className="pt-2 text-xs font-mono text-emerald-400 font-semibold">
                  Average time: Under 90 seconds
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ ACCORDION SECTION */}
        <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-mono font-semibold uppercase tracking-widest text-sky-400">
              Got Questions?
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1.5 font-heading">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-[#0D0F15] border border-[#202534] overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span className="text-sm font-semibold text-white">{faq.q}</span>
                    <span className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}>
                      ▼
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs text-slate-400 leading-relaxed border-t border-[#202534]/50 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* BOTTOM CALL TO ACTION BANNER */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden p-8 sm:p-14 bg-gradient-to-r from-sky-950/40 via-[#12151E] to-[#0D0F15] border border-sky-500/30 text-center shadow-[0_20px_60px_rgba(14,165,233,0.15)]">
            <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 font-heading">
              Ready to 10x Your Content Output?
            </h2>
            <p className="text-sm text-slate-300 max-w-lg mx-auto mb-8">
              Join creators discovering high-velocity trend signals and auto-rendering viral videos with Veelox.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href={isAuthed ? "/dashboard" : "/signup"}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full font-bold text-xs sm:text-sm uppercase tracking-wider bg-white hover:bg-slate-100 text-zinc-950 shadow-[0_0_30px_rgba(255,255,255,0.25)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] transition-all"
              >
                {isAuthed ? "Enter Workspace Now →" : "Get Started Free →"}
              </Link>
              <Link
                href="/trends"
                className="w-full sm:w-auto px-7 py-3.5 rounded-full font-medium text-xs sm:text-sm bg-[#08090C] hover:bg-[#161A26] border border-[#202534] text-slate-200 transition-all"
              >
                Inspect Live Trends
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Modern Luxury Dark Footer */}
      <footer className="border-t border-[#202534] bg-[#050608] py-12 text-xs text-slate-400 font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-lg bg-sky-500 flex items-center justify-center text-white text-xs font-bold">
              V
            </div>
            <span className="font-bold text-white text-sm">VEELOX</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Autonomous Video &amp; Trend Engine</span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>All Systems Operational • Google Gemini 2.0 Active</span>
          </div>

          <div className="text-slate-500 font-mono text-[11px]">
            © {new Date().getFullYear()} Veelox Technologies. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
