import { supabase } from "../supabase";
import {
  VeeloxProject,
  ProjectRawFootage,
  ProjectBRollAsset,
  ProjectVoiceover,
  ProjectThumbnail,
  ProjectIdea,
  ProjectScriptItem,
  ProjectActivityItem,
} from "./types";

const LOCAL_STORAGE_KEY = "veelox_projects_v2";

function getLocalProjects(): VeeloxProject[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn("Failed to read local projects:", err);
    return [];
  }
}

function saveLocalProjects(projects: VeeloxProject[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projects));
  } catch (err) {
    console.warn("Failed to save local projects:", err);
  }
}

export function isUUID(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

export function generateProjectId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Unpack project assets stored in timeline JSONB if needed
function unpackProject(p: any): VeeloxProject {
  const assets = p?.timeline?.project_assets || {};
  return {
    ...p,
    video_mode: p.video_mode || assets.video_mode || "mixed",
    raw_footage: p.raw_footage || assets.raw_footage || [],
    broll_assets: p.broll_assets || assets.broll_assets || [],
    voiceovers: p.voiceovers || assets.voiceovers || [],
    thumbnails: p.thumbnails || assets.thumbnails || [],
    ideas: p.ideas || assets.ideas || [],
    scripts: p.scripts || assets.scripts || [],
    sfx_assets: p.sfx_assets || assets.sfx_assets || [],
    backgrounds: p.backgrounds || assets.backgrounds || [],
    typography_scenes: p.typography_scenes || assets.typography_scenes || [],
    activity: p.activity || assets.activity || [],
  };
}

export async function getProjects(userId?: string): Promise<VeeloxProject[]> {
  const localList = getLocalProjects().map(unpackProject);

  if (!userId) {
    return localList.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  try {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error || !data) {
      return localList.filter((p) => !p.user_id || p.user_id === userId);
    }

    const map = new Map<string, VeeloxProject>();
    localList.forEach((p) => map.set(p.id, p));
    data.forEach((p: any) => map.set(p.id, unpackProject(p)));

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  } catch {
    return localList;
  }
}

export async function getProject(id: string): Promise<VeeloxProject | null> {
  const localList = getLocalProjects();
  const localMatch = localList.find((p) => p.id === id);

  try {
    if (isUUID(id)) {
      const { data, error } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
      if (!error && data) {
        return unpackProject(data);
      }
    }
  } catch {
    // Fall back to local
  }

  return localMatch ? unpackProject(localMatch) : null;
}

export async function saveProject(
  projectData: Partial<VeeloxProject> & { id: string; title: string }
): Promise<VeeloxProject> {
  const now = new Date().toISOString();
  const validId = projectData.id || generateProjectId();

  const existing = (await getProject(validId)) || {
    id: validId,
    title: projectData.title,
    trend_topic: projectData.trend_topic || "",
    niche: projectData.niche || "general",
    status: "draft" as const,
    video_mode: projectData.video_mode || "mixed",
    aspect_ratio: "9:16" as const,
    duration: 60,
    scenes: [],
    raw_footage: [],
    broll_assets: [],
    voiceovers: [],
    thumbnails: [],
    ideas: [],
    scripts: [],
    sfx_assets: [],
    backgrounds: [],
    typography_scenes: [],
    activity: [],
    created_at: now,
    updated_at: now,
  };

  const updated: VeeloxProject = {
    ...existing,
    ...projectData,
    id: validId,
    video_mode: projectData.video_mode ?? existing.video_mode ?? "mixed",
    raw_footage: projectData.raw_footage ?? existing.raw_footage ?? [],
    broll_assets: projectData.broll_assets ?? existing.broll_assets ?? [],
    voiceovers: projectData.voiceovers ?? existing.voiceovers ?? [],
    thumbnails: projectData.thumbnails ?? existing.thumbnails ?? [],
    ideas: projectData.ideas ?? existing.ideas ?? [],
    scripts: projectData.scripts ?? existing.scripts ?? [],
    sfx_assets: projectData.sfx_assets ?? existing.sfx_assets ?? [],
    backgrounds: projectData.backgrounds ?? existing.backgrounds ?? [],
    typography_scenes: projectData.typography_scenes ?? existing.typography_scenes ?? [],
    activity: projectData.activity ?? existing.activity ?? [],
    updated_at: now,
  };

  // 1. Save to local storage
  const localList = getLocalProjects();
  const existingIndex = localList.findIndex((p) => p.id === updated.id);
  if (existingIndex >= 0) {
    localList[existingIndex] = updated;
  } else {
    localList.unshift(updated);
  }
  saveLocalProjects(localList);

  // 2. Try saving to Supabase if authenticated and ID is a valid UUID
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (userId) {
      updated.user_id = userId;
      if (isUUID(updated.id)) {
        // Embed asset arrays inside timeline JSONB to ensure 100% database persistence without schema changes
        const currentTimeline = updated.timeline || ({} as any);
        const timelineWithAssets = {
          ...currentTimeline,
          project_assets: {
            video_mode: updated.video_mode,
            raw_footage: updated.raw_footage,
            broll_assets: updated.broll_assets,
            voiceovers: updated.voiceovers,
            thumbnails: updated.thumbnails,
            ideas: updated.ideas,
            scripts: updated.scripts,
            sfx_assets: updated.sfx_assets,
            backgrounds: updated.backgrounds,
            typography_scenes: updated.typography_scenes,
            activity: updated.activity,
          },
        };

        const dbPayload = {
          id: updated.id,
          user_id: userId,
          title: updated.title,
          trend_topic: updated.trend_topic || null,
          niche: updated.niche || "general",
          status: updated.status || "draft",
          aspect_ratio: updated.aspect_ratio || "9:16",
          duration: typeof updated.duration === "number" ? updated.duration : 60,
          idea: updated.idea || null,
          research: updated.research || null,
          script: updated.script || null,
          scenes: updated.scenes || [],
          timeline: timelineWithAssets,
          captions: updated.captions || null,
          export_url: updated.export_url || null,
          thumbnail_url: updated.thumbnail_url || (updated.thumbnails?.[0]?.url || null),
          updated_at: now,
        };
        const { error: upsertErr } = await supabase
          .from("projects")
          .upsert(dbPayload, { onConflict: "id" });
        if (upsertErr) {
          console.warn("[ProjectService] Supabase sync warning:", upsertErr.message);
        }
      }
    }
  } catch (err) {
    console.warn("Supabase project sync failed (operating in offline/local mode):", err);
  }

  // 3. Dispatch in-browser event so UI updates reactively
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("veelox_project_saved", { detail: updated }));
    } catch {}
  }

  return updated;
}

export async function deleteProject(id: string): Promise<boolean> {
  const localList = getLocalProjects().filter((p) => p.id !== id);
  saveLocalProjects(localList);

  try {
    if (isUUID(id)) {
      await supabase.from("projects").delete().eq("id", id);
    }
  } catch {
    // Ignore error
  }

  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("veelox_project_deleted", { detail: { id } }));
    } catch {}
  }

  return true;
}

export type AssetTypeKey =
  | "raw_footage"
  | "raw"
  | "broll_assets"
  | "broll"
  | "voiceovers"
  | "voice"
  | "thumbnails"
  | "thumbnail"
  | "ideas"
  | "idea"
  | "scripts"
  | "script"
  | "captions"
  | "caption"
  | "sfx"
  | "sfx_assets"
  | "background"
  | "backgrounds"
  | "typography_scene"
  | "typography_scenes";

function normalizeAssetType(
  key: AssetTypeKey
): "raw_footage" | "broll_assets" | "voiceovers" | "thumbnails" | "ideas" | "scripts" | "sfx_assets" | "backgrounds" | "typography_scenes" {
  switch (key) {
    case "raw":
    case "raw_footage":
      return "raw_footage";
    case "broll":
    case "broll_assets":
      return "broll_assets";
    case "voice":
    case "voiceovers":
      return "voiceovers";
    case "thumbnail":
    case "thumbnails":
      return "thumbnails";
    case "idea":
    case "ideas":
      return "ideas";
    case "script":
    case "scripts":
      return "scripts";
    case "sfx":
    case "sfx_assets":
      return "sfx_assets";
    case "background":
    case "backgrounds":
      return "backgrounds";
    case "typography_scene":
    case "typography_scenes":
      return "typography_scenes";
    case "caption":
    case "captions":
    default:
      return "scripts";
  }
}

export async function addAssetToProject(
  projectId: string,
  assetType: AssetTypeKey,
  assetItem: any
): Promise<VeeloxProject | null> {
  const project = await getProject(projectId);
  if (!project) return null;

  const canonical = normalizeAssetType(assetType);
  const currentList = Array.isArray(project[canonical]) ? [...(project[canonical] as any[])] : [];
  currentList.unshift(assetItem);

  const actionText = `Added ${canonical.replace("_", " ")}: ${assetItem.name || assetItem.title || assetItem.voiceName || "Asset"}`;
  const currentActivity = Array.isArray(project.activity) ? [...project.activity] : [];
  currentActivity.unshift({
    id: `act_${Date.now()}`,
    action: actionText,
    timestamp: new Date().toISOString(),
  });

  const updates: Partial<VeeloxProject> = {
    [canonical]: currentList,
    activity: currentActivity,
  };

  if ((assetType === "caption" || assetType === "captions") && assetItem.segments) {
    updates.captions = assetItem.segments;
  }

  return await saveProject({
    ...project,
    ...updates,
  });
}

export async function removeAssetFromProject(
  projectId: string,
  assetType: AssetTypeKey,
  assetId: string
): Promise<VeeloxProject | null> {
  const project = await getProject(projectId);
  if (!project) return null;

  const canonical = normalizeAssetType(assetType);
  const currentList = Array.isArray(project[canonical]) ? [...(project[canonical] as any[])] : [];
  const filtered = currentList.filter((item: any) => item.id !== assetId);

  return await saveProject({
    ...project,
    [canonical]: filtered,
  });
}
