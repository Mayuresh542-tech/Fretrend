"use client";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

type Active = "dashboard" | "trends" | "settings" | "how-to-use" | "suggestions";

const NAV: { id: Active; href: string; icon: string; label: string }[] = [
  { id: "dashboard", href: "/dashboard", icon: "🏠", label: "Dashboard" },
  { id: "trends", href: "/trends", icon: "🔥", label: "Trends" },
  { id: "settings", href: "/settings", icon: "⚙️", label: "Settings" },
  { id: "how-to-use", href: "/how-to-use", icon: "❓", label: "How to Use" },
  { id: "suggestions", href: "/suggestions", icon: "💡", label: "Suggestions" },
];

export default function Sidebar({ active }: { active: Active }) {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <motion.aside
      initial={{ x: -40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed h-full w-64 flex flex-col p-6 border-r border-white/10 bg-white/[0.03] backdrop-blur-xl z-20"
    >
      <motion.h1
        className="text-2xl font-extrabold mb-10 bg-gradient-to-r from-purple-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent"
        style={{ backgroundSize: "200% auto" }}
        animate={{ backgroundPosition: ["0% center", "200% center"] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      >
        Fretrend
      </motion.h1>

      <nav className="flex flex-col gap-1.5 flex-1">
        {NAV.map((item, i) => {
          const isActive = item.id === active;
          return (
            <motion.a
              key={item.id}
              href={item.href}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.07, duration: 0.4 }}
              whileHover={{ x: 5 }}
              className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                isActive ? "text-white" : "text-white/60 hover:text-white"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-600/30 to-cyan-500/20 border border-purple-500/40"
                  style={{ boxShadow: "0 0 20px -4px rgba(124,58,237,0.6)" }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              {!isActive && (
                <span className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/5 transition-colors" />
              )}
              <span className="relative z-10 text-lg">{item.icon}</span>
              <span className="relative z-10 font-medium">{item.label}</span>
            </motion.a>
          );
        })}

        <motion.a
          href="/upgrade"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 + NAV.length * 0.07, duration: 0.4 }}
          whileHover={{ x: 5, scale: 1.02 }}
          className="relative flex items-center gap-3 px-4 py-3 mt-2 rounded-xl bg-gradient-to-r from-purple-600/20 to-cyan-500/10 border border-purple-500/30 text-purple-300 hover:text-white transition-colors overflow-hidden"
        >
          <span className="relative z-10 text-lg">⚡</span>
          <span className="relative z-10 font-medium">Upgrade Plan</span>
        </motion.a>
      </nav>

      <motion.button
        onClick={handleLogout}
        whileHover={{ x: 5 }}
        className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors mt-4"
      >
        <span className="text-lg">🚪</span>
        <span className="font-medium">Logout</span>
      </motion.button>
    </motion.aside>
  );
}
