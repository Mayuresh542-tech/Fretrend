"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Video,
  Type,
  TrendingUp,
  ArrowRight,
  Film,
  Sparkles,
  Scissors,
  Wand2,
  Volume2,
  Layers,
  FileText,
  Sliders,
  Check,
} from "lucide-react";
import StudioShell from "../components/StudioShell";
import AuthLoadingScreen from "../components/AuthLoadingScreen";
import { useAuthGate } from "../lib/useAuthGate";

function CreateVideoHubContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useAuthGate();

  if (status !== "authed") {
    return <AuthLoadingScreen label="Loading Create Video Hub…" />;
  }

  return (
    <StudioShell active="create">
      <div className="max-w-5xl mx-auto space-y-10 pb-16 pt-2">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-900" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              Creation Modes
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Create Video
          </h1>
          <p className="text-sm sm:text-base text-slate-500 max-w-2xl leading-relaxed">
            Choose your production workflow. Veelox provides two fundamentally different creation modes depending on what you are starting with.
          </p>
        </div>

        {/* The Two Distinct Modes (Section 3 of Architecture) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Option A: Raw Footage Mode */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col justify-between hover:border-slate-300 hover:shadow-xs transition-all relative overflow-hidden group">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                  <Video className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium font-mono">
                  Option A
                </span>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Raw Footage Video
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  Turn your existing footage into a finished video.
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Best for vloggers, course creators, talking heads, and creators who already recorded raw video clips.
                </p>
              </div>

              {/* Workflow Breakdown */}
              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold block">
                  Automated Pipeline
                </span>
                <ul className="space-y-2 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Upload multiple raw footage clips</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>AI speech transcription &amp; scene detection</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Dead air / silence removal suggestions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Auto-timed kinetic captions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Smart B-Roll &amp; SFX opportunity matching</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Original media is 100% preserved non-destructively</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-8">
              <Link
                href="/raw-footage"
                className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-2xs group-hover:gap-3"
              >
                <span>Start Raw Footage Mode</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Option B: Typography Video Mode */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col justify-between hover:border-slate-300 hover:shadow-xs transition-all relative overflow-hidden group">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                  <Type className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium font-mono">
                  Option B
                </span>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Typography Video
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  Create a faceless, text-driven video from an idea or script.
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Best for faceless channels, educational shorts, motivational reels, tech breakdowns, and viral quote videos.
                </p>
              </div>

              {/* Workflow Breakdown */}
              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold block">
                  Automated Pipeline
                </span>
                <ul className="space-y-2 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>AI Content Kit generator or import script</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Studio voiceover (Voice.ai / ElevenLabs)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Solid, gradient, image, or video background</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Kinetic typography engine with timed reveals</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Contextual B-Roll matching to script meaning</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Subtle background music &amp; emphasis SFX</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-8">
              <Link
                href="/typography"
                className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-2xs group-hover:gap-3"
              >
                <span>Start Typography Video</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Separate Research Strip (Section 2 & 26: Trend Finder) */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-700" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                Not sure what to make yet?
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Explore Trend Finder to discover rising viral topics, analyze competition, and generate hooks before deciding on a video format.
            </p>
          </div>

          <Link
            href="/trends"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-medium text-xs transition-colors shrink-0 cursor-pointer shadow-2xs"
          >
            <span>Open Trend Finder</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </StudioShell>
  );
}

export default function CreateVideoHubPage() {
  return (
    <Suspense fallback={<AuthLoadingScreen label="Loading Create Video Hub…" />}>
      <CreateVideoHubContent />
    </Suspense>
  );
}
