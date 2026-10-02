"use client";

import React from "react";
import {
  AbsoluteFill,
  Sequence,
  Audio,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { VeeloxScene, VeeloxTimeline, VeeloxCaption } from "../lib/services/types";

export interface VeeloxCompositionProps {
  timeline: VeeloxTimeline;
  scenes: VeeloxScene[];
}

export const VeeloxVideoComposition: React.FC<VeeloxCompositionProps> = ({
  timeline,
  scenes,
}) => {
  const { fps } = useVideoConfig();

  let currentFrameOffset = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: "#08090C" }}>
      {/* 1. Visual Scenes Layer */}
      {scenes.map((scene, index) => {
        const sceneFrames = Math.max(1, Math.round((scene.duration || 5) * fps));
        const fromFrame = currentFrameOffset;
        currentFrameOffset += sceneFrames;

        return (
          <Sequence
            key={`scene_${scene.id}_${index}`}
            from={fromFrame}
            durationInFrames={sceneFrames}
          >
            <SceneRenderer scene={scene} durationInFrames={sceneFrames} />
          </Sequence>
        );
      })}

      {/* 2. Captions Layer */}
      {timeline.captionTrack && timeline.captionTrack.length > 0 && (
        <CaptionsLayer captions={timeline.captionTrack} fps={fps} />
      )}

      {/* 3. Audio Layer (Voiceover & Background Music) */}
      {scenes.map((scene, index) => {
        if (!scene.voiceAudioUrl) return null;
        let startFrame = 0;
        for (let i = 0; i < index; i++) {
          startFrame += Math.round((scenes[i].duration || 5) * fps);
        }
        const voiceFrames = Math.round((scene.voiceDuration || scene.duration || 5) * fps);

        return (
          <Sequence
            key={`voice_${scene.id}_${index}`}
            from={startFrame}
            durationInFrames={voiceFrames}
          >
            <Audio src={scene.voiceAudioUrl} volume={1.0} />
          </Sequence>
        );
      })}

      {/* Background Music if present */}
      {timeline.backgroundMusicUrl && (
        <Audio
          src={timeline.backgroundMusicUrl}
          volume={timeline.musicVolume ?? 0.15}
          loop
        />
      )}
    </AbsoluteFill>
  );
};

interface SceneRendererProps {
  scene: VeeloxScene;
  durationInFrames: number;
}

const SceneRenderer: React.FC<SceneRendererProps> = ({ scene, durationInFrames }) => {
  const frame = useCurrentFrame();

  // Ken Burns subtle cinematic zoom & pan
  const scale = interpolate(frame, [0, durationInFrames], [1.0, 1.12], {
    extrapolateRight: "clamp",
  });
  const translateY = interpolate(frame, [0, durationInFrames], [0, -15], {
    extrapolateRight: "clamp",
  });

  // Fade-in transition
  const opacity = interpolate(frame, [0, 10], [0.3, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {/* Background Image / Asset */}
      {scene.assetUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={scene.assetUrl}
          alt={scene.visualPrompt || "Scene visual"}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scale}) translateY(${translateY}px)`,
            opacity,
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg, #090D12 0%, #16202B 50%, #070B0E 100%)",
          }}
        />
      )}

      {/* Dark Vignette Overlay for High Contrast */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at center, rgba(6, 15, 22, 0.2) 0%, rgba(6, 15, 22, 0.85) 100%)",
        }}
      />

      {/* On-Screen Text Overlay */}
      {scene.onScreenText && (
        <div
          style={{
            position: "absolute",
            top: "16%",
            left: "8%",
            right: "8%",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              padding: "16px 28px",
              backgroundColor: "rgba(13, 19, 26, 0.88)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(0, 242, 152, 0.35)",
              borderRadius: "16px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
              textAlign: "center",
            }}
          >
            <span
              style={{
                fontFamily: "monospace",
                fontWeight: 900,
                fontSize: "26px",
                letterSpacing: "0.08em",
                color: "#FFFFFF",
                textTransform: "uppercase",
                textShadow: "0 2px 10px rgba(0,0,0,0.8)",
              }}
            >
              {scene.onScreenText}
            </span>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

interface CaptionsLayerProps {
  captions: VeeloxCaption[];
  fps: number;
}

const CaptionsLayer: React.FC<CaptionsLayerProps> = ({ captions, fps }) => {
  const frame = useCurrentFrame();
  const currentTime = frame / fps;

  // Find active caption
  const activeCaption = captions.find(
    (c) => currentTime >= c.startTime && currentTime <= c.endTime
  );

  if (!activeCaption) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: "18%",
        left: "6%",
        right: "6%",
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "8px 12px",
          padding: "12px 24px",
          backgroundColor: "rgba(6, 15, 22, 0.85)",
          borderRadius: "14px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(10px)",
          maxWidth: "88%",
        }}
      >
        {activeCaption.words && activeCaption.words.length > 0 ? (
          activeCaption.words.map((w, idx) => {
            const isWordActive = currentTime >= w.start && currentTime <= w.end;
            return (
              <span
                key={idx}
                style={{
                  fontFamily: "system-ui, sans-serif",
                  fontWeight: 900,
                  fontSize: "30px",
                  textTransform: "uppercase",
                  color: isWordActive ? "#00F298" : "#FFFFFF",
                  textShadow: isWordActive
                    ? "0 0 20px rgba(0, 242, 152, 0.8)"
                    : "0 2px 4px rgba(0, 0, 0, 0.8)",
                  transform: isWordActive ? "scale(1.15)" : "scale(1)",
                  transition: "all 0.1s ease",
                  display: "inline-block",
                }}
              >
                {w.word}
              </span>
            );
          })
        ) : (
          <span
            style={{
              fontFamily: "system-ui, sans-serif",
              fontWeight: 800,
              fontSize: "26px",
              color: "#00F298",
            }}
          >
            {activeCaption.text}
          </span>
        )}
      </div>
    </div>
  );
};
