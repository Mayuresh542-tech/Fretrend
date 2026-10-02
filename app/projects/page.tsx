"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Play, MoreVertical, Plus, Trash2, Edit3, Film, ArrowRight, Layers } from "lucide-react";
import StudioShell from "../components/StudioShell";
import AuthLoadingScreen from "../components/AuthLoadingScreen";
import { useAuthGate } from "../lib/useAuthGate";
import { getProjects, deleteProject } from "../lib/services/projectService";
import { VeeloxProject } from "../lib/services/types";
import CreateProjectModal from "../components/projects/CreateProjectModal";

const FILTER_STATUSES = ["All", "In Progress", "Completed", "Draft"] as const;
type FilterStatus = typeof FILTER_STATUSES[number];

const FALLBACK_PROJECTS = [
  {
    id: "proj_demo_1",
    title: "AI Tools in 2024",
    status: "Completed",
    timeAgo: "2 hours ago",
    thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60",
    duration: "0:45",
  },
  {
    id: "proj_demo_2",
    title: "Productivity Hacks",
    status: "In Progress",
    timeAgo: "5 hours ago",
    thumbnail: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=500&auto=format&fit=crop&q=60",
    duration: "0:30",
  },
  {
    id: "proj_demo_3",
    title: "The Future of Work",
    status: "Completed",
    timeAgo: "1 day ago",
    thumbnail: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=500&auto=format&fit=crop&q=60",
    duration: "1:00",
  },
  {
    id: "proj_demo_4",
    title: "Tech Trends",
    status: "Draft",
    timeAgo: "1 day ago",
    thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500&auto=format&fit=crop&q=60",
    duration: "0:15",
  },
  {
    id: "proj_demo_5",
    title: "Travel Vlog",
    status: "Completed",
    timeAgo: "2 days ago",
    thumbnail: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=500&auto=format&fit=crop&q=60",
    duration: "0:50",
  },
];

function ProjectsContent() {
  const router = useRouter();
  const { status, session } = useAuthGate();
  const [projects, setProjects] = useState<VeeloxProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("All");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthed") {
      router.replace("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authed" || !session) return;
    const userId = session.user.id;
    getProjects(userId)
      .then((list) => {
        setProjects(list || []);
      })
      .catch((err) => {
        console.error("Failed to fetch projects:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [status, session]);

  function formatTimeAgo(dateString?: string) {
    if (!dateString) return "Recently";
    const now = new Date();
    const past = new Date(dateString);
    const diffHours = Math.floor((now.getTime() - past.getTime()) / (1000 * 60 * 60));
    if (diffHours < 1) return "Just now";
    if (diffHours === 1) return "1 hour ago";
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "1 day ago";
    return `${diffDays} days ago`;
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setActiveMenuId(null);
    if (!confirm("Are you sure you want to delete this project?")) return;
    await deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  const allDisplayProjects = useMemo(() => {
    if (projects.length > 0) {
      return projects.map((p) => {
        const normStatus: FilterStatus =
          p.status === "exported" || p.status === "ready"
            ? "Completed"
            : p.status === "rendering" || p.status === "editing"
            ? "In Progress"
            : "Draft";

        const assetCount =
          (p.raw_footage?.length || 0) +
          (p.broll_assets?.length || 0) +
          (p.voiceovers?.length || 0) +
          (p.thumbnails?.length || 0) +
          (p.scripts?.length || 0) +
          (p.script ? 1 : 0);

        return {
          id: p.id,
          title: p.title || "Untitled Video",
          status: normStatus,
          timeAgo: formatTimeAgo(p.updated_at || p.created_at),
          thumbnail: p.thumbnail_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60",
          duration: `${Math.round(p.duration || 30)}s`,
          assetCount,
          isReal: true,
        };
      });
    }

    return FALLBACK_PROJECTS.map((p, idx) => ({
      ...p,
      status: p.status as FilterStatus,
      assetCount: idx === 0 ? 5 : idx === 1 ? 3 : 2,
      isReal: false,
    }));
  }, [projects]);

  const filteredProjects = useMemo(() => {
    if (activeFilter === "All") return allDisplayProjects;
    return allDisplayProjects.filter((p) => p.status === activeFilter);
  }, [allDisplayProjects, activeFilter]);

  if (status !== "authed") {
    return <AuthLoadingScreen label="Loading your video projects…" />;
  }

  return (
    <StudioShell active="projects">
      <div className="space-y-8 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              My Projects
            </h1>
            <p className="text-sm text-slate-500">
              Manage and organize all your video projects.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs sm:text-sm transition-colors shadow-xs self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>

        {/* Filter Pills (Screen 6) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {FILTER_STATUSES.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {filter}
              </button>
            );
          })}
        </div>

        {/* Clean Project Cards List (Screen 6) */}
        <div className="space-y-3">
          {filteredProjects.map((project) => {
            const statusColor =
              project.status === "Completed"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : project.status === "In Progress"
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "bg-slate-100 text-slate-600 border-slate-200";

            return (
              <div
                key={project.id}
                onClick={() => router.push(`/projects/${project.id}`)}
                className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 hover:border-slate-300 hover:shadow-xs transition-all flex items-center justify-between gap-4 cursor-pointer group"
              >
                {/* Left: Thumbnail & Details */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative w-16 h-12 sm:w-20 sm:h-14 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                    <img
                      src={project.thumbnail}
                      alt={project.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <Play className="w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>

                  <div className="space-y-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                      {project.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusColor}`}>
                        {project.status}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1 font-mono text-[11px] text-slate-500">
                        <Layers className="w-3 h-3 text-slate-400" />
                        {project.assetCount} {project.assetCount === 1 ? "asset" : "assets"}
                      </span>
                      <span>·</span>
                      <span>{project.timeAgo}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions Menu & Open in Editor */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/editor?projectId=${project.id}`);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium transition-colors"
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Open in Editor</span>
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(activeMenuId === project.id ? null : project.id);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      aria-label="Actions"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {activeMenuId === project.id && (
                      <div
                        className="absolute right-0 bottom-8 w-36 bg-white rounded-xl border border-slate-200 shadow-lg py-1 z-20 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            router.push(`/projects/${project.id}`);
                          }}
                          className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Project Detail</span>
                        </button>
                        {project.isReal && (
                          <button
                            type="button"
                            onClick={(e) => handleDelete(project.id, e)}
                            className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </StudioShell>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<AuthLoadingScreen label="Loading your video projects…" />}>
      <ProjectsContent />
    </Suspense>
  );
}
