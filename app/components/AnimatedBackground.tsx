"use client";
import { motion } from "framer-motion";

// Deterministic particle layout (avoids hydration mismatch from Math.random()).
const PARTICLES = [
  { left: "6%", top: "18%", size: 5, color: "#7c3aed", delay: 0.0, duration: 9 },
  { left: "14%", top: "62%", size: 4, color: "#06b6d4", delay: 1.2, duration: 11 },
  { left: "22%", top: "32%", size: 6, color: "#7c3aed", delay: 0.6, duration: 10 },
  { left: "31%", top: "78%", size: 3, color: "#06b6d4", delay: 2.0, duration: 12 },
  { left: "39%", top: "12%", size: 5, color: "#a855f7", delay: 1.5, duration: 9.5 },
  { left: "47%", top: "54%", size: 4, color: "#06b6d4", delay: 0.3, duration: 13 },
  { left: "55%", top: "26%", size: 6, color: "#7c3aed", delay: 2.4, duration: 10.5 },
  { left: "63%", top: "70%", size: 3, color: "#22d3ee", delay: 0.9, duration: 11.5 },
  { left: "71%", top: "16%", size: 5, color: "#7c3aed", delay: 1.8, duration: 9 },
  { left: "78%", top: "48%", size: 4, color: "#06b6d4", delay: 0.4, duration: 12.5 },
  { left: "85%", top: "72%", size: 6, color: "#a855f7", delay: 2.2, duration: 10 },
  { left: "92%", top: "30%", size: 4, color: "#06b6d4", delay: 1.1, duration: 11 },
  { left: "9%", top: "88%", size: 3, color: "#7c3aed", delay: 1.6, duration: 13 },
  { left: "50%", top: "90%", size: 5, color: "#22d3ee", delay: 0.7, duration: 9.5 },
  { left: "67%", top: "92%", size: 4, color: "#7c3aed", delay: 2.6, duration: 12 },
  { left: "88%", top: "10%", size: 5, color: "#06b6d4", delay: 1.3, duration: 10.5 },
];

export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-[#0a0a0a] pointer-events-none">
      {/* Animated grid, faded toward the edges */}
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(124,58,237,0.13) 1px, transparent 1px), linear-gradient(to bottom, rgba(6,182,212,0.10) 1px, transparent 1px)",
          backgroundSize: "46px 46px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, black 25%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, black 25%, transparent 80%)",
        }}
        animate={{ backgroundPosition: ["0px 0px", "46px 46px"] }}
        transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
      />

      {/* Drifting gradient blobs */}
      <motion.div
        className="absolute -top-40 left-[20%] h-[520px] w-[520px] rounded-full bg-purple-600/20 blur-[130px]"
        animate={{ x: [0, 70, 0], y: [0, 50, 0], scale: [1, 1.12, 1] }}
        transition={{ duration: 19, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-[28%] right-[12%] h-[440px] w-[440px] rounded-full bg-cyan-500/15 blur-[130px]"
        animate={{ x: [0, -60, 0], y: [0, 60, 0], scale: [1, 1.18, 1] }}
        transition={{ duration: 23, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[-10%] left-[45%] h-[400px] w-[400px] rounded-full bg-fuchsia-600/10 blur-[130px]"
        animate={{ x: [0, 40, 0], y: [0, -40, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Floating particles */}
      {PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: `0 0 ${p.size * 2.5}px ${p.color}`,
          }}
          animate={{ y: [0, -34, 0], opacity: [0.15, 0.85, 0.15] }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
