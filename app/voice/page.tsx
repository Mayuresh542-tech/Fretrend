"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mic,
  Play,
  Pause,
  Download,
  FolderPlus,
  Sparkles,
  Volume2,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import StudioShell from "../components/StudioShell";
import AuthLoadingScreen from "../components/AuthLoadingScreen";
import { useAuthGate } from "../lib/useAuthGate";
import { CURATED_VOICES } from "../lib/server/tts/voices";
import AddToProjectModal from "../components/projects/AddToProjectModal";

function VoiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, session } = useAuthGate();

  const queryScript = searchParams.get("script") || "";

  const [text, setText] = useState(
    queryScript ||
      "Stop scrolling if you want to turn trending topics into viral videos in seconds. With Veelox, you generate research, voiceovers, and kinetic cutaways in one modular workflow."
  );
  const [selectedVoiceId, setSelectedVoiceId] = useState(CURATED_VOICES[0].id);
  const [speed, setSpeed] = useState(1.0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add to Project modal
  const [modalOpen, setModalOpen] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (status === "unauthed") {
      router.replace("/login");
    }
  }, [status, router]);

  async function handleGenerate() {
    if (!text.trim()) return;
    setIsGenerating(true);
    setError(null);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/voice/generate", {
        method: "POST",
        headers,
        body: JSON.stringify({
          text,
          voiceConfig: {
            voiceId: selectedVoiceId,
            speed,
            stability: 0.5,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Voice synthesis failed");
      }

      setAudioUrl(data.audioUrl);
      setAudioDuration(data.duration || 12);
    } catch (err: any) {
      console.error("Voice generation error:", err);
      setError(err.message || "Failed to synthesize voiceover");
    } finally {
      setIsGenerating(false);
    }
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }

  function handleDownload() {
    if (!audioUrl) return;
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = `voiceover_${selectedVoiceId}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const estimatedSeconds = Math.round(wordCount * 0.38);
  const selectedVoice = CURATED_VOICES.find((v) => v.id === selectedVoiceId) || CURATED_VOICES[0];

  if (status !== "authed") {
    return <AuthLoadingScreen label="Loading Voice Studio…" />;
  }

  return (
    <StudioShell active="voice">
      <div className="space-y-8 pb-16">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            AI Voice Generator
          </h1>
          <p className="text-sm text-slate-500">
            Generate natural voiceovers independently from any script or prompt.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Text Input & Voice Controls */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  Script to Voicify
                </label>
                <span className="text-xs text-slate-400">
                  {wordCount} words · ~{estimatedSeconds}s estimated
                </span>
              </div>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={7}
                placeholder="Paste or type script for voice synthesis..."
                className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 font-sans leading-relaxed focus:outline-none focus:border-slate-400"
              />

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Speed:</span>
                  {[0.9, 1.0, 1.15].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSpeed(s)}
                      className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors cursor-pointer ${
                        speed === s
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating || !text.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-medium text-xs sm:text-sm transition-colors shadow-2xs cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isGenerating ? "Generating Voice..." : "Generate Voiceover"}</span>
                </button>
              </div>
            </div>

            {/* Generated Audio Player Card */}
            {audioUrl && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Volume2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">
                        {selectedVoice.name} Voiceover
                      </h4>
                      <span className="text-xs text-slate-400">
                        Duration: {audioDuration.toFixed(1)}s
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
                      title="Download MP3"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalOpen(true)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span>Add to Project</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push(`/editor?voiceUrl=${encodeURIComponent(audioUrl)}`)}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <span>Use in Editor</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Audio Element & Custom Player Bar */}
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />

                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 transition-colors shrink-0"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>
                  <div className="flex-1">
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-900 transition-all"
                        style={{ width: isPlaying ? "65%" : "0%" }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-mono text-slate-500">
                    {audioDuration.toFixed(1)}s
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right: Curated Voice Selector Cards */}
          <div className="lg:col-span-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Select Voice Model
            </h3>

            <div className="space-y-2.5">
              {CURATED_VOICES.map((voice) => {
                const isSelected = selectedVoiceId === voice.id;
                return (
                  <div
                    key={voice.id}
                    onClick={() => setSelectedVoiceId(voice.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "bg-slate-50 border-slate-900 shadow-2xs"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{voice.name}</h4>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {voice.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                        {voice.description}
                      </p>
                    </div>

                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "border-slate-900 bg-slate-900"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Add to Project Modal */}
      {audioUrl && (
        <AddToProjectModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          assetType="voiceovers"
          assetLabel={`${selectedVoice.name} Voiceover`}
          assetData={{
            id: `voice_${Date.now()}`,
            url: audioUrl,
            voiceName: selectedVoice.name,
            voiceId: selectedVoiceId,
            duration: audioDuration,
            text,
            created_at: new Date().toISOString(),
          }}
        />
      )}
    </StudioShell>
  );
}

export default function VoicePage() {
  return (
    <Suspense fallback={<AuthLoadingScreen label="Loading Voice Studio…" />}>
      <VoiceContent />
    </Suspense>
  );
}
