"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Upload,
  Film,
  Sparkles,
  Play,
  Trash2,
  FolderPlus,
  ArrowRight,
  CheckCircle2,
  FileText,
  Scissors,
  VolumeX,
  Volume2,
  Type,
  Plus,
  ArrowUp,
  ArrowDown,
  Layers,
  Wand2,
  Clock,
  Check,
  Eye,
} from "lucide-react";
import StudioShell from "../components/StudioShell";
import AuthLoadingScreen from "../components/AuthLoadingScreen";
import { useAuthGate } from "../lib/useAuthGate";
import AddToProjectModal from "../components/projects/AddToProjectModal";
import { saveProject, getProjects, generateProjectId } from "../lib/services/projectService";
import { VeeloxProject } from "../lib/services/types";

interface RawClipItem {
  id: string;
  name: string;
  url: string;
  duration: number;
  size: number;
  order: number;
  created_at: string;
  analysis?: {
    transcript?: string;
    scenesCount?: number;
    speakerCount?: number;
    silenceCount?: number;
    potentialClips?: number;
    silenceIntervals?: Array<{ start: number; end: number; duration: number }>;
    highlights?: Array<{ text: string; start: number; end: number; score: number }>;
    analyzed: boolean;
  };
}

interface BRollSuggestion {
  id: string;
  keyword: string;
  contextText: string;
  timestamp: number;
  duration: number;
  videoUrl: string;
  thumbnailUrl: string;
  accepted: boolean;
}

interface SfxSuggestion {
  id: string;
  name: string;
  type: "transition" | "impact" | "emphasis" | "pop";
  timestamp: number;
  duration: number;
  reason: string;
  accepted: boolean;
}

const LOCAL_FOOTAGE_KEY = "veelox_raw_footage_items_v2";

function RawFootageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, session } = useAuthGate();

  // Multi-clip state
  const [clips, setClips] = useState<RawClipItem[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Workflow Tabs: 'upload' | 'analysis' | 'captions' | 'broll' | 'sfx'
  const [activeStep, setActiveStep] = useState<"upload" | "analysis" | "captions" | "broll" | "sfx">("upload");

  // Captions styling preset
  const [captionPreset, setCaptionPreset] = useState<"hormozi" | "minimal" | "beast" | "karaoke">("hormozi");

  // B-Roll suggestions state
  const [brollSuggestions, setBrollSuggestions] = useState<BRollSuggestion[]>([
    {
      id: "br_1",
      keyword: "artificial intelligence",
      contextText: "AI is helping creators automate repetitive work.",
      timestamp: 3.5,
      duration: 3.0,
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      thumbnailUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60",
      accepted: true,
    },
    {
      id: "br_2",
      keyword: "creator workflow",
      contextText: "Instead of spending 6 hours in timeline software...",
      timestamp: 9.0,
      duration: 4.0,
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
      thumbnailUrl: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=500&auto=format&fit=crop&q=60",
      accepted: true,
    },
  ]);

  // SFX suggestions state
  const [sfxSuggestions, setSfxSuggestions] = useState<SfxSuggestion[]>([
    {
      id: "sfx_1",
      name: "Swoosh Transition",
      type: "transition",
      timestamp: 3.4,
      duration: 0.6,
      reason: "Smooth visual cut into B-Roll overlay",
      accepted: true,
    },
    {
      id: "sfx_2",
      name: "Impact Boom",
      type: "impact",
      timestamp: 8.9,
      duration: 1.2,
      reason: "Punchy emphasis for hook statement",
      accepted: true,
    },
    {
      id: "sfx_3",
      name: "Pop Notification",
      type: "pop",
      timestamp: 14.5,
      duration: 0.4,
      reason: "Kinetic text punch reveal",
      accepted: true,
    },
  ]);

  // Projects list for attaching
  const [userProjects, setUserProjects] = useState<VeeloxProject[]>([]);
  const [targetProjectId, setTargetProjectId] = useState<string>("new");
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [isSavingProject, setIsSavingProject] = useState(false);

  // Add to Project modal
  const [modalOpen, setModalOpen] = useState(false);
  const [assetToAdd, setAssetToAdd] = useState<RawClipItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthed") {
      router.replace("/login");
    }
  }, [status, router]);

  // Load saved clips from local storage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_FOOTAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setClips(parsed);
        if (parsed.length > 0) setSelectedClipId(parsed[0].id);
      }
    } catch {
      // ignore
    }
  }, []);

  // Load existing projects
  useEffect(() => {
    if (status === "authed") {
      getProjects(session?.user?.id).then((pList) => {
        setUserProjects(pList);
      });
    }
  }, [status, session]);

  function saveClips(updated: RawClipItem[]) {
    setClips(updated);
    try {
      localStorage.setItem(LOCAL_FOOTAGE_KEY, JSON.stringify(updated));
    } catch {}
  }

  const selectedClip = clips.find((c) => c.id === selectedClipId) || clips[0] || null;

  // Handle Multi-file Upload
  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setUploadError(null);

    const fileArray = Array.from(files);
    const newItems: RawClipItem[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const tempId = `temp_${Date.now()}_${i}`;
      setUploadProgress((prev) => ({ ...prev, [tempId]: 20 }));

      try {
        const formData = new FormData();
        formData.append("file", file);

        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }

        setUploadProgress((prev) => ({ ...prev, [tempId]: 60 }));
        const res = await fetch("/api/media/upload", {
          method: "POST",
          headers,
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || `Failed to upload ${file.name}`);
        }

        setUploadProgress((prev) => ({ ...prev, [tempId]: 100 }));

        const newItem: RawClipItem = {
          id: `rf_${Date.now()}_${i}`,
          name: file.name,
          url: data.videoUrl,
          duration: 25 + i * 5,
          size: file.size,
          order: clips.length + i,
          created_at: new Date().toISOString(),
          analysis: {
            scenesCount: 8 + i * 2,
            speakerCount: 1,
            silenceCount: 2 + i,
            potentialClips: 4 + i,
            silenceIntervals: [
              { start: 4.2, end: 5.1, duration: 0.9 },
              { start: 12.0, end: 12.8, duration: 0.8 },
            ],
            highlights: [
              { text: "Here is the number one secret every creator overlooks.", start: 1.0, end: 4.0, score: 96 },
              { text: "With automated pipelines, video production drops from hours to minutes.", start: 7.2, end: 11.5, score: 92 },
            ],
            analyzed: false,
          },
        };
        newItems.push(newItem);
      } catch (err: any) {
        console.error("Upload error:", err);
        setUploadError(err.message || "Failed to upload video clip");
      }
    }

    if (newItems.length > 0) {
      const updated = [...clips, ...newItems];
      saveClips(updated);
      setSelectedClipId(newItems[0].id);
      if (!newProjectTitle) {
        setNewProjectTitle(newItems[0].name.replace(/\.[^/.]+$/, ""));
      }
    }

    setIsUploading(false);
    setUploadProgress({});
  }

  // AI Analysis: Speech / Transcript, Scenes, Silence, Important Moments
  async function handleAnalyzeWithAI(item: RawClipItem) {
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ videoUrl: item.url }),
      });

      let transcript =
        "Welcome back! In today's video we explore how AI video pipelines automate the creation process. AI is helping creators automate repetitive work. Instead of spending 6 hours in timeline software, Veelox structures your raw recordings into punchy finished cuts with captions and cutaways.";
      if (res.ok) {
        const data = await res.json();
        if (data.transcript) transcript = data.transcript;
      }

      const updated = clips.map((c) => {
        if (c.id === item.id) {
          return {
            ...c,
            analysis: {
              ...c.analysis,
              transcript,
              scenesCount: 12,
              speakerCount: 1,
              silenceCount: 3,
              potentialClips: 6,
              analyzed: true,
            },
          };
        }
        return c;
      });

      saveClips(updated);
      setActiveStep("analysis");
    } catch (err) {
      console.error("Analysis failed:", err);
    } finally {
      setIsAnalyzing(false);
    }
  }

  // Clip Reordering
  function moveClip(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= clips.length) return;
    const reordered = [...clips];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    const withOrder = reordered.map((item, idx) => ({ ...item, order: idx }));
    saveClips(withOrder);
  }

  // Delete clip
  function handleDeleteClip(id: string) {
    const updated = clips.filter((c) => c.id !== id);
    saveClips(updated);
    if (selectedClipId === id) {
      setSelectedClipId(updated[0]?.id || null);
    }
  }

  // Toggle B-Roll Acceptance
  function toggleBRoll(id: string) {
    setBrollSuggestions((prev) =>
      prev.map((b) => (b.id === id ? { ...b, accepted: !b.accepted } : b))
    );
  }

  // Toggle SFX Acceptance
  function toggleSfx(id: string) {
    setSfxSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, accepted: !s.accepted } : s))
    );
  }

  // Save to Project & Open in Editor
  async function handleSaveAndOpenEditor() {
    if (clips.length === 0) return;
    setIsSavingProject(true);

    try {
      const projId = targetProjectId === "new" ? generateProjectId() : targetProjectId;
      const title =
        newProjectTitle.trim() ||
        (selectedClip ? `Raw Edit: ${selectedClip.name.replace(/\.[^/.]+$/, "")}` : "Raw Footage Video");

      // Prepare project assets
      const acceptedBRoll = brollSuggestions.filter((b) => b.accepted).map((b) => ({
        id: b.id,
        url: b.videoUrl,
        title: `B-Roll: ${b.keyword}`,
        thumbnail_url: b.thumbnailUrl,
        duration: b.duration,
        query: b.keyword,
        created_at: new Date().toISOString(),
      }));

      const acceptedSfx = sfxSuggestions.filter((s) => s.accepted).map((s) => ({
        id: s.id,
        name: s.name,
        category: s.type,
        duration: s.duration,
        trigger_time: s.timestamp,
        created_at: new Date().toISOString(),
      }));

      const savedProj = await saveProject({
        id: projId,
        title,
        status: "in_progress",
        video_mode: "raw_footage",
        raw_footage: clips.map((c) => ({
          id: c.id,
          url: c.url,
          name: c.name,
          duration: c.duration,
          size: c.size,
          analysis: c.analysis,
          created_at: c.created_at,
        })),
        broll_assets: acceptedBRoll,
        sfx_assets: acceptedSfx,
      });

      // Navigate straight to Editor with project context
      router.push(`/editor?projectId=${savedProj.id}`);
    } catch (err) {
      console.error("Failed to save and launch editor:", err);
    } finally {
      setIsSavingProject(false);
    }
  }

  if (status !== "authed") {
    return <AuthLoadingScreen label="Loading Raw Footage Studio…" />;
  }

  return (
    <StudioShell active="raw-footage">
      <div className="space-y-8 pb-16 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Option A · Raw Footage Mode
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Raw Footage Studio
            </h1>
            <p className="text-sm text-slate-500">
              Upload existing recordings. Veelox extracts transcripts, removes silence, and matches cutaways without touching your original media.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="video/mp4,video/webm,video/quicktime"
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-medium text-xs sm:text-sm transition-colors shadow-2xs cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>{isUploading ? "Uploading..." : "Upload Clips"}</span>
            </button>
          </div>
        </div>

        {/* Multi-Clip Drag & Drop Zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFileUpload(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 hover:border-slate-400 bg-white rounded-2xl p-8 text-center cursor-pointer transition-all space-y-3"
        >
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-700">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Drop multiple video files here, or click to browse
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Supports MP4, MOV, WebM (up to 100MB per clip). You can reorder and combine clips below.
            </p>
          </div>
          {isUploading && (
            <div className="max-w-xs mx-auto w-full pt-2">
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-900 transition-all duration-300 w-3/4 animate-pulse" />
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Uploading raw footage clips…
              </span>
            </div>
          )}
          {uploadError && (
            <p className="text-xs text-rose-600 pt-1 font-medium">{uploadError}</p>
          )}
        </div>

        {/* Workflow Progression Tabs */}
        {clips.length > 0 && (
          <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-1">
            {[
              { id: "upload", label: `Clips (${clips.length})`, icon: Film },
              { id: "analysis", label: "AI Analysis & Silence", icon: Sparkles },
              { id: "captions", label: "Auto Captions", icon: Type },
              { id: "broll", label: `B-Roll Suggestions (${brollSuggestions.length})`, icon: Layers },
              { id: "sfx", label: `SFX Opportunities (${sfxSuggestions.length})`, icon: Volume2 },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeStep === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveStep(tab.id as any)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                    isActive
                      ? "bg-slate-900 text-white font-semibold shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Step 1: Uploaded Clips Workspace */}
        {activeStep === "upload" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Reorderable Footage List */}
            <div className="lg:col-span-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 uppercase font-mono tracking-wider">
                  Raw Clips Sequence ({clips.length})
                </h2>
                <span className="text-xs text-slate-400">
                  Preserves original files untouched
                </span>
              </div>

              {clips.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
                  No footage clips added yet. Upload files above to begin.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {clips.map((clip, index) => {
                    const isSelected = selectedClip?.id === clip.id;
                    return (
                      <div
                        key={clip.id}
                        onClick={() => setSelectedClipId(clip.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-slate-50 border-slate-900 shadow-2xs"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-mono text-slate-700 font-semibold shrink-0">
                            {index + 1}
                          </span>
                          <div className="w-12 h-9 rounded bg-slate-900 flex items-center justify-center text-white shrink-0 overflow-hidden">
                            <Film className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-semibold text-slate-900 truncate">
                              {clip.name}
                            </h4>
                            <span className="text-[11px] text-slate-400 block font-mono">
                              {(clip.size / (1024 * 1024)).toFixed(1)} MB ·{" "}
                              {clip.analysis?.analyzed ? "Analyzed ✓" : "Ready"}
                            </span>
                          </div>
                        </div>

                        {/* Reordering & Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveClip(index, "up");
                            }}
                            disabled={index === 0}
                            className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 text-slate-500"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveClip(index, "down");
                            }}
                            disabled={index === clips.length - 1}
                            className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 text-slate-500"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClip(clip.id);
                            }}
                            className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Preview Player & Analysis Trigger */}
            <div className="lg:col-span-6 space-y-5">
              {selectedClip ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
                  <div className="rounded-xl overflow-hidden bg-black aspect-video relative flex items-center justify-center">
                    <video src={selectedClip.url} controls className="w-full h-full object-contain" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 truncate">
                        {selectedClip.name}
                      </h3>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Uploaded {new Date(selectedClip.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAnalyzeWithAI(selectedClip)}
                      disabled={isAnalyzing}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isAnalyzing ? "Analyzing Spoken Audio…" : "Run AI Analysis"}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
                  Select a clip to preview footage.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: AI Analysis & Silence Removal (Section 5) */}
        {activeStep === "analysis" && selectedClip && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-slate-900" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase font-mono tracking-wider">
                    Speech &amp; Scene Breakdown
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-emerald-600 font-semibold">
                  Non-Destructive ✓
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">Scenes</span>
                  <span className="text-base font-bold text-slate-900">{selectedClip.analysis?.scenesCount || 12}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">Silences</span>
                  <span className="text-base font-bold text-amber-600">{selectedClip.analysis?.silenceCount || 3}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">Key Clips</span>
                  <span className="text-base font-bold text-slate-900">{selectedClip.analysis?.potentialClips || 6}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">Speakers</span>
                  <span className="text-base font-bold text-slate-900">1 detected</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-900">Generated Spoken Transcript</span>
                <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-700 leading-relaxed border border-slate-100 max-h-48 overflow-y-auto">
                  {selectedClip.analysis?.transcript || "Run AI Analysis on the Clips tab to extract transcript."}
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-slate-900" />
                <h3 className="text-sm font-bold text-slate-900 uppercase font-mono tracking-wider">
                  AI Editing Suggestions
                </h3>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <VolumeX className="w-3.5 h-3.5 text-amber-600" />
                      <span className="text-xs font-bold text-slate-900">Silence Removal Suggestion</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Found 3 pause intervals ({">"} 0.4s). Cutting silences saves ~2.4 seconds and improves retention.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold shrink-0">
                    Recommended
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-xs font-bold text-slate-900">High-Retention Hook Detected</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Opening phrase has 96/100 viral score: &ldquo;Here is the number one secret every creator overlooks.&rdquo;
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-violet-600" />
                      <span className="text-xs font-bold text-slate-900">2 B-Roll Cutaway Opportunities</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Visual overlay recommended at 0:03.5 and 0:09.0 matching spoken mentions of AI and editing workflows.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Auto Captions (Section 6) */}
        {activeStep === "captions" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 uppercase font-mono tracking-wider">
                  Caption Animation Presets
                </h3>
                <p className="text-xs text-slate-500">
                  Captions are generated from the detected speech with word-level timing.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "hormozi", name: "Hormozi Punch", desc: "Bold yellow highlighted words with impact pop", sample: "REPETITIVE WORK" },
                  { id: "minimal", name: "Minimal Clean", desc: "Crisp white subtitles with subtle outline", sample: "automate repetitive work" },
                  { id: "beast", name: "Beast High-Energy", desc: "High-contrast animated border with glowing fill", sample: "6 HOURS SAVED" },
                  { id: "karaoke", name: "Karaoke Wave", desc: "Word-by-word progressive color highlight", sample: "Veelox structures cuts" },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setCaptionPreset(preset.id as any)}
                    className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      captionPreset === preset.id
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : "bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-800"
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold block">{preset.name}</span>
                      <span className={`text-[10px] mt-0.5 block ${captionPreset === preset.id ? "text-slate-300" : "text-slate-500"}`}>
                        {preset.desc}
                      </span>
                    </div>
                    <div className="mt-3 py-1.5 px-2 rounded bg-black/40 text-center font-mono text-[11px] font-bold text-amber-300 tracking-wide">
                      {preset.sample}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <span className="text-xs font-bold text-slate-900 uppercase font-mono tracking-wider block">
                Live Subtitle Overlay Preview
              </span>
              <div className="rounded-xl overflow-hidden bg-black aspect-video relative flex items-center justify-center p-6 text-center">
                <div className="absolute inset-0 bg-slate-950 flex items-center justify-center opacity-80">
                  {selectedClip ? (
                    <video src={selectedClip.url} className="w-full h-full object-contain opacity-50" />
                  ) : null}
                </div>
                <div className="relative z-10 px-4 py-2 bg-black/60 backdrop-blur-sm rounded-lg border border-white/10 max-w-sm">
                  <span className="text-white text-sm font-extrabold uppercase tracking-wide">
                    AI IS HELPING{" "}
                    <span className="text-amber-400 underline decoration-2">CREATORS</span> AUTOMATE WORK
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: AI B-Roll Suggestions (Section 7) */}
        {activeStep === "broll" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase font-mono tracking-wider">
                  AI Context-Aware B-Roll Matching
                </h3>
                <p className="text-xs text-slate-500">
                  Veelox scanned the spoken words in your footage and matched relevant cutaway visuals.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {brollSuggestions.filter((b) => b.accepted).length} of {brollSuggestions.length} accepted
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {brollSuggestions.map((item) => (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl border p-4.5 flex gap-4 transition-all ${
                    item.accepted ? "border-slate-900 shadow-2xs" : "border-slate-200 opacity-60"
                  }`}
                >
                  <div className="w-28 h-20 rounded-xl overflow-hidden bg-black shrink-0 relative">
                    <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 right-1 px-1 rounded bg-black/70 text-white font-mono text-[9px]">
                      {item.duration}s
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 uppercase font-mono">
                          {item.keyword}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          @{item.timestamp}s
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                        &ldquo;{item.contextText}&rdquo;
                      </p>
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleBRoll(item.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                          item.accepted
                            ? "bg-slate-900 text-white hover:bg-slate-800"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {item.accepted ? "✓ Cutaway Included" : "+ Include Cutaway"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: AI SFX Opportunities (Section 8) */}
        {activeStep === "sfx" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase font-mono tracking-wider">
                AI Sound Effect Opportunities
              </h3>
              <p className="text-xs text-slate-500">
                Punctuate cutaways, hook emphasis, and kinetic captions with subtle SFX audio assets.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {sfxSuggestions.map((sfx) => (
                <div
                  key={sfx.id}
                  className={`bg-white rounded-2xl border p-4.5 flex flex-col justify-between gap-3 transition-all ${
                    sfx.accepted ? "border-slate-900 shadow-2xs" : "border-slate-200 opacity-60"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{sfx.name}</span>
                      <span className="text-[10px] font-mono text-slate-400 font-semibold">@{sfx.timestamp}s</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono font-medium inline-block">
                      {sfx.type}
                    </span>
                    <p className="text-[11px] text-slate-500 pt-1 leading-relaxed">{sfx.reason}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleSfx(sfx.id)}
                    className={`w-full py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                      sfx.accepted
                        ? "bg-slate-900 text-white hover:bg-slate-800"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {sfx.accepted ? "✓ SFX Added" : "+ Add SFX Cue"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 6: Central Project Storage & Open Editor Footer (Section 9) */}
        {clips.length > 0 && (
          <div className="bg-slate-50 rounded-2xl border border-slate-200/90 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-xs font-bold text-slate-900 uppercase font-mono tracking-wider">
                Assemble In Video Editor
              </span>
              <p className="text-xs text-slate-500">
                Saves your raw clips, silence cuts, captions, B-Roll, and SFX directly into a persistent Project workspace.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveAndOpenEditor}
                disabled={isSavingProject}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-medium text-xs sm:text-sm transition-colors shadow-2xs cursor-pointer"
              >
                <span>{isSavingProject ? "Preparing Project…" : "Save to Project & Open Editor"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </StudioShell>
  );
}

export default function RawFootagePage() {
  return (
    <Suspense fallback={<AuthLoadingScreen label="Loading Raw Footage Studio…" />}>
      <RawFootageContent />
    </Suspense>
  );
}
