"use client";
import { motion } from "framer-motion";
import AnimatedBackground from "./AnimatedBackground";

/**
 * Full-screen spinner shown while the auth gate resolves the session (and during
 * the brief window before an unauthed user is redirected). Keeping this in one
 * place means every gated page blocks render the same way instead of flashing
 * its content before the session check completes.
 */
export default function AuthLoadingScreen({ label = "Loading your session…" }: { label?: string }) {
  return (
    <main className="relative min-h-screen text-white flex items-center justify-center">
      <AnimatedBackground />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <motion.div
          className="w-12 h-12 rounded-full border-2 border-transparent border-t-purple-400 border-r-cyan-400"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <p className="text-white/50 text-sm">{label}</p>
      </div>
    </main>
  );
}
