"use client";

import React, { useRef, useMemo, useState, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  Scissors,
  Copy,
  Trash2,
  FastForward,
  Flag,
  Magnet,
  Maximize2,
  Minus,
  Plus,
  Video,
  Layers,
  Type,
  MessageSquare,
  Mic,
  Music,
  Bell,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  VeeloxTimelineProject,
  TimelineTrackType,
  TimelineItem,
  TimelineMarker,
} from "@/app/lib/timeline/types";

interface DraggingClipState {
  mode: "move" | "trim-start" | "trim-end";
  trackType: TimelineTrackType;
  itemId: string;
  initialStartTime: number;
  initialEndTime: number;
  initialDuration: number;
  startX: number;
  currentDeltaTime: number;
}

interface EditorMultiTrackTimelineProps {
  timeline: VeeloxTimelineProject;
  currentTime: number;
  selectedClipId: string | null;
  onSeek: (time: number) => void;
  onSelectClip: (item: TimelineItem) => void;
  onMoveClip: (trackType: TimelineTrackType, clipId: string, newStartTime: number) => void;
  onTrimClip: (
    trackType: TimelineTrackType,
    clipId: string,
    newStartTime: number,
    newEndTime: number
  ) => void;
  onSplitClip?: (time: number) => void;
  onDuplicateClip?: (trackType: TimelineTrackType, clipId: string) => void;
  onDeleteClip?: (trackType: TimelineTrackType, clipId: string) => void;
  onRippleDeleteClip?: (trackType: TimelineTrackType, clipId: string) => void;
  onAddMarker?: (time: number, label: string) => void;
  onDeleteMarker?: (markerId: string) => void;
  onDropBRoll: (
    brollData: { videoUrl: string; title?: string; thumbnail?: string; duration?: number; source?: string },
    targetTime?: number,
    targetClipId?: string
  ) => void;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  playbackSpeed?: number;
  onChangePlaybackSpeed?: (speed: number) => void;
}

export default function EditorMultiTrackTimeline({
  timeline,
  currentTime,
  selectedClipId,
  onSeek,
  onSelectClip,
  onMoveClip,
  onTrimClip,
  onSplitClip,
  onDuplicateClip,
  onDeleteClip,
  onRippleDeleteClip,
  onAddMarker,
  onDeleteMarker,
  onDropBRoll,
  isPlaying,
  onTogglePlay,
  playbackSpeed = 1,
  onChangePlaybackSpeed,
}: EditorMultiTrackTimelineProps) {
  const rulerRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const totalDuration = Math.max(1, timeline.duration);

  // Zoom factor: pixels per second
  const [zoomFactor, setZoomFactor] = useState(30);
  const [isSnappingEnabled, setIsSnappingEnabled] = useState(true);

  // In / Out range points
  const [inPoint, setInPoint] = useState<number | null>(null);
  const [outPoint, setOutPoint] = useState<number | null>(null);

  // Drag-and-drop B-roll hover state
  const [brollDropHoverTime, setBrollDropHoverTime] = useState<number | null>(null);
  const [hoveredClipDropTargetId, setHoveredClipDropTargetId] = useState<string | null>(null);

  // Interactive mouse drag state for moving / trimming clips & captions
  const [dragState, setDragState] = useState<DraggingClipState | null>(null);

  // Playhead scrubbing state
  const [isScrubbingPlayhead, setIsScrubbingPlayhead] = useState(false);

  // Track lock/mute state toggles
  const [mutedTracks, setMutedTracks] = useState<Record<string, boolean>>({});
  const [lockedTracks, setLockedTracks] = useState<Record<string, boolean>>({});

  function toggleTrackMute(trackId: string) {
    setMutedTracks((prev) => ({ ...prev, [trackId]: !prev[trackId] }));
  }

  function toggleTrackLock(trackId: string) {
    setLockedTracks((prev) => ({ ...prev, [trackId]: !prev[trackId] }));
  }

  const timelinePixelWidth = useMemo(
    () => Math.max(900, totalDuration * zoomFactor + 300),
    [totalDuration, zoomFactor]
  );

  // Ruler tick marks (every 1s, 2s, or 5s)
  const rulerTicks = useMemo(() => {
    const ticks: number[] = [];
    const step = zoomFactor < 20 ? 5 : zoomFactor < 35 ? 2 : 1;
    for (let t = 0; t <= totalDuration + 2; t += step) {
      ticks.push(t);
    }
    return ticks;
  }, [totalDuration, zoomFactor]);

  // Track references
  const videoTrack = timeline.tracks.find((t) => t.type === "video");
  const overlayTrack = timeline.tracks.find((t) => t.type === "overlays");
  const captionTrack = timeline.tracks.find((t) => t.type === "captions");
  const textTrack = timeline.tracks.find((t) => t.type === "text");
  const voiceoverTrack = timeline.tracks.find((t) => t.type === "voiceover");
  const musicTrack = timeline.tracks.find((t) => t.type === "music");
  const sfxTrack = timeline.tracks.find((t) => t.type === "sfx");

  // Selected item lookup
  let selectedItem: { item: TimelineItem; trackType: TimelineTrackType } | null = null;
  if (selectedClipId) {
    for (const track of timeline.tracks) {
      const it = track.items.find((i) => i.id === selectedClipId);
      if (it) {
        selectedItem = { item: it, trackType: track.type };
        break;
      }
    }
  }

  // Handle seeking from clientX
  const handleSeekFromClientX = useCallback(
    (clientX: number) => {
      if (!rulerRef.current) return;
      const rect = rulerRef.current.getBoundingClientRect();
      const clickX = clientX - rect.left;
      const targetTime = Math.max(0, Math.min(totalDuration, clickX / zoomFactor));
      onSeek(Math.round(targetTime * 100) / 100);
    },
    [totalDuration, zoomFactor, onSeek]
  );

  // Playhead scrubbing
  useEffect(() => {
    if (!isScrubbingPlayhead) return;

    function handleMouseMove(e: MouseEvent) {
      handleSeekFromClientX(e.clientX);
    }

    function handleMouseUp() {
      setIsScrubbingPlayhead(false);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isScrubbingPlayhead, handleSeekFromClientX]);

  // Moving and trimming clip handler
  useEffect(() => {
    if (!dragState) return;

    function handleMouseMove(e: MouseEvent) {
      if (!dragState) return;
      const deltaPixels = e.clientX - dragState.startX;
      let rawDeltaTime = deltaPixels / zoomFactor;

      if (isSnappingEnabled) {
        let candidateTime = dragState.initialStartTime + rawDeltaTime;
        if (dragState.mode === "trim-end") {
          candidateTime = dragState.initialEndTime + rawDeltaTime;
        }

        // Snap to playhead
        if (Math.abs(candidateTime - currentTime) < 0.25) {
          rawDeltaTime =
            dragState.mode === "trim-end"
              ? currentTime - dragState.initialEndTime
              : currentTime - dragState.initialStartTime;
        }
      }

      setDragState((prev) => (prev ? { ...prev, currentDeltaTime: rawDeltaTime } : null));
    }

    function handleMouseUp() {
      if (!dragState) return;
      const {
        mode,
        trackType,
        itemId,
        initialStartTime,
        initialEndTime,
        currentDeltaTime,
      } = dragState;

      if (Math.abs(currentDeltaTime) > 0.05) {
        if (mode === "move") {
          const newStart = Math.max(0, initialStartTime + currentDeltaTime);
          onMoveClip(trackType, itemId, newStart);
        } else if (mode === "trim-start") {
          const newStart = Math.max(
            0,
            Math.min(initialEndTime - 0.4, initialStartTime + currentDeltaTime)
          );
          onTrimClip(trackType, itemId, newStart, initialEndTime);
        } else if (mode === "trim-end") {
          const newEnd = Math.max(
            initialStartTime + 0.4,
            initialEndTime + currentDeltaTime
          );
          onTrimClip(trackType, itemId, initialStartTime, newEnd);
        }
      }

      setDragState(null);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    dragState,
    zoomFactor,
    isSnappingEnabled,
    currentTime,
    onMoveClip,
    onTrimClip,
  ]);

  function handleClipMouseDown(
    e: React.MouseEvent,
    item: TimelineItem,
    trackType: TimelineTrackType
  ) {
    if (lockedTracks[trackType]) return;
    e.stopPropagation();
    onSelectClip(item);

    const targetEl = e.currentTarget as HTMLElement;
    const rect = targetEl.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const edgeMargin = 12;

    let mode: "move" | "trim-start" | "trim-end" = "move";
    if (clickX <= edgeMargin) {
      mode = "trim-start";
    } else if (clickX >= rect.width - edgeMargin) {
      mode = "trim-end";
    }

    setDragState({
      mode,
      trackType,
      itemId: item.id,
      initialStartTime: item.startTime,
      initialEndTime: item.endTime,
      initialDuration: item.duration,
      startX: e.clientX,
      currentDeltaTime: 0,
    });
  }

  function formatTimecode(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${ms}`;
  }

  // Fit timeline to container width
  function handleFitTimeline() {
    if (scrollContainerRef.current) {
      const containerWidth = scrollContainerRef.current.clientWidth - 160;
      const fitZoom = Math.max(12, Math.min(60, Math.floor(containerWidth / totalDuration)));
      setZoomFactor(fitZoom);
    }
  }

  return (
    <div className="w-full h-full bg-white border-t border-slate-200 flex flex-col select-none">
      {/* 1. TOP TIMELINE TOOLBAR */}
      <div className="h-10 px-3 border-b border-slate-200 flex items-center justify-between text-xs text-slate-700 bg-slate-50/90 shrink-0">
        {/* Left: Transport, Timecode, and Core Editing Actions */}
        <div className="flex items-center gap-2">
          {onTogglePlay && (
            <button
              type="button"
              onClick={onTogglePlay}
              className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
            </button>
          )}

          {/* Timecode display */}
          <div className="flex items-center gap-1 font-mono text-[11px] bg-white px-2 py-1 rounded-md border border-slate-200 shadow-2xs">
            <span className="text-slate-900 font-bold">{formatTimecode(currentTime)}</span>
            <span className="text-slate-400">/</span>
            <span className="text-slate-500">{formatTimecode(totalDuration)}</span>
          </div>

          <div className="h-4 w-[1px] bg-slate-200 mx-1" />

          {/* Split Clip (S) */}
          <button
            type="button"
            onClick={() => onSplitClip?.(currentTime)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white hover:bg-slate-100 text-[11px] font-medium text-slate-700 border border-slate-200 cursor-pointer transition-colors shadow-2xs"
            title="Split selected video clip at current playhead position (S)"
          >
            <Scissors className="w-3 h-3 text-slate-500" />
            <span>Split</span>
          </button>

          {/* Duplicate Clip */}
          {selectedItem && onDuplicateClip && (
            <button
              type="button"
              onClick={() => onDuplicateClip(selectedItem.trackType, selectedItem.item.id)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white hover:bg-slate-100 text-[11px] font-medium text-slate-700 border border-slate-200 cursor-pointer transition-colors shadow-2xs"
              title="Duplicate selected clip"
            >
              <Copy className="w-3 h-3 text-slate-500" />
              <span>Duplicate</span>
            </button>
          )}

          {/* Delete Clip */}
          {selectedItem && onDeleteClip && (
            <button
              type="button"
              onClick={() => onDeleteClip(selectedItem.trackType, selectedItem.item.id)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-[11px] font-medium text-rose-700 border border-rose-200 cursor-pointer transition-colors shadow-2xs"
              title="Delete selected clip (Delete)"
            >
              <Trash2 className="w-3 h-3 text-rose-500" />
              <span>Delete</span>
            </button>
          )}

          {/* Ripple Delete */}
          {selectedItem && onRippleDeleteClip && (
            <button
              type="button"
              onClick={() => onRippleDeleteClip(selectedItem.trackType, selectedItem.item.id)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-[11px] font-medium text-amber-700 border border-amber-200 cursor-pointer transition-colors shadow-2xs"
              title="Ripple delete clip (removes gap)"
            >
              <FastForward className="w-3 h-3 text-amber-600" />
              <span>Ripple</span>
            </button>
          )}

          {/* Add Marker */}
          <button
            type="button"
            onClick={() => onAddMarker?.(currentTime, `Marker @ ${currentTime.toFixed(1)}s`)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white hover:bg-slate-100 text-[11px] font-medium text-slate-700 border border-slate-200 cursor-pointer transition-colors shadow-2xs"
            title="Add marker at playhead"
          >
            <Flag className="w-3 h-3 text-slate-500" />
            <span>Marker</span>
          </button>
        </div>

        {/* Center: In / Out points & Snapping */}
        <div className="flex items-center gap-2">
          {/* Set In Point */}
          <button
            type="button"
            onClick={() => setInPoint(currentTime)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
              inPoint !== null
                ? "bg-blue-50 text-blue-700 border border-blue-300 font-semibold"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
            title="Set In Point (I)"
          >
            [ In {inPoint !== null ? inPoint.toFixed(1) : ""}
          </button>

          {/* Set Out Point */}
          <button
            type="button"
            onClick={() => setOutPoint(currentTime)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
              outPoint !== null
                ? "bg-blue-50 text-blue-700 border border-blue-300 font-semibold"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
            title="Set Out Point (O)"
          >
            Out ] {outPoint !== null ? outPoint.toFixed(1) : ""}
          </button>

          {/* Snap toggle */}
          <button
            type="button"
            onClick={() => setIsSnappingEnabled((s) => !s)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
              isSnappingEnabled
                ? "bg-slate-900 border border-slate-900 text-white font-semibold shadow-2xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Magnet className="w-3 h-3" />
            <span>Snap {isSnappingEnabled ? "ON" : "OFF"}</span>
          </button>
        </div>

        {/* Right: Playback Speed & Zoom */}
        <div className="flex items-center gap-2">
          {/* Playback Speed */}
          {onChangePlaybackSpeed && (
            <select
              value={playbackSpeed}
              onChange={(e) => onChangePlaybackSpeed(parseFloat(e.target.value))}
              className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono text-slate-700 cursor-pointer shadow-2xs"
              title="Playback Speed"
            >
              <option value="0.5">0.5x</option>
              <option value="1">1.0x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2.0x</option>
            </select>
          )}

          {/* Fit Timeline */}
          <button
            type="button"
            onClick={handleFitTimeline}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-white hover:bg-slate-100 text-[10px] font-mono text-slate-700 border border-slate-200 cursor-pointer shadow-2xs"
            title="Fit timeline to view"
          >
            <Maximize2 className="w-3 h-3 text-slate-500" />
            <span>Fit</span>
          </button>

          {/* Zoom Slider */}
          <button
            type="button"
            onClick={() => setZoomFactor((z) => Math.max(12, z - 6))}
            className="w-5 h-5 rounded bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 cursor-pointer shadow-2xs"
          >
            <Minus className="w-3 h-3" />
          </button>
          <input
            type="range"
            min="12"
            max="60"
            value={zoomFactor}
            onChange={(e) => setZoomFactor(parseInt(e.target.value))}
            className="w-16 accent-slate-900"
          />
          <button
            type="button"
            onClick={() => setZoomFactor((z) => Math.min(60, z + 6))}
            className="w-5 h-5 rounded bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 2. MULTI-TRACK TIMELINE CANVAS AREA */}
      <div
        ref={scrollContainerRef}
        className="flex-1 flex overflow-x-auto overflow-y-auto relative custom-scrollbar bg-slate-50/50"
      >
        {/* Track Headers (Left Sticky Column) */}
        <div className="w-36 shrink-0 bg-white border-r border-slate-200 z-20 flex flex-col sticky left-0 shadow-xs">
          {/* Ruler Corner */}
          <div className="h-6 border-b border-slate-200 px-3 flex items-center justify-between text-[9px] font-mono text-slate-400 bg-slate-50">
            <span>TRACK</span>
            <span>TYPE</span>
          </div>

          {/* Overlays / V2 Track Header */}
          {overlayTrack && (
            <div className="h-10 px-2.5 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-800 bg-white">
              <div className="flex items-center gap-1.5 min-w-0">
                <Layers className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                <span className="text-[10px] leading-tight truncate">V2 Overlays</span>
              </div>
              <button
                type="button"
                onClick={() => toggleTrackMute("overlays")}
                className={`text-[9px] px-1 rounded ${
                  mutedTracks["overlays"] ? "text-rose-600 font-bold" : "text-slate-400 hover:text-slate-700"
                }`}
              >
                {mutedTracks["overlays"] ? "Muted" : "M"}
              </button>
            </div>
          )}

          {/* V1 Video Track Header */}
          <div className="h-14 px-2.5 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-800 bg-white">
            <div className="flex items-center gap-1.5 min-w-0">
              <Video className="w-4 h-4 text-blue-600 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] leading-tight truncate font-bold text-slate-900">V1 Primary</span>
                <span className="text-[8px] font-mono text-slate-400">B-Roll Footage</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => toggleTrackLock("video")}
                className="text-[10px] cursor-pointer p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-colors"
                title="Lock Track"
              >
                {lockedTracks["video"] ? <Lock className="w-3 h-3 text-amber-500" /> : <Unlock className="w-3 h-3 text-slate-400" />}
              </button>
            </div>
          </div>

          {/* Text Track Header (if text exists) */}
          {textTrack && (
            <div className="h-8 px-2.5 border-b border-slate-200 flex items-center gap-1.5 text-xs font-semibold text-slate-800 bg-white">
              <Type className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="text-[10px] leading-tight truncate">Text Layers</span>
            </div>
          )}

          {/* Captions Track Header */}
          <div className="h-9 px-2.5 border-b border-slate-200 flex items-center gap-1.5 text-xs font-semibold text-slate-800 bg-white">
            <MessageSquare className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span className="text-[10px] leading-tight truncate font-bold">Captions</span>
          </div>

          {/* Voiceover Track Header */}
          <div className="h-8 px-2.5 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-800 bg-white">
            <div className="flex items-center gap-1.5 min-w-0">
              <Mic className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-[10px] leading-tight truncate">Voiceover</span>
            </div>
            <button
              type="button"
              onClick={() => toggleTrackMute("voiceover")}
              className={`text-[9px] font-mono ${
                mutedTracks["voiceover"] ? "text-rose-600 font-bold" : "text-slate-400 hover:text-slate-700"
              }`}
            >
              M
            </button>
          </div>

          {/* Music Track Header */}
          <div className="h-8 px-2.5 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-800 bg-white">
            <div className="flex items-center gap-1.5 min-w-0">
              <Music className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span className="text-[10px] leading-tight truncate">Music (Ducked)</span>
            </div>
            <button
              type="button"
              onClick={() => toggleTrackMute("music")}
              className={`text-[9px] font-mono ${
                mutedTracks["music"] ? "text-rose-600 font-bold" : "text-slate-400 hover:text-slate-700"
              }`}
            >
              M
            </button>
          </div>

          {/* SFX Track Header */}
          {sfxTrack && (
            <div className="h-8 px-2.5 border-b border-slate-200 flex items-center gap-1.5 text-xs font-semibold text-slate-800 bg-white">
              <Bell className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span className="text-[10px] leading-tight truncate">SFX Track</span>
            </div>
          )}
        </div>

        {/* Tracks Canvas Area */}
        <div
          ref={rulerRef}
          onMouseDown={(e) => {
            handleSeekFromClientX(e.clientX);
            setIsScrubbingPlayhead(true);
          }}
          className="relative flex-1 flex flex-col cursor-pointer"
          style={{ width: `${timelinePixelWidth}px`, minWidth: "100%" }}
        >
          {/* Time Ruler */}
          <div className="h-6 border-b border-slate-200 relative bg-slate-100/90">
            {/* In / Out Selection Shaded Region */}
            {inPoint !== null && outPoint !== null && outPoint > inPoint && (
              <div
                className="absolute top-0 bottom-0 bg-blue-500/15 border-x border-blue-500/50 pointer-events-none"
                style={{
                  left: `${inPoint * zoomFactor}px`,
                  width: `${(outPoint - inPoint) * zoomFactor}px`,
                }}
              />
            )}

            {/* Ruler Tick Marks */}
            {rulerTicks.map((t) => {
              const x = t * zoomFactor;
              const isMajor = t % (zoomFactor < 20 ? 5 : zoomFactor < 35 ? 2 : 1) === 0;
              return (
                <div
                  key={t}
                  className="absolute top-0 bottom-0 flex flex-col justify-end pointer-events-none"
                  style={{ left: `${x}px` }}
                >
                  <div
                    className={`w-[1px] ${
                      isMajor ? "h-3 bg-slate-400" : "h-1.5 bg-slate-300"
                    }`}
                  />
                  {isMajor && (
                    <span className="text-[8px] font-mono text-slate-500 absolute -top-0.5 -left-2">
                      {t}s
                    </span>
                  )}
                </div>
              );
            })}

            {/* Markers on Ruler */}
            {timeline.settings?.markers?.map((mk) => (
              <div
                key={mk.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteMarker?.(mk.id);
                }}
                className="absolute top-0 bottom-0 flex items-center justify-center cursor-pointer group"
                style={{ left: `${mk.time * zoomFactor - 4}px` }}
                title={`${mk.label} (Click to delete marker)`}
              >
                <span className="text-xs -mt-1 group-hover:scale-125 transition-transform">🚩</span>
              </div>
            ))}
          </div>

          {/* TRACK: V2 Overlays (if present) */}
          {overlayTrack && (
            <div className="h-10 border-b border-slate-200 relative bg-slate-50/40">
              {overlayTrack.items.map((clip) => {
                const left = clip.startTime * zoomFactor;
                const width = Math.max(20, clip.duration * zoomFactor);
                const isSelected = selectedClipId === clip.id;
                return (
                  <div
                    key={clip.id}
                    onMouseDown={(e) => handleClipMouseDown(e, clip, "overlays")}
                    className={`absolute top-1 bottom-1 rounded-lg border px-2 flex items-center overflow-hidden text-[9px] font-mono select-none cursor-grab active:cursor-grabbing shadow-2xs ${
                      isSelected
                        ? "bg-pink-600 border-pink-700 text-white font-bold ring-2 ring-pink-400"
                        : "bg-pink-100 border-pink-300 text-pink-900 hover:bg-pink-200"
                    }`}
                    style={{ left: `${left}px`, width: `${width}px` }}
                  >
                    <span className="truncate">{clip.metadata?.title || "Overlay Item"}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* TRACK 1: Video / B-Roll Track (Supports Drag & Drop + Moving + Trimming) */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
              if (rulerRef.current) {
                const rect = rulerRef.current.getBoundingClientRect();
                const hoverTime = Math.max(0, (e.clientX - rect.left) / zoomFactor);
                setBrollDropHoverTime(Math.round(hoverTime * 10) / 10);
              }
            }}
            onDragLeave={() => {
              setBrollDropHoverTime(null);
              setHoveredClipDropTargetId(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              const hoverT = brollDropHoverTime;
              setBrollDropHoverTime(null);
              setHoveredClipDropTargetId(null);
              const dataStr = e.dataTransfer.getData("application/json");
              if (!dataStr) return;
              try {
                const data = JSON.parse(dataStr);
                if (data.type === "broll") {
                  onDropBRoll(data, hoverT ?? currentTime);
                }
              } catch (err) {
                console.warn("Invalid drop data:", err);
              }
            }}
            className="h-14 border-b border-slate-200 relative bg-slate-50/70 transition-colors"
          >
            {/* Visual B-Roll Drop Indicator Line */}
            {brollDropHoverTime !== null && (
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-blue-600 z-30 pointer-events-none shadow-md"
                style={{ left: `${brollDropHoverTime * zoomFactor}px` }}
              >
                <div className="px-1.5 py-0.5 rounded bg-blue-600 text-[8px] font-mono text-white font-bold whitespace-nowrap -ml-6 -mt-5 shadow-xs">
                  Drop B-Roll at {brollDropHoverTime.toFixed(1)}s
                </div>
              </div>
            )}

            {videoTrack?.items.map((clip) => {
              const isDraggingThis =
                dragState?.trackType === "video" && dragState?.itemId === clip.id;

              let renderStartTime = clip.startTime;
              let renderEndTime = clip.endTime;
              if (isDraggingThis) {
                if (dragState.mode === "move") {
                  renderStartTime = Math.max(0, clip.startTime + dragState.currentDeltaTime);
                  renderEndTime = renderStartTime + clip.duration;
                } else if (dragState.mode === "trim-start") {
                  renderStartTime = Math.max(
                    0,
                    Math.min(clip.endTime - 0.4, clip.startTime + dragState.currentDeltaTime)
                  );
                } else if (dragState.mode === "trim-end") {
                  renderEndTime = Math.max(
                    clip.startTime + 0.4,
                    clip.endTime + dragState.currentDeltaTime
                  );
                }
              }

              const left = renderStartTime * zoomFactor;
              const width = Math.max(24, (renderEndTime - renderStartTime) * zoomFactor);
              const isSelected = selectedClipId === clip.id;
              const isClipDropTarget = hoveredClipDropTargetId === clip.id;

              return (
                <div
                  key={clip.id}
                  onMouseDown={(e) => handleClipMouseDown(e, clip, "video")}
                  onDragOver={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setHoveredClipDropTargetId(clip.id);
                  }}
                  onDragLeave={() => {
                    if (hoveredClipDropTargetId === clip.id) {
                      setHoveredClipDropTargetId(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setHoveredClipDropTargetId(null);
                    const dataStr = e.dataTransfer.getData("application/json");
                    if (!dataStr) return;
                    try {
                      const data = JSON.parse(dataStr);
                      if (data.type === "broll") {
                        onDropBRoll(data, clip.startTime, clip.id);
                      }
                    } catch (err) {}
                  }}
                  className={`absolute top-1 bottom-1 rounded-xl border flex items-center overflow-hidden transition-all select-none group cursor-grab active:cursor-grabbing shadow-xs ${
                    isClipDropTarget
                      ? "border-blue-600 bg-blue-100 ring-2 ring-blue-500 z-20"
                      : isSelected
                      ? "bg-blue-600 border-blue-700 text-white ring-2 ring-blue-400 z-10"
                      : "bg-white border-slate-300 hover:border-slate-400 text-slate-800"
                  }`}
                  style={{ left: `${left}px`, width: `${width}px` }}
                  title={`${clip.metadata?.title || "B-Roll Scene"} (${(
                    renderEndTime - renderStartTime
                  ).toFixed(1)}s)`}
                >
                  {/* Left Trim Handle */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-3 hover:w-3.5 bg-blue-500/30 hover:bg-blue-500 flex items-center justify-center cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity z-20"
                    title="Drag to trim start"
                  >
                    <div className="w-[1px] h-3 bg-white rounded-full" />
                  </div>

                  {/* Thumbnail */}
                  {clip.metadata?.thumbnail && (
                    <img
                      src={clip.metadata.thumbnail}
                      alt="thumb"
                      className="w-10 h-full object-cover shrink-0 pointer-events-none border-r border-slate-200"
                    />
                  )}

                  {/* Clip Info */}
                  <div className="flex-1 flex flex-col justify-center px-1.5 min-w-0 pointer-events-none">
                    <span className={`text-[10px] font-bold truncate ${isSelected ? "text-white" : "text-slate-900"}`}>
                      {clip.metadata?.title || "B-Roll Scene"}
                    </span>
                    <div className="flex items-center gap-1 text-[8px] font-mono">
                      <span className={isSelected ? "text-blue-100" : "text-slate-500"}>
                        {(renderEndTime - renderStartTime).toFixed(1)}s
                      </span>
                      {clip.speed && clip.speed !== 1 && (
                        <span className={`font-bold ${isSelected ? "text-amber-300" : "text-amber-600"}`}>
                          {clip.speed}x
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Trim Handle */}
                  <div
                    className="absolute right-0 top-0 bottom-0 w-3 hover:w-3.5 bg-blue-500/30 hover:bg-blue-500 flex items-center justify-center cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity z-20"
                    title="Drag to trim end"
                  >
                    <div className="w-[1px] h-3 bg-white rounded-full" />
                  </div>

                  {/* Live Dragging Tooltip */}
                  {isDraggingThis && (
                    <div className="absolute top-0.5 left-2 px-1.5 py-0.5 rounded bg-slate-900 text-white text-[8px] font-mono font-bold shadow pointer-events-none z-30">
                      {renderStartTime.toFixed(1)}s - {renderEndTime.toFixed(1)}s
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* TRACK: Text Overlays Track (if present) */}
          {textTrack && (
            <div className="h-8 border-b border-slate-200 relative bg-slate-50/40">
              {textTrack.items.map((txt) => {
                const left = txt.startTime * zoomFactor;
                const width = Math.max(20, txt.duration * zoomFactor);
                const isSelected = selectedClipId === txt.id;
                return (
                  <div
                    key={txt.id}
                    onMouseDown={(e) => handleClipMouseDown(e, txt, "text")}
                    className={`absolute top-0.5 bottom-0.5 rounded-lg border px-1.5 flex items-center overflow-hidden text-[9px] font-mono cursor-grab active:cursor-grabbing shadow-2xs ${
                      isSelected
                        ? "bg-amber-500 border-amber-600 text-white font-bold ring-2 ring-amber-300 z-10"
                        : "bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200"
                    }`}
                    style={{ left: `${left}px`, width: `${width}px` }}
                  >
                    <span className="truncate">{txt.source}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* TRACK 2: Captions Track (Fully Movable & Trimmable) */}
          <div className="h-9 border-b border-slate-200 relative bg-slate-50/60">
            {captionTrack?.items.map((cap) => {
              const isDraggingThis =
                dragState?.trackType === "captions" && dragState?.itemId === cap.id;

              let renderStartTime = cap.startTime;
              let renderEndTime = cap.endTime;
              if (isDraggingThis) {
                if (dragState.mode === "move") {
                  renderStartTime = Math.max(0, cap.startTime + dragState.currentDeltaTime);
                  renderEndTime = renderStartTime + cap.duration;
                } else if (dragState.mode === "trim-start") {
                  renderStartTime = Math.max(
                    0,
                    Math.min(cap.endTime - 0.3, cap.startTime + dragState.currentDeltaTime)
                  );
                } else if (dragState.mode === "trim-end") {
                  renderEndTime = Math.max(
                    cap.startTime + 0.3,
                    cap.endTime + dragState.currentDeltaTime
                  );
                }
              }

              const left = renderStartTime * zoomFactor;
              const width = Math.max(20, (renderEndTime - renderStartTime) * zoomFactor);
              const isCurrent = currentTime >= cap.startTime && currentTime <= cap.endTime;

              return (
                <div
                  key={cap.id}
                  onMouseDown={(e) => handleClipMouseDown(e, cap, "captions")}
                  className={`absolute top-0.5 bottom-0.5 rounded-lg border px-1.5 flex items-center overflow-hidden transition-all text-[9px] font-mono select-none group cursor-grab active:cursor-grabbing shadow-2xs ${
                    isCurrent
                      ? "bg-sky-600 border-sky-700 text-white font-bold ring-2 ring-sky-300 z-10"
                      : "bg-sky-100 border-sky-300 text-sky-950 hover:bg-sky-200"
                  }`}
                  style={{ left: `${left}px`, width: `${width}px` }}
                  title={`Caption: "${cap.source}"`}
                >
                  {/* Left Trim Handle */}
                  <div className="absolute left-0 top-0 bottom-0 w-2 hover:bg-sky-400 flex items-center justify-center cursor-ew-resize opacity-0 group-hover:opacity-100 z-10">
                    <div className="w-[1px] h-2.5 bg-white" />
                  </div>

                  <span className="truncate flex-1 pointer-events-none">{cap.source}</span>

                  {/* Right Trim Handle */}
                  <div className="absolute right-0 top-0 bottom-0 w-2 hover:bg-sky-400 flex items-center justify-center cursor-ew-resize opacity-0 group-hover:opacity-100 z-10">
                    <div className="w-[1px] h-2.5 bg-white" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* TRACK 3: Voiceover Track (Spoken Audio with live indicator) */}
          <div className="h-8 border-b border-slate-200 relative bg-slate-50/40">
            {voiceoverTrack?.items.map((vo) => {
              const left = vo.startTime * zoomFactor;
              const width = Math.max(20, vo.duration * zoomFactor);
              return (
                <div
                  key={vo.id}
                  className="absolute top-0.5 bottom-0.5 rounded-md bg-emerald-100 border border-emerald-300 px-2 flex items-center justify-between text-[8px] font-mono text-emerald-950 overflow-hidden shadow-2xs"
                  style={{ left: `${left}px`, width: `${width}px` }}
                >
                  <span className="truncate font-semibold">🎙️ AI Spoken Voice</span>
                  <span className="text-[7px] text-emerald-700 font-medium">{vo.duration.toFixed(1)}s</span>
                </div>
              );
            })}
          </div>

          {/* TRACK 4: Background Music Track */}
          <div className="h-8 border-b border-slate-200 relative bg-slate-50/40">
            {musicTrack?.items.map((mus) => {
              const left = mus.startTime * zoomFactor;
              const width = Math.max(20, mus.duration * zoomFactor);
              return (
                <div
                  key={mus.id}
                  className="absolute top-0.5 bottom-0.5 rounded-md bg-purple-100 border border-purple-300 px-2 flex items-center justify-between text-[8px] font-mono text-purple-950 overflow-hidden shadow-2xs"
                  style={{ left: `${left}px`, width: `${width}px` }}
                >
                  <span className="truncate font-semibold">🎵 {mus.metadata?.title || "Music"}</span>
                  <span className="text-[7px] text-purple-700 font-medium">
                    Vol: {Math.round((timeline.settings?.musicVolume ?? 0.16) * 100)}%
                  </span>
                </div>
              );
            })}
          </div>

          {/* TRACK 5: SFX Track (if present) */}
          {sfxTrack && (
            <div className="h-8 border-b border-slate-200 relative bg-slate-50/40">
              {sfxTrack.items.map((sfx) => {
                const left = sfx.startTime * zoomFactor;
                const width = Math.max(16, sfx.duration * zoomFactor);
                return (
                  <div
                    key={sfx.id}
                    onMouseDown={(e) => handleClipMouseDown(e, sfx, "sfx")}
                    className="absolute top-0.5 bottom-0.5 rounded-md bg-teal-100 border border-teal-300 px-1.5 flex items-center text-[8px] font-mono text-teal-950 overflow-hidden cursor-grab shadow-2xs"
                    style={{ left: `${left}px`, width: `${width}px` }}
                  >
                    <span className="truncate">🔔 SFX</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* PLAYHEAD (Scrubbable Needle with Precision Line) */}
          <div
            className="absolute top-0 bottom-0 pointer-events-none z-30"
            style={{ left: `${currentTime * zoomFactor}px` }}
          >
            {/* Playhead Flag Handle */}
            <div className="w-3.5 h-3.5 -ml-[6px] -mt-0.5 bg-rose-500 rotate-45 rounded-xs shadow-md flex items-center justify-center">
              <div className="w-1 h-1 bg-white rounded-full" />
            </div>
            {/* Playhead Vertical Line */}
            <div className="w-[1.5px] h-full bg-rose-500 shadow-xs" />
          </div>
        </div>
      </div>
    </div>
  );
}
