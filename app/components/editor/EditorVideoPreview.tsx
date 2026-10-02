"use client";

import React, { useRef, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  VeeloxTimelineProject,
  TimelineItem,
  MotionAnimationType,
} from "@/app/lib/timeline/types";
import { CAPTION_PRESETS, CaptionPresetId } from "@/app/lib/captions/presets";

interface EditorVideoPreviewProps {
  timeline: VeeloxTimelineProject;
  currentTime: number;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onSelectClip?: (item: TimelineItem) => void;
  onDropBRoll?: (
    brollData: { videoUrl: string; title?: string; thumbnail?: string; duration?: number; source?: string },
    targetTime?: number,
    targetClipId?: string
  ) => void;
}

export default function EditorVideoPreview({
  timeline,
  currentTime,
  isPlaying,
  onTimeUpdate,
  onTogglePlay,
  onSeek,
  onSelectClip,
  onDropBRoll,
}: EditorVideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isDragOverPreview, setIsDragOverPreview] = useState(false);
  const [isLooping, setIsLooping] = useState(true);

  const totalDuration = Math.max(1, timeline.duration);

  // 1. Identify Tracks
  const videoTrack = useMemo(
    () => timeline.tracks.find((t) => t.type === "video"),
    [timeline.tracks]
  );
  const captionTrack = useMemo(
    () => timeline.tracks.find((t) => t.type === "captions"),
    [timeline.tracks]
  );
  const voiceoverTrack = useMemo(
    () => timeline.tracks.find((t) => t.type === "voiceover"),
    [timeline.tracks]
  );
  const musicTrack = useMemo(
    () => timeline.tracks.find((t) => t.type === "music"),
    [timeline.tracks]
  );

  // 2. Active Video Clip
  const activeClip = useMemo(() => {
    if (!videoTrack || videoTrack.items.length === 0) return null;
    const clip = videoTrack.items.find(
      (item) => currentTime >= item.startTime && currentTime < item.endTime
    );
    return clip || videoTrack.items[videoTrack.items.length - 1];
  }, [videoTrack, currentTime]);

  // 3. Active Caption Item
  const activeCaption = useMemo(() => {
    if (!captionTrack || captionTrack.items.length === 0) return null;
    return (
      captionTrack.items.find(
        (item) => currentTime >= item.startTime && currentTime <= item.endTime
      ) || null
    );
  }, [captionTrack, currentTime]);

  // 4. Voiceover & Music Assets
  const voiceoverItem = voiceoverTrack?.items?.[0] || null;
  const musicItem = musicTrack?.items?.[0] || null;

  // Audio Ducking calculation
  const isVoiceoverActive = useMemo(() => {
    if (!voiceoverItem) return false;
    return currentTime >= voiceoverItem.startTime && currentTime <= voiceoverItem.endTime;
  }, [voiceoverItem, currentTime]);

  // 5. Synchronize HTML5 Video element with timeline currentTime
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeClip) return;

    const clipLocalOffset = Math.max(0, currentTime - activeClip.startTime);
    const sourceOffset = activeClip.metadata?.sourceOffset || 0;
    const targetVideoTime = sourceOffset + clipLocalOffset;

    if (Math.abs(video.currentTime - targetVideoTime) > 0.3) {
      video.currentTime = targetVideoTime;
    }

    if (isPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [activeClip, isPlaying, currentTime]);

  // 6. Synchronize Voiceover Audio
  useEffect(() => {
    const voiceAudio = voiceAudioRef.current;
    if (!voiceAudio || !voiceoverItem) return;

    if (currentTime >= voiceoverItem.startTime && currentTime <= voiceoverItem.endTime) {
      const targetTime = currentTime - voiceoverItem.startTime;
      if (Math.abs(voiceAudio.currentTime - targetTime) > 0.25) {
        voiceAudio.currentTime = targetTime;
      }
      if (isPlaying) {
        voiceAudio.play().catch(() => {});
      } else {
        voiceAudio.pause();
      }
    } else {
      voiceAudio.pause();
    }
  }, [voiceoverItem, isPlaying, currentTime]);

  // 7. Synchronize Background Music with Real-time Ducking
  useEffect(() => {
    const musicAudio = musicAudioRef.current;
    if (!musicAudio || !musicItem) return;

    const baseVolume = timeline.settings?.musicVolume ?? 0.16;
    // Live ducking: reduce volume by 55% during spoken voiceover
    const targetVolume = isVoiceoverActive ? baseVolume * 0.45 : baseVolume;
    musicAudio.volume = Math.max(0, Math.min(1, targetVolume));

    if (isPlaying) {
      musicAudio.play().catch(() => {});
    } else {
      musicAudio.pause();
    }
  }, [musicItem, isPlaying, isVoiceoverActive, timeline.settings?.musicVolume]);

  // 8. Progress Time ticking while playing
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      onTimeUpdate(Math.min(totalDuration, currentTime + 0.05));
      if (currentTime >= totalDuration) {
        if (isLooping) {
          onSeek(0);
        } else {
          onTogglePlay();
        }
      }
    }, 50);
    return () => clearInterval(interval);
  }, [isPlaying, currentTime, totalDuration, isLooping, onTimeUpdate, onSeek, onTogglePlay]);

  // Aspect ratio container styles
  const aspectRatioClass = useMemo(() => {
    if (timeline.aspectRatio === "16:9") return "aspect-[16/9] max-h-[460px] w-full max-w-[820px]";
    if (timeline.aspectRatio === "1:1") return "aspect-[1/1] max-h-[480px] w-full max-w-[480px]";
    return "aspect-[9/16] max-h-[520px] w-full max-w-[292px]"; // 9:16 vertical
  }, [timeline.aspectRatio]);

  // Ken Burns Motion style calculation for active clip
  const motionStyle = useMemo(() => {
    if (!activeClip) return {};
    const clipDur = Math.max(0.1, activeClip.duration);
    const progress = Math.min(1, Math.max(0, (currentTime - activeClip.startTime) / clipDur));
    const anim: MotionAnimationType = activeClip.animation || "none";

    if (anim === "slow_zoom_in") {
      const s = 1.0 + progress * 0.12;
      return { transform: `scale(${s})`, transition: "transform 0.08s linear" };
    }
    if (anim === "slow_zoom_out") {
      const s = 1.12 - progress * 0.12;
      return { transform: `scale(${s})`, transition: "transform 0.08s linear" };
    }
    if (anim === "pan_left") {
      const tx = 2 - progress * 4;
      return { transform: `scale(1.08) translateX(${tx}%)`, transition: "transform 0.08s linear" };
    }
    if (anim === "pan_right") {
      const tx = -2 + progress * 4;
      return { transform: `scale(1.08) translateX(${tx}%)`, transition: "transform 0.08s linear" };
    }
    return {};
  }, [activeClip, currentTime]);

  // Caption Styling
  const presetId = (timeline.settings?.captionPreset || "clean") as CaptionPresetId;
  const captionPreset = CAPTION_PRESETS[presetId] || CAPTION_PRESETS.clean;
  const captionPosition = timeline.settings?.captionPosition || "center";

  const captionPositionClass = useMemo(() => {
    if (captionPosition === "top") return "top-8";
    if (captionPosition === "bottom") return "bottom-12";
    return "top-1/2 -translate-y-1/2";
  }, [captionPosition]);

  function formatTimecode(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${ms}`;
  }

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center justify-center w-full h-full p-4 overflow-hidden select-none"
    >
      {/* Hidden Audio Elements */}
      {voiceoverItem?.source && (
        <audio ref={voiceAudioRef} src={voiceoverItem.source} preload="auto" />
      )}
      {musicItem?.source && (
        <audio ref={musicAudioRef} src={musicItem.source} preload="auto" loop />
      )}

      {/* Video Preview Canvas with Drag and Drop Support */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOverPreview(true);
        }}
        onDragLeave={() => setIsDragOverPreview(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOverPreview(false);
          const dataStr = e.dataTransfer.getData("application/json");
          if (!dataStr) return;
          try {
            const data = JSON.parse(dataStr);
            if (data.type === "broll" && onDropBRoll) {
              onDropBRoll(data, currentTime, activeClip?.id);
            }
          } catch (err) {}
        }}
        className={`relative ${aspectRatioClass} bg-black rounded-2xl overflow-hidden border transition-all flex items-center justify-center cursor-pointer ${
          isDragOverPreview
            ? "border-blue-500 ring-4 ring-blue-500/20 shadow-2xl"
            : "border-slate-300 shadow-xl"
        }`}
        onClick={() => {
          if (activeClip && onSelectClip) onSelectClip(activeClip);
          onTogglePlay();
        }}
      >
        {activeClip ? (
          <video
            ref={videoRef}
            src={activeClip.source}
            className="w-full h-full object-cover pointer-events-none"
            playsInline
            muted
            onLoadedData={() => setIsVideoLoaded(true)}
            style={motionStyle}
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <span className="text-3xl mb-2">🎬</span>
            <p className="text-xs font-mono">No video footage assigned</p>
          </div>
        )}

        {/* Transition Flash / Overlay */}
        {activeClip?.transition && activeClip.transition !== "cut" && (
          <motion.div
            key={activeClip.id}
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="absolute inset-0 bg-black pointer-events-none"
          />
        )}

        {/* Dynamic Kinetic Captions Layer */}
        {activeCaption && (
          <div
            className={`absolute left-4 right-4 ${captionPositionClass} flex items-center justify-center pointer-events-none z-20`}
          >
            <div
              className="text-center px-4 py-2 rounded-xl transition-all max-w-[92%]"
              style={{
                backgroundColor:
                  presetId === "highlight"
                    ? "rgba(10, 14, 22, 0.88)"
                    : presetId === "creator"
                    ? "rgba(0, 0, 0, 0.8)"
                    : "rgba(0, 0, 0, 0.6)",
                backdropFilter: "blur(6px)",
              }}
            >
              {activeCaption.metadata?.captionSegment?.words &&
              activeCaption.metadata.captionSegment.words.length > 0 ? (
                <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                  {activeCaption.metadata.captionSegment.words.map((w, wIdx) => {
                    const isWordActive =
                      currentTime >= w.start && currentTime <= w.end;

                    return (
                      <span
                        key={wIdx}
                        className={`font-black uppercase tracking-wide transition-all ${
                          isWordActive
                            ? "scale-110 drop-shadow-[0_0_14px_rgba(56,189,248,0.9)]"
                            : "opacity-90"
                        }`}
                        style={{
                          fontFamily:
                            presetId === "bold" || presetId === "creator"
                              ? "Impact, sans-serif"
                              : "Arial, sans-serif",
                          fontSize:
                            presetId === "bold" || presetId === "creator"
                              ? "24px"
                              : "19px",
                          color: isWordActive
                            ? captionPreset.highlightColor
                            : captionPreset.textColor,
                        }}
                      >
                        {w.word}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <span
                  className="font-black uppercase tracking-wide"
                  style={{
                    fontFamily:
                      presetId === "bold" || presetId === "creator"
                        ? "Impact, sans-serif"
                        : "Arial, sans-serif",
                    fontSize:
                      presetId === "bold" || presetId === "creator"
                        ? "22px"
                        : "18px",
                    color: captionPreset.textColor,
                  }}
                >
                  {activeCaption.source}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Audio Ducking Live Telemetry Badge */}
        {isVoiceoverActive && musicItem && (
          <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-black/70 backdrop-blur-md border border-purple-500/40 text-[9px] font-mono text-purple-300 flex items-center gap-1.5 pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            Music Ducked -6dB
          </div>
        )}

        {/* Drag-over Drop Indicator Overlay */}
        {isDragOverPreview && (
          <div className="absolute inset-0 bg-blue-900/60 backdrop-blur-xs border-2 border-dashed border-blue-400 rounded-2xl flex flex-col items-center justify-center p-4 z-40 pointer-events-none">
            <span className="text-3xl mb-2 animate-bounce">🎬</span>
            <span className="text-xs font-bold text-white">Drop B-Roll to Apply</span>
            <span className="text-[10px] font-mono text-blue-100 mt-1">
              Replaces scene footage at current playhead
            </span>
          </div>
        )}

        {/* Play/Pause Watermark on Pause */}
        {!isPlaying && !isDragOverPreview && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center cursor-pointer">
            <div className="w-12 h-12 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-xl hover:scale-110 transition-transform pl-0.5">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Floating Modern Transport Bar */}
      <div className="w-full max-w-md mt-3 flex items-center justify-between gap-3 px-4 py-2 rounded-xl bg-white/95 border border-slate-200/80 shadow-md backdrop-blur-md text-slate-800">
        {/* Step Backward -1s */}
        <button
          type="button"
          onClick={() => onSeek(Math.max(0, currentTime - 1))}
          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-mono cursor-pointer transition-colors"
          title="Step back 1 second"
        >
          -1s
        </button>

        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={onTogglePlay}
          className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs"
          title={isPlaying ? "Pause (Space)" : "Play (Space)"}
        >
          {isPlaying ? (
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Step Forward +1s */}
        <button
          type="button"
          onClick={() => onSeek(Math.min(totalDuration, currentTime + 1))}
          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-mono cursor-pointer transition-colors"
          title="Step forward 1 second"
        >
          +1s
        </button>

        {/* Timecode */}
        <span className="text-xs font-mono text-slate-800 font-medium">
          {formatTimecode(currentTime)} / {formatTimecode(totalDuration)}
        </span>

        {/* Loop Toggle */}
        <button
          type="button"
          onClick={() => setIsLooping((l) => !l)}
          className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
            isLooping ? "bg-slate-900 text-white font-medium shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
          title="Toggle Auto Loop"
        >
          Loop
        </button>

        {/* Aspect Ratio Badge */}
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-medium">
          {timeline.aspectRatio}
        </span>
      </div>
    </div>
  );
}
