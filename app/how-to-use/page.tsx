"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import StudioShell from "../components/StudioShell";

function StepCard({
  step,
  icon,
  title,
  children,
}: {
  step: number;
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-6 sm:p-7 rounded-2xl bg-[#0D1017] border border-[#1A2030] hover:border-sky-500/35 transition-all shadow-sm">
      <div className="flex items-center gap-3 mb-3.5">
        <span className="shrink-0 w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center font-mono font-semibold text-xs text-sky-400">
          {step}
        </span>
        <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
          <span>{icon}</span>
          <span>{title}</span>
        </h3>
      </div>
      <div className="text-slate-300 text-xs sm:text-sm leading-relaxed space-y-3">{children}</div>
    </div>
  );
}

const FAQS: { q: string; a: string }[] = [
  {
    q: "Is Veelox free to get started?",
    a: "Yes. Veelox includes a free starter tier with 30 monthly credits to discover trends, track radar signals, and generate AI Content Kits.",
  },
  {
    q: "What AI engine powers Veelox Content Kits?",
    a: "Veelox uses Google Gemini 2.0 Flash as its main AI brain, running entirely server-side. Creators do not need to configure or expose any AI API keys — everything is managed seamlessly.",
  },
  {
    q: "Where does the live trend data come from?",
    a: "Veelox aggregates real-time signals across Google Trends, Reddit, Hacker News, YouTube, and Google News RSS. Real market data is collected first, and Gemini interprets the opportunities.",
  },
  {
    q: "What is the virality index score?",
    a: "A 0–100 estimate of how rapidly a topic is surging right now. 80+ is 🔥 Hot, 60–79 is 📈 Rising, and below 60 is 🌱 Emerging.",
  },
  {
    q: "Does the script match the duration I select?",
    a: "Yes. The AI targets exact word counts calibrated for natural speech pacing (~150 words per minute: 30s ≈ 75 words, 60s ≈ 150 words, 3m ≈ 450 words, 5m ≈ 750 words, 10m ≈ 1500 words).",
  },
  {
    q: "When will full AI video generation be available?",
    a: "Full automated video editing and rendering is actively in development as our next major release phase. Right now, creators use Veelox for high-velocity trend discovery and publish-ready Content Kits.",
  },
];

const KIT_FIELDS: { icon: string; name: string; desc: string }[] = [
  { icon: "🎥", name: "Full Video Script", desc: "A ready-to-record script with HOOK, INTRO, MAIN CONTENT, and CTA labels matching your duration." },
  { icon: "🏆", name: "Viral Titles", desc: "5 high-CTR title formulas engineered to win the click." },
  { icon: "🪝", name: "Opening Hooks", desc: "3 scroll-stopping opening lines designed for high viewer retention." },
  { icon: "🖼️", name: "Thumbnail Ideas", desc: "2 detailed concepts — emotional focus, focal point, and visual text." },
  { icon: "📈", name: "Why It's Trending", desc: "The catalyst behind the breakout surge and why audiences care." },
  { icon: "🎯", name: "Content Angles", desc: "Unique perspectives to stand out from others covering the topic." },
  { icon: "🎬", name: "Best Format", desc: "Guidance on whether to format as a Short, 5-min Breakdown, or Carousel." },
  { icon: "⏳", name: "Catch Window", desc: "Estimated window before the trend reaches peak saturation." },
  { icon: "🚀", name: "Virality Tips", desc: "3 tactical recommendations to maximize algorithmic distribution." },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-[#202534] bg-[#0D0F15] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-6 py-4.5 text-left hover:bg-[#12151E] transition-colors cursor-pointer"
      >
        <span className="text-xs sm:text-sm font-semibold text-white font-heading">{q}</span>
        <span className="text-sky-400 text-xs shrink-0 font-mono font-bold">{open ? "−" : "+"}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-6 pb-5 text-xs text-slate-400 leading-relaxed border-t border-[#202534] pt-3.5">
              {a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HowToUse() {
  return (
    <StudioShell active="how-to-use">
      <div className="max-w-4xl mx-auto w-full space-y-8">
        {/* Header */}
        <div className="border-b border-[#1A2030] pb-5">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            <span className="text-[10px] font-mono font-semibold tracking-wider uppercase text-sky-400">
              CREATOR WORKFLOW MANUAL
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            How to Master Veelox
          </h1>
          <p className="text-slate-400 text-xs mt-0.5">
            Master the continuous workflow: Trend Discovery → Opportunity Insight → AI Video Studio → Multi-Platform Repurposing.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-6">
          <StepCard step={1} icon="🔥" title="Discover High-Velocity Trends">
            <p>
              On the Trend Finder page, enter any niche (AI, Gaming, Finance, Video Editing) to scan Google Trends, YouTube, Reddit, HackerNews, and Google News simultaneously.
            </p>
            <p>
              Every topic is scored 0–100 by engagement momentum. Click &ldquo;Inspect Opportunity&rdquo; to see the missing angle before competitors notice it.
            </p>
            <div className="pt-2">
              <Link
                href="/trends"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-sky-500 hover:bg-sky-400 text-white shadow-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                <span>Explore Trends Finder</span>
                <span>→</span>
              </Link>
            </div>
          </StepCard>

          <StepCard step={2} icon="📡" title="Track Momentum on Trend Radar">
            <p>
              Trend Radar continuously monitors breakout velocity across your saved niches. Receive early warning signals on emerging keywords before they reach peak saturation.
            </p>
            <div className="pt-2">
              <Link
                href="/alerts"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-[#11141E] hover:bg-[#161B28] border border-[#202738] text-slate-300 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                <span>Open Trend Radar</span>
                <span>→</span>
              </Link>
            </div>
          </StepCard>

          <StepCard step={3} icon="👁️" title="Analyze Competitors & Gaps">
            <p>
              Input competitor channels to inspect top-performing videos, title formulas, and view velocities. Gemini identifies content gaps where your channel can differentiate and win.
            </p>
            <div className="pt-2">
              <Link
                href="/competitors"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-[#11141E] hover:bg-[#161B28] border border-[#202738] text-slate-300 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                <span>Analyze Competitors</span>
                <span>→</span>
              </Link>
            </div>
          </StepCard>

          <StepCard step={4} icon="✨" title="Generate Complete AI Content Kits">
            <p>
              Click &ldquo;Create Content&rdquo; on any trend card. Pick your target length (30s, 60s, 3m, 5m, 10m) to generate a complete production kit:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {KIT_FIELDS.map((f) => (
                <div key={f.name} className="p-3.5 rounded-xl bg-[#11141E] border border-[#1E2536]">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5 mb-1 font-heading">
                    <span>{f.icon}</span>
                    <span>{f.name}</span>
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </StepCard>

          <StepCard step={5} icon="🌐" title="Repurpose Across All 5 Platforms">
            <p>
              Inside the Content Kit Studio, open the Multi-Platform studio tab to generate platform-optimized YouTube descriptions, TikTok scripts, Instagram captions, X threads, and LinkedIn posts in one click.
            </p>
          </StepCard>
        </div>

        {/* FAQs */}
        <div className="mt-12 space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 font-heading">
            <span>❓</span>
            <span>Frequently Asked Questions</span>
          </h2>
          <div className="space-y-2.5">
            {FAQS.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>

        {/* Bottom Feedback CTA */}
        <div className="mt-12 p-6 sm:p-8 rounded-2xl bg-[#0D1017] border border-[#1A2030] text-center shadow-sm">
          <h3 className="text-sm sm:text-base font-bold text-white mb-1.5">Have a feature request or idea?</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5 leading-relaxed">
            We are building Veelox in public for the creator community. Submit feedback anytime.
          </p>
          <Link
            href="/suggestions"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-[#11141E] hover:bg-[#161B28] border border-[#202738] text-slate-300 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <span>💡</span>
            <span>Share Feedback</span>
          </Link>
        </div>
      </div>
    </StudioShell>
  );
}
