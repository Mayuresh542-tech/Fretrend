"use client";

import { motion } from "framer-motion";

/**
 * Minimal, elegant session & route loading screen
 * aligned with the modern Veelox design system.
 */
export default function AuthLoadingScreen({
  label = "Loading your session…",
}: {
  label?: string;
}) {
  return (
    <main className="fixed inset-0 z-50 bg-[#FAFAFA] text-slate-900 antialiased flex flex-col justify-between select-none">
      {/* Top Brand Header */}
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-slate-200/80 bg-white/80 backdrop-blur-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center shadow-xs">
            <span className="text-white text-xs font-bold tracking-wider">V</span>
          </div>
          <span className="font-heading text-sm font-bold tracking-tight text-slate-900">
            Veelox
          </span>
          <span className="text-[11px] text-slate-400 font-mono pl-1 hidden sm:inline">
            Studio
          </span>
        </div>

        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200/80 text-[11px] font-mono text-slate-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Ready</span>
        </div>
      </header>

      {/* Center Minimal Loading Pod */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 -mt-8">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs flex flex-col items-center text-center">
          {/* Brand Icon with subtle breathing pulse */}
          <div className="relative w-14 h-14 mb-5 flex items-center justify-center">
            <div className="absolute inset-0 rounded-2xl bg-slate-100 animate-pulse" />
            <div className="relative w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center shadow-xs">
              <span className="text-white font-heading font-bold text-lg tracking-tight">V</span>
            </div>
          </div>

          {/* Animated Spinner Track */}
          <div className="w-full max-w-[200px] h-1 bg-slate-100 rounded-full overflow-hidden mb-5">
            <motion.div
              className="h-full bg-slate-900 rounded-full"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{
                repeat: Infinity,
                duration: 1.4,
                ease: "easeInOut",
              }}
              style={{ width: "50%" }}
            />
          </div>

          {/* Status Label */}
          <h1 className="text-base font-semibold text-slate-900 tracking-tight mb-1">
            {label}
          </h1>

          <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
            Preparing your creative workspace and project intelligence.
          </p>
        </div>
      </div>

      {/* Bottom Minimal Footer */}
      <footer className="w-full px-6 py-3.5 flex items-center justify-between border-t border-slate-200/80 text-[11px] font-mono text-slate-400 bg-white/60">
        <div className="flex items-center gap-2">
          <span>Veelox Creative Studio</span>
          <span>•</span>
          <span>v2.0</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>All systems operational</span>
        </div>
      </footer>
    </main>
  );
}
