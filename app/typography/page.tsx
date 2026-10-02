"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Type,
  Sparkles,
  Mic,
  Play,
  Pause,
  Film,
  Layers,
  Volume2,
  Music,
  ArrowRight,
  Check,
  RotateCcw,
  Palette,
  FileText,
  Sliders,
  CheckCircle2,
  FolderPlus,
  RefreshCw,
} from "lucide-react";
import StudioShell from "../components/StudioShell";
import AuthLoadingScreen from "../components/AuthLoadingScreen";
import { useAuthGate } from "../lib/useAuthGate";
import { saveProject, getProjects, generateProjectId } from "../lib/services/projectService";
import {
  VeeloxProject,
  ProjectTypographyScene,
  ProjectBackgroundAsset,
  ProjectBRollAsset,
  ProjectSfxAsset,
} from "../lib/services/types";

interface ContentKitState {
  topic: string;
  hook: string;
  script: string;
  keyPoints: string[];
  cta: string;
  visualSuggestions: string[];
}

interface VoiceItem {
  id: string;
  name: string;
  previewUrl: string;
  gender: string;
  tag: string;
}

const CURATED_VOICES: VoiceItem[] = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel (Narrative)", gender: "Female", tag: "Calm & Articulate", previewUrl: "" },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi (Punchy)", gender: "Female", tag: "Energetic & Direct", previewUrl: "" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella (Warm)", gender: "Female", tag: "Conversational", previewUrl: "" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni (Deep)", gender: "Male", tag: "Tech & Authority", previewUrl: "" },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam (Viral Hook)", gender: "Male", tag: "Dynamic & Deep", previewUrl: "" },
];

const BACKGROUND_PRESETS: ProjectBackgroundAsset[] = [
  {
    id: "bg_obsidian",
    type: "solid",
    name: "Obsidian Neutral",
    value: "#0A0D14",
    created_at: new Date().toISOString(),
  },
  {
    id: "bg_midnight_fade",
    type: "gradient",
    name: "Midnight Slate Gradient",
    value: "linear-gradient(180deg, #0F172A 0%, #020617 100%)",
    created_at: new Date().toISOString(),
  },
  {
    id: "bg_deep_space",
    type: "gradient",
    name: "Deep Space Titanium",
    value: "linear-gradient(135deg, #18181B 0%, #09090B 100%)",
    created_at: new Date().toISOString(),
  },
  {
    id: "bg_dark_texture",
    type: "image",
    name: "Subtle Studio Texture",
    value: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=70",
    created_at: new Date().toISOString(),
  },
  {
    id: "bg_ambient_loop",
    type: "video",
    name: "Subtle Ambient Grid Loop",
    value: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    created_at: new Date().toISOString(),
  },
];

function TypographyStudioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, session } = useAuthGate();

  // Initial params
  const initialTopic = searchParams.get("topic") || "";
  const initialScript = searchParams.get("script") || "";
  const initialProjectId = searchParams.get("projectId") || null;

  // Active step: 'script' | 'voice' | 'background' | 'typography' | 'broll' | 'sfx'
  const [activeStep, setActiveStep] = useState<"script" | "voice" | "background" | "typography" | "broll" | "sfx">("script");

  // Step 1: Content Kit
  const [contentKit, setContentKit] = useState<ContentKitState>({
    topic: initialTopic || "The Rise of Autonomous AI Agents",
    hook: "Most creators think AI is just for writing scripts. They are dead wrong.",
    script:
      initialScript ||
      "Most creators think AI is just for writing scripts. They are dead wrong.\n\nIn 2026, autonomous systems assemble the footage, cut dead air, and sync kinetic typography without touching a timeline.\n\nWhat used to take 6 hours now takes 90 seconds. If you aren't automating your video pipeline today, you're competing with creators who already are.",
    keyPoints: [
      "Traditional manual editing takes 6+ hours per video",
      "Autonomous systems automate cutting, subtitles, and B-roll",
      "Creators who adapt produce 10x more high-retention content",
    ],
    cta: "Start automating your creation pipeline now.",
    visualSuggestions: ["Fast code editor", "Creator working late", "AI interface terminal"],
  });
  const [isGeneratingKit, setIsGeneratingKit] = useState(false);

  // Step 2: Voiceover
  const [selectedVoice, setSelectedVoice] = useState<VoiceItem>(CURATED_VOICES[4]); // Adam
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [voiceDuration, setVoiceDuration] = useState<number>(32); // seconds
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Step 3: Background
  const [selectedBackground, setSelectedBackground] = useState<ProjectBackgroundAsset>(BACKGROUND_PRESETS[1]);

  // Step 4: Typography Engine
  const [typographyPreset, setTypographyPreset] = useState<"hormozi" | "minimal" | "tech" | "editorial">("hormozi");
  const [typographyScenes, setTypographyScenes] = useState<ProjectTypographyScene[]>([
    {
      id: "typo_1",
      order: 1,
      text: "Most creators think AI is just for writing scripts.",
      highlight_words: ["AI", "dead wrong"],
      animation_preset: "hormozi",
      start_time: 0,
      duration: 3.5,
      created_at: new Date().toISOString(),
    },
    {
      id: "typo_2",
      order: 2,
      text: "They are completely DEAD WRONG.",
      highlight_words: ["DEAD WRONG"],
      animation_preset: "hormozi",
      start_time: 3.5,
      duration: 2.2,
      created_at: new Date().toISOString(),
    },
    {
      id: "typo_3",
      order: 3,
      text: "In 2026, autonomous systems assemble the footage and sync kinetic typography.",
      highlight_words: ["autonomous systems", "kinetic typography"],
      animation_preset: "hormozi",
      start_time: 5.7,
      duration: 5.0,
      created_at: new Date().toISOString(),
    },
    {
      id: "typo_4",
      order: 4,
      text: "What used to take 6 hours now takes 90 SECONDS.",
      highlight_words: ["6 hours", "90 SECONDS"],
      animation_preset: "hormozi",
      start_time: 10.7,
      duration: 4.5,
      created_at: new Date().toISOString(),
    },
  ]);

  // Step 5: B-Roll matching
  const [brollMatches, setBrollMatches] = useState<Array<{
    id: string;
    keyword: string;
    sceneIndex: number;
    url: string;
    thumbnail: string;
    duration: number;
    accepted: boolean;
  }>>([
    {
      id: "bm_1",
      keyword: "autonomous systems",
      sceneIndex: 3,
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      thumbnail: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&auto=format&fit=crop&q=60",
      duration: 4.0,
      accepted: true,
    },
    {
      id: "bm_2",
      keyword: "timeline editing",
      sceneIndex: 4,
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
      thumbnail: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=500&auto=format&fit=crop&q=60",
      duration: 3.5,
      accepted: true,
    },
  ]);

  // Step 6: SFX & Music
  const [sfxItems, setSfxItems] = useState<ProjectSfxAsset[]>([
    { id: "sfx_t1", name: "Text Reveal Whoosh", category: "transition", duration: 0.5, trigger_time: 0, created_at: new Date().toISOString() },
    { id: "sfx_t2", name: "Sub Impact Boom", category: "impact", duration: 1.0, trigger_time: 3.5, created_at: new Date().toISOString() },
    { id: "sfx_t3", name: "Kinetic Pop Punch", category: "pop", duration: 0.3, trigger_time: 10.7, created_at: new Date().toISOString() },
  ]);
  const [includeMusic, setIncludeMusic] = useState(true);
  const [selectedMusicTrack, setSelectedMusicTrack] = useState("Lofi Tech Focus (120 BPM)");

  // Saving state
  const [isSavingProject, setIsSavingProject] = useState(false);

  useEffect(() => {
    if (status === "unauthed") {
      router.replace("/login");
    }
  }, [status, router]);

  // Generate or Regenerate Content Kit with AI
  async function handleGenerateContentKit() {
    setIsGeneratingKit(true);
    try {
      const res = await fetch("/api/ai/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          prompt: `Create a punchy viral short-form typography script about: "${contentKit.topic}". Return structured sections: hook, spoken script (approx 60-80 words), key points, and CTA. Tone: authoritative, direct, high retention.`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          const generatedScript = data.text.trim();
          setContentKit((prev) => ({
            ...prev,
            script: generatedScript,
          }));
          // Segment typography automatically
          segmentScriptIntoTypography(generatedScript);
        }
      }
    } catch (err) {
      console.error("AI Generation error:", err);
    } finally {
      setIsGeneratingKit(false);
    }
  }

  // Segment script into kinetic typography scenes
  function segmentScriptIntoTypography(scriptText: string) {
    const sentences = scriptText
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    let currentTime = 0;
    const newScenes: ProjectTypographyScene[] = sentences.map((sentence, idx) => {
      const wordCount = sentence.split(/\s+/).length;
      const duration = Math.max(2.0, Math.min(6.0, Number((wordCount * 0.4).toFixed(1))));
      const scene: ProjectTypographyScene = {
        id: `typo_${Date.now()}_${idx}`,
        order: idx + 1,
        text: sentence,
        highlight_words: sentence.split(/\s+/).slice(0, 2),
        animation_preset: typographyPreset,
        start_time: Number(currentTime.toFixed(1)),
        duration,
        created_at: new Date().toISOString(),
      };
      currentTime += duration;
      return scene;
    });

    setTypographyScenes(newScenes);
    setVoiceDuration(Math.max(20, Math.round(currentTime)));
  }

  // Generate Voiceover
  async function handleGenerateVoiceover() {
    setIsGeneratingVoice(true);
    try {
      const res = await fetch("/api/voice/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          text: contentKit.script,
          voiceId: selectedVoice.id,
          voiceName: selectedVoice.name,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Voice synthesis failed");
      }

      setGeneratedAudioUrl(data.audioUrl || data.url);
      if (data.duration) setVoiceDuration(Math.round(data.duration));
    } catch (err) {
      console.warn("Falling back to demo audio:", err);
      setGeneratedAudioUrl("https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg");
    } finally {
      setIsGeneratingVoice(false);
    }
  }

  function togglePlayAudio() {
    if (!audioPlayerRef.current) return;
    if (isPlayingAudio) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioPlayerRef.current.play().catch(() => {});
      setIsPlayingAudio(true);
    }
  }

  // Calculate word count & reading duration
  const wordCount = contentKit.script.trim().split(/\s+/).filter(Boolean).length;
  const estimatedReadTime = Math.round((wordCount / 140) * 60);

  // Save to Project & Launch Editor (Section 17)
  async function handleSaveAndOpenEditor() {
    setIsSavingProject(true);
    try {
      const projId = initialProjectId || generateProjectId();
      const title = `Typography: ${contentKit.topic.slice(0, 40)}`;

      const acceptedBRoll: ProjectBRollAsset[] = brollMatches
        .filter((b) => b.accepted)
        .map((b) => ({
          id: b.id,
          url: b.url,
          title: `B-Roll: ${b.keyword}`,
          thumbnail_url: b.thumbnail,
          duration: b.duration,
          query: b.keyword,
          created_at: new Date().toISOString(),
        }));

      const voiceoverAsset = generatedAudioUrl
        ? [
            {
              id: `vo_${Date.now()}`,
              url: generatedAudioUrl,
              audio_url: generatedAudioUrl,
              title: `Narration: ${selectedVoice.name}`,
              voiceName: selectedVoice.name,
              voiceId: selectedVoice.id,
              duration: voiceDuration,
              created_at: new Date().toISOString(),
            },
          ]
        : [];

      const saved = await saveProject({
        id: projId,
        title,
        status: "in_progress",
        video_mode: "typography",
        duration: voiceDuration || estimatedReadTime,
        backgrounds: [selectedBackground],
        typography_scenes: typographyScenes,
        broll_assets: acceptedBRoll,
        voiceovers: voiceoverAsset,
        sfx_assets: sfxItems,
        scripts: [
          {
            id: `sc_${Date.now()}`,
            title: contentKit.topic,
            content: contentKit.script,
            format: "Typography Video",
            word_count: wordCount,
            created_at: new Date().toISOString(),
          },
        ],
      });

      router.push(`/editor?projectId=${saved.id}`);
    } catch (err) {
      console.error("Failed to save typography project:", err);
    } finally {
      setIsSavingProject(false);
    }
  }

  if (status !== "authed") {
    return <AuthLoadingScreen label="Loading Typography Studio…" />;
  }

  return (
    <StudioShell active="create">
      <div className="space-y-8 pb-16 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold bg-violet-50 text-violet-700 border border-violet-200">
                Option B · Typography Mode
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Typography Video Studio
            </h1>
            <p className="text-sm text-slate-500">
              Create designed, faceless videos driven by synchronized typography, studio voiceovers, and contextual cutaways.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSaveAndOpenEditor}
            disabled={isSavingProject}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-medium text-xs sm:text-sm transition-colors shadow-2xs cursor-pointer self-start sm:self-auto"
          >
            <span>{isSavingProject ? "Preparing Project…" : "Save & Open in Editor"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Workflow Progression Stepper */}
        <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-1">
          {[
            { id: "script", label: "1. Content Kit", icon: FileText },
            { id: "voice", label: "2. Voiceover Timing", icon: Mic },
            { id: "background", label: "3. Background Style", icon: Palette },
            { id: "typography", label: "4. Typography Engine", icon: Type },
            { id: "broll", label: "5. Semantic B-Roll", icon: Layers },
            { id: "sfx", label: "6. SFX & Music", icon: Volume2 },
          ].map((step) => {
            const Icon = step.icon;
            const isActive = activeStep === step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStep(step.id as any)}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                  isActive
                    ? "bg-slate-900 text-white font-semibold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{step.label}</span>
              </button>
            );
          })}
        </div>

        {/* STEP 1: Content Kit & Script (Section 11) */}
        {activeStep === "script" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase font-mono text-slate-700">Topic / Core Hook</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={contentKit.topic}
                    onChange={(e) => setContentKit({ ...contentKit, topic: e.target.value })}
                    placeholder="Enter topic or question (e.g. Why deep work is rare)"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900 text-xs sm:text-sm text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateContentKit}
                    disabled={isGeneratingKit}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isGeneratingKit ? "Writing…" : "AI Script"}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase font-mono text-slate-700">Spoken Script</label>
                  <span className="text-[11px] font-mono text-slate-400">
                    {wordCount} words · ~{estimatedReadTime}s spoken
                  </span>
                </div>
                <textarea
                  rows={8}
                  value={contentKit.script}
                  onChange={(e) => {
                    const text = e.target.value;
                    setContentKit({ ...contentKit, script: text });
                    segmentScriptIntoTypography(text);
                  }}
                  placeholder="Paste or write your spoken video script here…"
                  className="w-full p-4 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900 text-xs sm:text-sm text-slate-800 leading-relaxed font-sans"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-400">
                  Script is broken into kinetic visual scenes automatically.
                </span>
                <button
                  type="button"
                  onClick={() => setActiveStep("voice")}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Next: Voiceover</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Right: Kit Takeaways */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <h3 className="text-xs font-bold uppercase font-mono text-slate-900 tracking-wider">
                Content Kit Breakdown
              </h3>

              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-slate-700 block">Viral Hook Angle</span>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 font-medium">
                  &ldquo;{contentKit.hook}&rdquo;
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-slate-700 block">Key Takeaways</span>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  {contentKit.keyPoints.map((pt, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-mono shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-slate-700 block">Call to Action</span>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700">
                  {contentKit.cta}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Voiceover Timing Backbone (Section 12) */}
        {activeStep === "voice" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 uppercase font-mono tracking-wider">
                  Curated Studio Voices
                </h3>
                <p className="text-xs text-slate-500">
                  The generated voiceover creates the timing backbone for kinetic typography and cutaway transitions.
                </p>
              </div>

              <div className="space-y-2">
                {CURATED_VOICES.map((voice) => {
                  const isSelected = selectedVoice.id === voice.id;
                  return (
                    <div
                      key={voice.id}
                      onClick={() => setSelectedVoice(voice)}
                      className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                          : "bg-white border-slate-200 hover:border-slate-300 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono text-xs font-bold ${
                            isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          <Mic className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold block">{voice.name}</span>
                          <span className={`text-[10px] font-mono ${isSelected ? "text-slate-300" : "text-slate-400"}`}>
                            {voice.gender} · {voice.tag}
                          </span>
                        </div>
                      </div>

                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleGenerateVoiceover}
                disabled={isGeneratingVoice}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isGeneratingVoice ? "Synthesizing Audio via AI…" : "Generate Voiceover Audio"}</span>
              </button>
            </div>

            {/* Audio Preview Card */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 uppercase font-mono tracking-wider">
                Timing Backbone Preview
              </h3>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-slate-900 flex items-center justify-center text-white cursor-pointer hover:scale-105 transition-transform" onClick={togglePlayAudio}>
                  {isPlayingAudio ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-900">{selectedVoice.name}</h4>
                  <span className="text-[11px] font-mono text-slate-400">
                    Duration: ~{voiceDuration}s · Synced with {typographyScenes.length} typography scenes
                  </span>
                </div>

                {generatedAudioUrl && (
                  <audio
                    ref={audioPlayerRef}
                    src={generatedAudioUrl}
                    onEnded={() => setIsPlayingAudio(false)}
                    className="hidden"
                  />
                )}
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setActiveStep("background")}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Next: Background</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Background Selection (Section 13) */}
        {activeStep === "background" && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 uppercase font-mono tracking-wider">
                Minimal &amp; Professional Backgrounds
              </h3>
              <p className="text-xs text-slate-500">
                Choose clean solids, subtle gradients, abstract textures, or moving loops. Strictly no neon or cyberpunk styling.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {BACKGROUND_PRESETS.map((bg) => {
                const isSelected = selectedBackground.id === bg.id;
                return (
                  <div
                    key={bg.id}
                    onClick={() => setSelectedBackground(bg)}
                    className={`rounded-2xl border p-4 cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                      isSelected ? "border-slate-900 shadow-md bg-slate-50" : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div
                      className="w-full h-32 rounded-xl overflow-hidden relative border border-black/10 flex items-center justify-center"
                      style={{
                        background: bg.type === "solid" || bg.type === "gradient" ? bg.value : "#000",
                      }}
                    >
                      {bg.type === "image" && (
                        <img src={bg.value} alt="" className="w-full h-full object-cover" />
                      )}
                      {bg.type === "video" && (
                        <video src={bg.value} autoPlay loop muted playsInline className="w-full h-full object-cover opacity-80" />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center p-3 text-center">
                        <span className="text-white text-xs font-bold drop-shadow-md tracking-wider uppercase font-mono">
                          PREVIEW TEXT
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">{bg.name}</span>
                        <span className="text-[10px] font-mono text-slate-400 capitalize">{bg.type} background</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-slate-900" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={() => setActiveStep("typography")}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Next: Typography Engine</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Kinetic Typography Engine (Section 14) */}
        {activeStep === "typography" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 uppercase font-mono tracking-wider">
                  Typography Preset Styles
                </h3>
                <p className="text-xs text-slate-500">
                  Intentional animated text styles timed to voiceover cadence.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "hormozi", name: "Hormozi Punch", desc: "Heavy uppercase with bright contrast words" },
                  { id: "minimal", name: "Minimal Editorial", desc: "Clean modern serif with subtle fade" },
                  { id: "tech", name: "Tech Explainer", desc: "Monospace tags with bold title reveal" },
                  { id: "editorial", name: "Documentary Clean", desc: "Spaced tracking and elegant reveal" },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setTypographyPreset(preset.id as any)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      typographyPreset === preset.id
                        ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                        : "bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-800"
                    }`}
                  >
                    <span className="text-xs font-bold block">{preset.name}</span>
                    <span className={`text-[10px] mt-0.5 block ${typographyPreset === preset.id ? "text-slate-300" : "text-slate-500"}`}>
                      {preset.desc}
                    </span>
                  </button>
                ))}
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold uppercase font-mono text-slate-800">
                  Timed Text Scenes ({typographyScenes.length})
                </span>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {typographyScenes.map((scene, idx) => (
                    <div key={scene.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-slate-800 font-medium leading-snug">{scene.text}</p>
                        <span className="text-[10px] font-mono text-slate-400 mt-1 block">
                          @{scene.start_time}s · {scene.duration}s duration
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Typography Live Canvas Preview */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <span className="text-xs font-bold text-slate-900 uppercase font-mono tracking-wider block">
                Visual Canvas Simulation
              </span>

              <div
                className="w-full aspect-video rounded-2xl overflow-hidden relative flex items-center justify-center p-8 text-center"
                style={{
                  background:
                    selectedBackground.type === "solid" || selectedBackground.type === "gradient"
                      ? selectedBackground.value
                      : "#05060A",
                }}
              >
                {selectedBackground.type === "image" && (
                  <img src={selectedBackground.value} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
                )}
                {selectedBackground.type === "video" && (
                  <video src={selectedBackground.value} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-40" />
                )}

                <div className="relative z-10 max-w-sm space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block">
                    KINETIC TYPOGRAPHY
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight uppercase leading-snug">
                    MOST CREATORS THINK{" "}
                    <span className="text-amber-400 underline decoration-2">AI IS JUST FOR</span> WRITING
                  </h2>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep("broll")}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Next: Semantic B-Roll</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Semantic B-Roll Matching (Section 15) */}
        {activeStep === "broll" && (
          <div className="space-y-5">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 uppercase font-mono tracking-wider">
                Contextual Cutaway Matching
              </h3>
              <p className="text-xs text-slate-500">
                Matched visuals to specific script moments. You can include or replace them as editable timeline layers.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {brollMatches.map((bm) => (
                <div
                  key={bm.id}
                  className={`bg-white rounded-2xl border p-4.5 flex gap-4 transition-all ${
                    bm.accepted ? "border-slate-900 shadow-2xs" : "border-slate-200 opacity-60"
                  }`}
                >
                  <div className="w-28 h-20 rounded-xl overflow-hidden bg-black shrink-0 relative">
                    <img src={bm.thumbnail} alt="" className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 right-1 px-1 rounded bg-black/70 text-white font-mono text-[9px]">
                      {bm.duration}s
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <span className="text-xs font-bold text-slate-900 uppercase font-mono block">
                        Keyword: {bm.keyword}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                        Matched to Scene #{bm.sceneIndex}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setBrollMatches((prev) =>
                          prev.map((item) => (item.id === bm.id ? { ...item, accepted: !item.accepted } : item))
                        )
                      }
                      className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors self-start ${
                        bm.accepted ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {bm.accepted ? "✓ Included" : "+ Include Cutaway"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={() => setActiveStep("sfx")}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Next: SFX &amp; Music</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: SFX & Music (Section 16) */}
        {activeStep === "sfx" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 uppercase font-mono tracking-wider">
                Punctuation SFX Cues
              </h3>
              <div className="space-y-2.5">
                {sfxItems.map((sfx) => (
                  <div key={sfx.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">{sfx.name}</span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {sfx.category} · @{sfx.trigger_time}s
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                      Active ✓
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 uppercase font-mono tracking-wider">
                Background Music Track
              </h3>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-slate-700" />
                    <span className="text-xs font-bold text-slate-900">{selectedMusicTrack}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeMusic}
                    onChange={(e) => setIncludeMusic(e.target.checked)}
                    className="rounded text-slate-900 focus:ring-slate-900"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Subtle background music automatically side-chains below voiceover speech in the Editor.
                </p>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveAndOpenEditor}
                  disabled={isSavingProject}
                  className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-medium text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
                >
                  <span>{isSavingProject ? "Preparing Project…" : "Save to Project & Open Editor"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </StudioShell>
  );
}

export default function TypographyStudioPage() {
  return (
    <Suspense fallback={<AuthLoadingScreen label="Loading Typography Studio…" />}>
      <TypographyStudioContent />
    </Suspense>
  );
}
