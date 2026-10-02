"use client";

import { useState } from "react";
import Link from "next/link";
import StudioShell from "../components/StudioShell";
import AuthLoadingScreen from "../components/AuthLoadingScreen";
import { useAuthGate } from "../lib/useAuthGate";
import BRollManager from "../components/studio/BRollManager";

export default function AssetsPage() {
  const { status, session } = useAuthGate();
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<string>("");

  if (status !== "authed") {
    return <AuthLoadingScreen label="Loading media assets…" />;
  }

  return (
    <StudioShell active="assets">
      <div className="max-w-6xl mx-auto w-full py-6 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#1A2030]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-sky-400">
                MEDIA &amp; FOOTAGE HUB
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Personal Footage &amp; Pexels Stock B-Roll
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Upload your own video clips or search vertical stock videos to build high-retention cutaways.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
            {selectedVideoUrl ? (
              <Link
                href={`/create?video=${encodeURIComponent(selectedVideoUrl)}`}
                className="px-4 py-2 rounded-lg font-medium text-xs sm:text-sm bg-sky-500 hover:bg-sky-400 text-white shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                <span>Create Video with Footage</span>
                <span>→</span>
              </Link>
            ) : (
              <Link
                href="/create?mode=raw"
                className="px-4 py-2 rounded-lg font-medium text-xs sm:text-sm bg-sky-500 hover:bg-sky-400 text-white shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                <span>+</span>
                <span>Raw Footage Studio</span>
              </Link>
            )}
            <Link
              href="/broll"
              className="px-3.5 py-2 rounded-lg bg-[#11141E] hover:bg-[#161B28] border border-[#202738] text-slate-300 hover:text-white font-medium text-xs transition-colors cursor-pointer"
            >
              Requirements Finder →
            </Link>
          </div>
        </div>

        {/* BRoll Manager Interface */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#0D1017] border border-[#1A2030]">
          <BRollManager
            initialQuery="business technology"
            activeVideoUrl={selectedVideoUrl}
            onSelectVideo={(url, title) => {
              setSelectedVideoUrl(url || null);
              if (title) setSelectedTitle(title);
            }}
            authToken={session?.access_token}
          />
        </div>
      </div>
    </StudioShell>
  );
}
