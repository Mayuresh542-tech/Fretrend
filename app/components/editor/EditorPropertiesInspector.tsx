"use client";

import React, { useState } from "react";
import {
  Sliders,
  RotateCcw,
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react";
import {
  VeeloxTimelineProject,
  TimelineItem,
  AspectRatio,
  MotionAnimationType,
  TransitionType,
  TimelineEffect,
  TimelineKeyframe,
  KeyframeProperty,
  KeyframeEasing,
} from "@/app/lib/timeline/types";
import { CaptionPresetId, CaptionPosition, CAPTION_PRESETS } from "@/app/lib/captions/presets";

interface EditorPropertiesInspectorProps {
  timeline: VeeloxTimelineProject;
  selectedClip: TimelineItem | null;
  onUpdateClip: (item: TimelineItem) => void;
  onUpdateSettings: (newSettings: Partial<VeeloxTimelineProject["settings"]>) => void;
  onUpdateAspectRatio: (ratio: AspectRatio) => void;
  onApplyStyleToAllCaptions?: () => void;
  isOpen?: boolean;
  onToggleOpen?: () => void;
}

type ClipInspectorTab =
  | "transform"
  | "video"
  | "color"
  | "speed"
  | "effects"
  | "audio"
  | "text"
  | "keyframes";

export default function EditorPropertiesInspector({
  timeline,
  selectedClip,
  onUpdateClip,
  onUpdateSettings,
  onUpdateAspectRatio,
  onApplyStyleToAllCaptions,
  isOpen = true,
  onToggleOpen,
}: EditorPropertiesInspectorProps) {
  const [activeTab, setActiveTab] = useState<ClipInspectorTab>("transform");

  // Keyframe builder state
  const [newKfProp, setNewKfProp] = useState<KeyframeProperty>("scale");
  const [newKfTime, setNewKfTime] = useState(0.5);
  const [newKfValue, setNewKfValue] = useState(1.1);
  const [newKfEasing, setNewKfEasing] = useState<KeyframeEasing>("ease_in_out");

  if (!isOpen) {
    return (
      <div className="w-12 h-full bg-white border-l border-slate-200 flex flex-col items-center py-3 gap-3 shrink-0 select-none">
        <button
          type="button"
          onClick={onToggleOpen}
          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
          title="Expand Properties Inspector"
        >
          <Sliders className="w-4 h-4" />
        </button>
        <span className="text-[10px] font-mono text-slate-400 [writing-mode:vertical-lr] tracking-widest uppercase mt-4">
          Inspector
        </span>
      </div>
    );
  }

  // Helper to reset transform
  function handleResetTransform() {
    if (!selectedClip) return;
    onUpdateClip({
      ...selectedClip,
      position: { x: 0, y: 0 },
      scale: 1,
      rotation: 0,
      opacity: 1,
      fit: "cover",
    });
  }

  // Helper to reset color
  function handleResetColor() {
    if (!selectedClip) return;
    onUpdateClip({
      ...selectedClip,
      colorAdjustments: {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        exposure: 0,
        temperature: 0,
        tint: 0,
        highlights: 0,
        shadows: 0,
        vignette: 0,
      },
      filterPreset: "none",
    });
  }

  // Helper to add keyframe
  function handleAddKeyframe() {
    if (!selectedClip) return;
    const existing = selectedClip.keyframes || [];
    const newKf: TimelineKeyframe = {
      id: `kf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      property: newKfProp,
      time: Math.max(0, Math.min(selectedClip.duration, newKfTime)),
      value: newKfValue,
      easing: newKfEasing,
    };
    onUpdateClip({
      ...selectedClip,
      keyframes: [...existing, newKf].sort((a, b) => a.time - b.time),
    });
  }

  // Helper to remove keyframe
  function handleRemoveKeyframe(kfId: string) {
    if (!selectedClip || !selectedClip.keyframes) return;
    onUpdateClip({
      ...selectedClip,
      keyframes: selectedClip.keyframes.filter((k) => k.id !== kfId),
    });
  }

  return (
    <div className="w-80 h-full bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-hidden select-none">
      {/* Header */}
      <div className="h-11 px-3 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-slate-700" />
          <span className="text-xs font-semibold text-slate-900 tracking-tight">
            {selectedClip ? "Clip Inspector" : "Project Settings"}
          </span>
        </div>
        {onToggleOpen && (
          <button
            type="button"
            onClick={onToggleOpen}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer transition-colors"
            title="Collapse Inspector"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Selected Clip Inspector Tabs Ribbon */}
      {selectedClip && (
        <div className="flex items-center border-b border-slate-200 bg-slate-50/80 overflow-x-auto custom-scrollbar shrink-0 px-1 py-1 gap-1">
          {[
            { id: "transform", label: "Transform" },
            { id: "video", label: "Video" },
            { id: "speed", label: "Speed" },
            { id: "color", label: "Color" },
            { id: "effects", label: "Effects" },
            { id: "audio", label: "Audio" },
            ...(selectedClip.track === "captions" || selectedClip.track === "text"
              ? [{ id: "text", label: "Text" }]
              : []),
            { id: "keyframes", label: "Keyframes" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as ClipInspectorTab)}
              className={`px-2 py-1 rounded-md text-[10px] font-medium whitespace-nowrap cursor-pointer transition-all ${
                activeTab === tab.id
                  ? "bg-slate-900 text-white shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Inspector Body Content */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4 custom-scrollbar">
        {selectedClip ? (
          <>
            {/* 1. TRANSFORM TAB */}
            {activeTab === "transform" && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">
                    Spatial Transform
                  </span>
                  <button
                    type="button"
                    onClick={handleResetTransform}
                    className="text-[10px] font-medium text-blue-600 hover:underline cursor-pointer"
                  >
                    Reset Transform
                  </button>
                </div>

                {/* Scale */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] font-mono text-slate-700">
                    <span>Scale</span>
                    <span className="font-bold text-slate-900">{Math.round((selectedClip.scale ?? 1.0) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="3.0"
                    step="0.05"
                    value={selectedClip.scale ?? 1.0}
                    onChange={(e) =>
                      onUpdateClip({ ...selectedClip, scale: parseFloat(e.target.value) })
                    }
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                  />
                </div>

                {/* Rotation */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] font-mono text-slate-700">
                    <span>Rotation</span>
                    <span className="font-bold text-slate-900">{selectedClip.rotation ?? 0}°</span>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="5"
                    value={selectedClip.rotation ?? 0}
                    onChange={(e) =>
                      onUpdateClip({ ...selectedClip, rotation: parseInt(e.target.value) })
                    }
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                  />
                </div>

                {/* Opacity */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] font-mono text-slate-700">
                    <span>Opacity</span>
                    <span className="font-bold text-slate-900">{Math.round((selectedClip.opacity ?? 1.0) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.05"
                    value={selectedClip.opacity ?? 1.0}
                    onChange={(e) =>
                      onUpdateClip({ ...selectedClip, opacity: parseFloat(e.target.value) })
                    }
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                  />
                </div>

                {/* Fit Mode */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-slate-500 uppercase font-bold">Fit Mode</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["cover", "contain", "fill"] as const).map((fit) => (
                      <button
                        key={fit}
                        type="button"
                        onClick={() => onUpdateClip({ ...selectedClip, fit })}
                        className={`py-1.5 rounded-lg text-xs font-medium capitalize cursor-pointer transition-colors ${
                          (selectedClip.fit || "cover") === fit
                            ? "bg-slate-900 text-white shadow-2xs font-semibold"
                            : "bg-slate-100 hover:bg-slate-200/70 border border-slate-200 text-slate-700"
                        }`}
                      >
                        {fit}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. VIDEO TAB */}
            {activeTab === "video" && (
              <div className="flex flex-col gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1">
                  <span className="text-[9px] font-mono text-slate-500 uppercase font-bold">Clip Title</span>
                  <span className="text-xs font-semibold text-slate-900 truncate">
                    {selectedClip.metadata?.title || "B-Roll Cutaway"}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Duration: {selectedClip.duration.toFixed(1)}s
                  </span>
                </div>

                {/* Motion / Ken Burns */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-slate-500 uppercase font-bold">
                    Motion Animation (Ken Burns)
                  </label>
                  <select
                    value={selectedClip.animation || "none"}
                    onChange={(e) =>
                      onUpdateClip({
                        ...selectedClip,
                        animation: e.target.value as MotionAnimationType,
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
                  >
                    <option value="none">None (Static Frame)</option>
                    <option value="slow_zoom_in">Slow Zoom In (Hook Focus)</option>
                    <option value="slow_zoom_out">Slow Zoom Out (Reveal)</option>
                    <option value="pan_left">Pan Left (Subtle)</option>
                    <option value="pan_right">Pan Right (Subtle)</option>
                  </select>
                </div>

                {/* Transition In */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-slate-500 uppercase font-bold">Transition In</label>
                  <select
                    value={selectedClip.transition || "cut"}
                    onChange={(e) =>
                      onUpdateClip({
                        ...selectedClip,
                        transition: e.target.value as TransitionType,
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
                  >
                    <option value="cut">Cut (Default Clean)</option>
                    <option value="dissolve">Cross Dissolve</option>
                    <option value="fade">Dip to Black</option>
                    <option value="dip_white">Dip to White</option>
                    <option value="slide">Slide Left</option>
                    <option value="zoom">Zoom In</option>
                    <option value="push">Push Left</option>
                    <option value="wipe">Linear Wipe</option>
                    <option value="blur">Motion Blur</option>
                  </select>
                </div>
              </div>
            )}

            {/* 3. SPEED TAB */}
            {activeTab === "speed" && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">
                    Playback Speed
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-900">
                    {(selectedClip.speed ?? 1.0).toFixed(2)}x
                  </span>
                </div>

                {/* Speed Presets Grid */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 4.0].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => onUpdateClip({ ...selectedClip, speed: spd })}
                      className={`py-1.5 rounded-lg text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                        (selectedClip.speed ?? 1.0) === spd
                          ? "bg-slate-900 text-white shadow-2xs"
                          : "bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200/70"
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>

                {/* Custom Speed Slider */}
                <input
                  type="range"
                  min="0.1"
                  max="4.0"
                  step="0.05"
                  value={selectedClip.speed ?? 1.0}
                  onChange={(e) =>
                    onUpdateClip({ ...selectedClip, speed: parseFloat(e.target.value) })
                  }
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                />

                {/* Speed Curve Presets */}
                <div className="flex flex-col gap-1 pt-2 border-t border-slate-200">
                  <label className="text-[10px] font-mono text-slate-500 uppercase font-bold">
                    Speed Curve Presets
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: "normal", label: "Normal (Constant)" },
                      { id: "montage", label: "Montage (Fast-Slow)" },
                      { id: "hero", label: "Hero (Slow-Mo Peak)" },
                      { id: "bullet", label: "Bullet Time" },
                    ].map((curve) => (
                      <button
                        key={curve.id}
                        type="button"
                        onClick={() =>
                          onUpdateClip({
                            ...selectedClip,
                            speedCurvePreset: curve.id as any,
                          })
                        }
                        className={`p-2 rounded-lg border text-left text-[10px] font-medium cursor-pointer transition-colors ${
                          selectedClip.speedCurvePreset === curve.id
                            ? "bg-slate-900 text-white border-slate-900 shadow-2xs font-semibold"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {curve.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 4. COLOR TAB */}
            {activeTab === "color" && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">
                    Color Adjustments
                  </span>
                  <button
                    type="button"
                    onClick={handleResetColor}
                    className="text-[10px] font-medium text-blue-600 hover:underline cursor-pointer"
                  >
                    Reset Color
                  </button>
                </div>

                {[
                  { key: "brightness", label: "Brightness", min: -50, max: 50 },
                  { key: "contrast", label: "Contrast", min: -50, max: 50 },
                  { key: "saturation", label: "Saturation", min: -100, max: 100 },
                  { key: "exposure", label: "Exposure", min: -50, max: 50 },
                  { key: "temperature", label: "Temperature", min: -50, max: 50 },
                  { key: "vignette", label: "Vignette", min: 0, max: 100 },
                ].map((item) => {
                  const currentVal =
                    (selectedClip.colorAdjustments as any)?.[item.key] ?? 0;

                  return (
                    <div key={item.key} className="flex flex-col gap-1">
                      <div className="flex justify-between text-[10px] font-mono text-slate-700">
                        <span>{item.label}</span>
                        <span className="font-bold text-slate-900">{currentVal}</span>
                      </div>
                      <input
                        type="range"
                        min={item.min}
                        max={item.max}
                        value={currentVal}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          onUpdateClip({
                            ...selectedClip,
                            colorAdjustments: {
                              brightness: 0,
                              contrast: 0,
                              saturation: 0,
                              exposure: 0,
                              temperature: 0,
                              tint: 0,
                              highlights: 0,
                              shadows: 0,
                              vignette: 0,
                              ...(selectedClip.colorAdjustments || {}),
                              [item.key]: val,
                            },
                          });
                        }}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* 5. EFFECTS TAB */}
            {activeTab === "effects" && (
              <div className="flex flex-col gap-3">
                <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">
                  Active Clip Effects
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {["glitch", "vhs", "rgb_split", "grain", "blur", "pixelate"].map((effType) => {
                    const hasEff = selectedClip.effects?.some((e) => e.type === effType);
                    return (
                      <button
                        key={effType}
                        type="button"
                        onClick={() => {
                          const current = selectedClip.effects || [];
                          if (hasEff) {
                            onUpdateClip({
                              ...selectedClip,
                              effects: current.filter((e) => e.type !== effType),
                            });
                          } else {
                            onUpdateClip({
                              ...selectedClip,
                              effects: [...current, { type: effType as any, intensity: 50 }],
                            });
                          }
                        }}
                        className={`p-2 rounded-lg border text-xs font-mono uppercase font-bold cursor-pointer transition-colors ${
                          hasEff
                            ? "bg-slate-900 border-slate-900 text-white shadow-2xs"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {effType.replace("_", " ")} {hasEff ? "✓" : "+"}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 6. AUDIO TAB */}
            {activeTab === "audio" && (
              <div className="flex flex-col gap-3">
                <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">
                  Audio Mixing
                </span>

                {/* Volume Slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] font-mono text-slate-700">
                    <span>Clip Volume</span>
                    <span className="font-bold text-slate-900">
                      {Math.round((selectedClip.volume ?? 1.0) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2.0"
                    step="0.05"
                    value={selectedClip.volume ?? 1.0}
                    onChange={(e) =>
                      onUpdateClip({ ...selectedClip, volume: parseFloat(e.target.value) })
                    }
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                  />
                </div>

                {/* Pan Slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] font-mono text-slate-700">
                    <span>Stereo Pan</span>
                    <span className="font-bold text-slate-900">
                      {selectedClip.pan === 0 || !selectedClip.pan
                        ? "Center"
                        : selectedClip.pan < 0
                        ? `${Math.abs(Math.round(selectedClip.pan * 100))}% Left`
                        : `${Math.round(selectedClip.pan * 100)}% Right`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.1"
                    value={selectedClip.pan ?? 0}
                    onChange={(e) =>
                      onUpdateClip({ ...selectedClip, pan: parseFloat(e.target.value) })
                    }
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                  />
                </div>
              </div>
            )}

            {/* 7. TEXT TAB (For captions & text overlays) */}
            {activeTab === "text" && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">
                    Text / Subtitle Content
                  </span>
                  {selectedClip.track === "captions" && (
                    <button
                      type="button"
                      onClick={() => onApplyStyleToAllCaptions?.()}
                      className="text-[10px] font-medium text-blue-600 hover:underline cursor-pointer"
                    >
                      Apply Style To All
                    </button>
                  )}
                </div>

                {/* Edit Text String */}
                <textarea
                  value={selectedClip.source}
                  onChange={(e) => onUpdateClip({ ...selectedClip, source: e.target.value })}
                  rows={3}
                  className="w-full p-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 resize-none focus:outline-none focus:ring-1 focus:ring-slate-400"
                />

                {/* Font Size & Weight */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono text-slate-500 font-bold uppercase">Font Size</label>
                    <input
                      type="number"
                      min="12"
                      max="120"
                      value={selectedClip.textStyle?.fontSize ?? 32}
                      onChange={(e) =>
                        onUpdateClip({
                          ...selectedClip,
                          textStyle: {
                            fontFamily: selectedClip.textStyle?.fontFamily || "Arial",
                            fontSize: parseInt(e.target.value),
                            fontWeight: selectedClip.textStyle?.fontWeight || 800,
                            color: selectedClip.textStyle?.color || "#FFFFFF",
                            textAlign: selectedClip.textStyle?.textAlign || "center",
                          },
                        })
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono text-slate-500 font-bold uppercase">Color</label>
                    <input
                      type="color"
                      value={selectedClip.textStyle?.color || "#FFFFFF"}
                      onChange={(e) =>
                        onUpdateClip({
                          ...selectedClip,
                          textStyle: {
                            fontFamily: selectedClip.textStyle?.fontFamily || "Arial",
                            fontSize: selectedClip.textStyle?.fontSize || 32,
                            fontWeight: selectedClip.textStyle?.fontWeight || 800,
                            color: e.target.value,
                            textAlign: selectedClip.textStyle?.textAlign || "center",
                          },
                        })
                      }
                      className="w-full h-8 rounded-lg cursor-pointer bg-white border border-slate-200 p-0.5"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 8. KEYFRAMES TAB */}
            {activeTab === "keyframes" && (
              <div className="flex flex-col gap-3">
                <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">
                  Animation Keyframes
                </span>

                {/* Add Keyframe Creator */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[9px] font-mono text-slate-500 uppercase font-bold">Property</label>
                      <select
                        value={newKfProp}
                        onChange={(e) => setNewKfProp(e.target.value as KeyframeProperty)}
                        className="px-2 py-1 rounded-md bg-white border border-slate-200 text-xs text-slate-900 cursor-pointer"
                      >
                        <option value="scale">Scale</option>
                        <option value="rotation">Rotation</option>
                        <option value="opacity">Opacity</option>
                        <option value="position_x">Position X</option>
                        <option value="position_y">Position Y</option>
                        <option value="volume">Volume</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <label className="text-[9px] font-mono text-slate-500 uppercase font-bold">Time (s)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max={selectedClip.duration}
                        value={newKfTime}
                        onChange={(e) => setNewKfTime(parseFloat(e.target.value))}
                        className="px-2 py-1 rounded-md bg-white border border-slate-200 text-xs text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[9px] font-mono text-slate-500 uppercase font-bold">Value</label>
                      <input
                        type="number"
                        step="0.1"
                        value={newKfValue}
                        onChange={(e) => setNewKfValue(parseFloat(e.target.value))}
                        className="px-2 py-1 rounded-md bg-white border border-slate-200 text-xs text-slate-900"
                      />
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <label className="text-[9px] font-mono text-slate-500 uppercase font-bold">Easing</label>
                      <select
                        value={newKfEasing}
                        onChange={(e) => setNewKfEasing(e.target.value as KeyframeEasing)}
                        className="px-2 py-1 rounded-md bg-white border border-slate-200 text-xs text-slate-900 cursor-pointer"
                      >
                        <option value="linear">Linear</option>
                        <option value="ease_in">Ease In</option>
                        <option value="ease_out">Ease Out</option>
                        <option value="ease_in_out">Ease In-Out</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddKeyframe}
                    className="w-full py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer transition-colors shadow-2xs mt-1"
                  >
                    + Add Keyframe
                  </button>
                </div>

                {/* Existing Keyframes List */}
                {selectedClip.keyframes && selectedClip.keyframes.length > 0 && (
                  <div className="flex flex-col gap-1.5 pt-1">
                    <span className="text-[10px] font-mono text-slate-500 font-bold uppercase">Keyframe Points:</span>
                    {selectedClip.keyframes.map((kf) => (
                      <div
                        key={kf.id}
                        className="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-xs font-mono"
                      >
                        <span className="text-slate-800 font-medium">
                          {kf.property} @ {kf.time.toFixed(1)}s = {kf.value}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyframe(kf.id)}
                          className="text-rose-500 hover:text-rose-700 font-bold px-1.5 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          /* GLOBAL PROJECT SETTINGS (When no clip is selected) */
          <div className="flex flex-col gap-4">
            {/* Aspect Ratio */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-slate-500 uppercase font-bold">
                Aspect Ratio
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["9:16", "16:9", "1:1", "4:5", "4:3"] as AspectRatio[]).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => onUpdateAspectRatio(ratio)}
                    className={`py-1.5 px-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                      timeline.aspectRatio === ratio
                        ? "bg-slate-900 text-white shadow-2xs"
                        : "bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* Captions Typography Presets */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-slate-500 uppercase font-bold">
                Global Caption Typography
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.keys(CAPTION_PRESETS).map((presetKey) => {
                  const p = CAPTION_PRESETS[presetKey as CaptionPresetId];
                  const isSelected = timeline.settings?.captionPreset === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onUpdateSettings({ captionPreset: p.id })}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? "bg-blue-50/80 border-blue-300 text-blue-900 shadow-2xs"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      <span className="text-xs font-bold block">{p.name}</span>
                      <span className="text-[10px] text-slate-500 line-clamp-1">{p.tagline}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Caption Position */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-slate-500 uppercase font-bold">
                Caption Position
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["top", "center", "bottom"] as CaptionPosition[]).map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => onUpdateSettings({ captionPosition: pos })}
                    className={`py-1.5 rounded-lg text-xs font-mono font-medium capitalize cursor-pointer transition-all ${
                      timeline.settings?.captionPosition === pos
                        ? "bg-slate-900 text-white shadow-2xs font-bold"
                        : "bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            {/* Audio Ducking & Music Volume */}
            <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono text-slate-700 uppercase font-bold">
                  Background Music
                </label>
                <span className="text-[10px] font-mono text-emerald-600 font-semibold">Auto-Ducked ✓</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-mono">Volume</span>
                <span className="text-slate-900 font-mono font-bold">
                  {Math.round((timeline.settings?.musicVolume ?? 0.16) * 100)}%
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="0.4"
                step="0.02"
                value={timeline.settings?.musicVolume ?? 0.16}
                onChange={(e) =>
                  onUpdateSettings({ musicVolume: parseFloat(e.target.value) })
                }
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
              />

              <span className="text-[10px] text-slate-500 leading-tight mt-0.5">
                Music automatically ducks down during voiceover speech.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
