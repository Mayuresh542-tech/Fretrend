"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Sparkles,
  Video,
  FileText,
  TrendingUp,
  Lightbulb,
  FolderPlus,
  ArrowRight,
} from "lucide-react";
import { generateProjectId, saveProject } from "@/app/lib/services/projectService";
import { VeeloxProject } from "@/app/lib/services/types";
import { supabase } from "@/app/lib/supabase";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type StartingPoint = "blank" | "raw" | "trend" | "idea" | "script";

const STARTING_OPTIONS: Array<{
  id: StartingPoint;
  label: string;
  desc: string;
  icon: React.ReactNode;
}> = [
  {
    id: "blank",
    label: "Blank Project",
    desc: "Clean workspace. Add media, scripts, and audio in any order.",
    icon: <FolderPlus className="w-4 h-4 text-slate-500" />,
  },
  {
    id: "raw",
    label: "Raw Footage",
    desc: "Upload talking head or live clips, auto-transcribe, and detect scenes.",
    icon: <Video className="w-4 h-4 text-sky-500" />,
  },
  {
    id: "trend",
    label: "Trend Discovery",
    desc: "Search viral topics with high viewer demand and attach to project.",
    icon: <TrendingUp className="w-4 h-4 text-emerald-500" />,
  },
  {
    id: "idea",
    label: "Content Idea",
    desc: "Brainstorm high-converting hooks, angles, and formats with AI.",
    icon: <Lightbulb className="w-4 h-4 text-amber-500" />,
  },
  {
    id: "script",
    label: "Script Writer",
    desc: "Generate or draft spoken scripts with section markers and hooks.",
    icon: <FileText className="w-4 h-4 text-violet-500" />,
  },
];

export default function CreateProjectModal({ isOpen, onClose }: CreateProjectModalProps) {
  const router = useRouter();
  const [projectName, setProjectName] = useState("");
  const [startingPoint, setStartingPoint] = useState<StartingPoint>("blank");
  const [creating, setCreating] = useState(false);

  if (!isOpen) return null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const title = projectName.trim() || "Untitled Project";
    setCreating(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id || "demo_user";
      const newId = generateProjectId();

      const newProj: VeeloxProject = {
        id: newId,
        user_id: userId,
        title,
        trend_topic: title,
        niche: "General",
        status: "in_progress",
        aspect_ratio: "9:16",
        duration: 30,
        raw_footage: [],
        broll_assets: [],
        voiceovers: [],
        thumbnails: [],
        scripts: [],
        scenes: [],
        ideas: [],
        activity: [
          {
            id: `act_${Date.now()}`,
            action: `Project initialized via ${startingPoint} starting point`,
            description: `Project initialized via ${startingPoint} starting point`,
            timestamp: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await saveProject(newProj);

      onClose();

      // Route based on starting point
      if (startingPoint === "blank") {
        router.push(`/projects/${newId}`);
      } else if (startingPoint === "raw") {
        router.push(`/raw-footage?projectId=${newId}&title=${encodeURIComponent(title)}`);
      } else if (startingPoint === "trend") {
        router.push(`/trends?projectId=${newId}&title=${encodeURIComponent(title)}`);
      } else if (startingPoint === "idea") {
        router.push(`/ideas?projectId=${newId}&topic=${encodeURIComponent(title)}`);
      } else if (startingPoint === "script") {
        router.push(`/script?projectId=${newId}&topic=${encodeURIComponent(title)}`);
      }
    } catch (err) {
      console.error("Failed to create project:", err);
    } finally {
      setCreating(false);
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden p-6 space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Create a new project
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                A project connects all your independent media, scripts &amp; timelines.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            {/* Project Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Project Name
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. 5 AI Tools You Need in 2026"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-slate-900 font-sans"
                autoFocus
              />
            </div>

            {/* Starting Points */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Start with:
              </label>
              <div className="space-y-1.5">
                {STARTING_OPTIONS.map((opt) => {
                  const isSelected = startingPoint === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => setStartingPoint(opt.id)}
                      className={`p-2.5 rounded-xl border text-xs transition-all cursor-pointer flex items-start gap-3 ${
                        isSelected
                          ? "border-slate-900 bg-slate-50 text-slate-900 shadow-xs"
                          : "border-slate-200 hover:border-slate-300 text-slate-600"
                      }`}
                    >
                      <div className="pt-0.5 shrink-0">{opt.icon}</div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900 flex items-center justify-between">
                          <span>{opt.label}</span>
                          <span
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? "border-slate-900 bg-slate-900"
                                : "border-slate-300"
                            }`}
                          >
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          {opt.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors shadow-xs cursor-pointer"
              >
                <span>{creating ? "Creating…" : "Create Project"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
