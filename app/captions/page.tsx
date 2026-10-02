"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Type,
  Upload,
  Play,
  Pause,
  RotateCcw,
  Download,
  FolderPlus,
  Sparkles,
  CheckCircle2,
  FileText,
  Sliders,
  Film,
  Music,
  ArrowRight,
} from "lucide-react";
import StudioShell from "../components/StudioShell";
import AuthLoadingScreen from "../components/AuthLoadingScreen";
import { useAuthGate } from "../lib/useAuthGate";
import AddToProjectModal from "../components/projects/AddToProjectModal";
import {
  CaptionPresetId,
  CAPTION_PRESETS,
  CaptionSegment,
  createSegmentsFromTranscript,
} from "../lib/captions/presets";
import {
  exportToSRT,
  exportToVTT,
  exportToASS,
} from "../lib/captions/subtitlesParser";

function CaptionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useAuthGate();

  // Mode: "paste" | "upload"
  const [inputMode, setInputMode] = useState<"paste" | "upload">("paste");
  const [transcript, setTranscript] = useState(
    "Stop making this rookie mistake with AI coding. The real secret is breaking your vision into modular components, letting projects organize your assets, and letting the editor assemble everything."
  );
  const [selectedPreset, setSelectedPreset] = useState<CaptionPresetId>("clean");
  const [segments, setSegments] = useState<CaptionSegment[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Playback preview state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(8);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Media file state if user uploads audio/video
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Add to Project Modal State
  const [isAddToProjectOpen, setIsAddToProjectOpen] = useState(false);

  useEffect(() => {
    const qScript = searchParams.get("script") || searchParams.get("text");
    if (qScript) {
      setTranscript(qScript);
      handleGenerateCaptions(qScript, selectedPreset);
    } else {
      handleGenerateCaptions(transcript, selectedPreset);
    }
  }, [searchParams]);

  // Handle Playback Loop
  useEffect(() => {
    if (isPlaying) {
      playbackTimerRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return Math.round((prev + 0.1) * 10) / 10;
        });
      }, 100);
    } else {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    }
    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [isPlaying, duration]);

  async function handleGenerateCaptions(textToUse?: string, presetToUse?: CaptionPresetId) {
    const text = (textToUse ?? transcript).trim();
    if (!text) return;

    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/captions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: text,
          preset: presetToUse || selectedPreset,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate captions.");
      }

      const returnedSegments: CaptionSegment[] = data.segments || createSegmentsFromTranscript(text);
      setSegments(returnedSegments);

      if (returnedSegments.length > 0) {
        const lastSeg = returnedSegments[returnedSegments.length - 1];
        setDuration(Math.max(5, Math.ceil(lastSeg.end)));
      }
    } catch (err: any) {
      // Local fallback
      const fallbackSegments = createSegmentsFromTranscript(text);
      setSegments(fallbackSegments);
      if (fallbackSegments.length > 0) {
        setDuration(Math.max(5, Math.ceil(fallbackSegments[fallbackSegments.length - 1].end)));
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleFileUpload(file: File) {
    setIsUploading(true);
    setError(null);
    setUploadedFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setUploadedMediaUrl(data.url);

      // Now transcribe
      const transRes = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaUrl: data.url }),
      });
      const transData = await transRes.json();
      if (transData.transcript) {
        setTranscript(transData.transcript);
        handleGenerateCaptions(transData.transcript, selectedPreset);
      }
    } catch (err: any) {
      setError(err?.message || "File upload or transcription failed.");
    } finally {
      setIsUploading(false);
    }
  }

  function handleExportFile(format: "srt" | "vtt" | "ass") {
    if (segments.length === 0) return;
    const exportable = segments.map((s) => ({
      text: s.text,
      startTime: s.start,
      endTime: s.end,
    }));

    let content = "";
    let mime = "text/plain";
    if (format === "srt") {
      content = exportToSRT(exportable);
    } else if (format === "vtt") {
      content = exportToVTT(exportable);
      mime = "text/vtt";
    } else {
      content = exportToASS(exportable);
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `veelox-captions.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Active Segment for playback
  const activeSegment = segments.find(
    (s) => currentTime >= s.start && currentTime <= s.end
  );

  const activePresetConfig = CAPTION_PRESETS[selectedPreset];

  if (status !== "authed") {
    return <AuthLoadingScreen label="Loading Captions Studio…" />;
  }

  return (
    <StudioShell active="captions">
      <div className="max-w-6xl mx-auto w-full space-y-6 pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                INDEPENDENT CREATION STUDIO
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              AI Dynamic Captions Studio
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Generate word-synced animated subtitles, customize viral kinetic styles, and export to SRT/VTT.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/projects")}
              className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              All Projects
            </button>
          </div>
        </div>

        {/* Input & Style Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Input text or media upload (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
              {/* Tab Selector */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInputMode("paste")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      inputMode === "paste"
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Paste Transcript / Script
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode("upload")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      inputMode === "upload"
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Upload Audio / Video
                  </button>
                </div>

                <span className="text-[11px] font-mono text-slate-400">
                  {segments.length} Timed Segments
                </span>
              </div>

              {inputMode === "paste" ? (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Spoken Script / Transcript
                  </label>
                  <textarea
                    rows={6}
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Enter spoken text to generate word-synced subtitles..."
                    className="w-full p-3 rounded-lg border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-slate-900 font-sans leading-relaxed"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={generating || !transcript.trim()}
                      onClick={() => handleGenerateCaptions()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{generating ? "Syncing..." : "Sync Captions"}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-700">
                    Upload Audio or Video for Auto-Transcription
                  </label>
                  <label className="border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-slate-50/50">
                    <Upload className="w-6 h-6 text-slate-400" />
                    <span className="text-xs font-medium text-slate-700">
                      {isUploading
                        ? "Uploading & Transcribing…"
                        : uploadedFileName || "Click to upload MP4, MP3, WAV, or MOV"}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      AI Whisper engine will transcribe and generate word-level timings automatically
                    </span>
                    <input
                      type="file"
                      accept="audio/*,video/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Subtitle Segments List */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 font-mono">
                  Timed Subtitle Blocks ({segments.length})
                </h3>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleExportFile("srt")}
                    className="px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 text-[11px] font-medium text-slate-700 transition-colors"
                  >
                    .SRT
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportFile("vtt")}
                    className="px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 text-[11px] font-medium text-slate-700 transition-colors"
                  >
                    .VTT
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportFile("ass")}
                    className="px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 text-[11px] font-medium text-slate-700 transition-colors"
                  >
                    .ASS
                  </button>
                </div>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
                {segments.map((seg, idx) => {
                  const isCurrent = currentTime >= seg.start && currentTime <= seg.end;
                  return (
                    <div
                      key={seg.id || idx}
                      onClick={() => {
                        setCurrentTime(seg.start);
                        setIsPlaying(true);
                      }}
                      className={`pt-1.5 p-2 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                        isCurrent
                          ? "bg-blue-50/80 text-blue-900 font-medium"
                          : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-[10px] text-slate-400 shrink-0">
                          {seg.start.toFixed(1)}s - {seg.end.toFixed(1)}s
                        </span>
                        <span className="truncate">{seg.text}</span>
                      </div>
                      {isCurrent && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Style Presets & Live Visual Player (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Style Preset Selector */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2 shadow-xs">
              <label className="block text-xs font-semibold text-slate-700">
                Kinetic Caption Preset
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(CAPTION_PRESETS) as CaptionPresetId[]).map((pid) => {
                  const p = CAPTION_PRESETS[pid];
                  const isSelected = selectedPreset === pid;
                  return (
                    <button
                      key={pid}
                      type="button"
                      onClick={() => {
                        setSelectedPreset(pid);
                        handleGenerateCaptions(transcript, pid);
                      }}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "border-slate-900 bg-slate-50 text-slate-900 font-semibold"
                          : "border-slate-200 hover:border-slate-300 text-slate-600"
                      }`}
                    >
                      <div className="text-xs">{p.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{p.tagline}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Visual Subtitle Preview Monitor */}
            <div className="bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-md p-4 flex flex-col justify-between aspect-[9/16] max-w-[280px] mx-auto relative select-none">
              {/* Background gradient/video */}
              <div className="absolute inset-0 bg-radial from-slate-900 via-slate-950 to-black opacity-90 pointer-events-none" />

              {/* Top Watermark */}
              <div className="relative z-10 text-[10px] font-mono text-slate-500 uppercase tracking-widest text-center">
                Kinetic Subtitle Preview
              </div>

              {/* Subtitle Display */}
              <div className="relative z-10 px-4 text-center my-auto">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSegment ? activeSegment.id : "empty"}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      fontFamily: activePresetConfig.fontFamily,
                      fontSize: activePresetConfig.fontSize,
                      fontWeight: activePresetConfig.fontWeight,
                      textTransform: activePresetConfig.textTransform,
                      color: activePresetConfig.textColor,
                      letterSpacing: activePresetConfig.letterSpacing,
                      lineHeight: activePresetConfig.lineHeight,
                    }}
                    className="leading-tight drop-shadow-lg"
                  >
                    {activeSegment ? (
                      <span className="inline-block p-1 rounded-md" style={{ backgroundColor: activePresetConfig.containerBg }}>
                        {activeSegment.words && activeSegment.words.length > 0 ? (
                          activeSegment.words.map((w, wIdx) => {
                            const isWordSpoken =
                              currentTime >= w.start && currentTime <= w.end;
                            return (
                              <span
                                key={wIdx}
                                style={{
                                  color: isWordSpoken
                                    ? activePresetConfig.highlightColor
                                    : activePresetConfig.textColor,
                                  backgroundColor: isWordSpoken && activePresetConfig.highlightBg
                                    ? activePresetConfig.highlightBg
                                    : "transparent",
                                  padding: "0 2px",
                                  borderRadius: "4px",
                                }}
                                className="inline-block transition-colors"
                              >
                                {w.word}{" "}
                              </span>
                            );
                          })
                        ) : (
                          activeSegment.text
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-600 text-xs font-sans">
                        Press Play to watch animated captions
                      </span>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Bottom Scrubber & Controls */}
              <div className="relative z-10 space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>{currentTime.toFixed(1)}s</span>
                  <span>{duration.toFixed(1)}s</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={currentTime}
                  onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
                  className="w-full accent-blue-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                />

                <div className="flex items-center justify-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setCurrentTime(0)}
                    className="p-1.5 rounded-full text-slate-400 hover:text-white"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-2 rounded-full bg-white text-slate-950 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-slate-950" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Actions: Add to Project & Open in Editor */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2 shadow-xs">
              <button
                type="button"
                onClick={() => setIsAddToProjectOpen(true)}
                className="w-full py-2.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <FolderPlus className="w-4 h-4" />
                <span>Add Captions to Project</span>
              </button>

              <button
                type="button"
                onClick={() => router.push(`/editor?captions=1`)}
                className="w-full py-2 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Use in Video Editor</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Universal Add to Project Modal */}
      <AddToProjectModal
        isOpen={isAddToProjectOpen}
        onClose={() => setIsAddToProjectOpen(false)}
        assetType="caption"
        assetItem={{
          transcript,
          preset: selectedPreset,
          segments,
        }}
        defaultTitle="New Captions Track"
      />
    </StudioShell>
  );
}

export default function CaptionsPage() {
  return (
    <Suspense fallback={<AuthLoadingScreen label="Loading Captions Studio…" />}>
      <CaptionsContent />
    </Suspense>
  );
}
