"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { isAdminEmail } from "../lib/admin";
import { useAlertCount } from "../lib/alerts";

type Active = "dashboard" | "trends" | "alerts" | "competitors" | "saved" | "settings" | "how-to-use" | "suggestions" | "admin";

const NAV: { id: Active; href: string; icon: string; label: string }[] = [
  { id: "dashboard", href: "/dashboard", icon: "🏠", label: "Dashboard" },
  { id: "trends", href: "/trends", icon: "🔥", label: "Trends" },
  { id: "alerts", href: "/alerts", icon: "🔔", label: "Trend Alerts" },
  { id: "competitors", href: "/competitors", icon: "📊", label: "Competitor Analysis" },
  { id: "saved", href: "/saved", icon: "🔖", label: "Saved Scripts" },
  { id: "settings", href: "/settings", icon: "⚙️", label: "Settings" },
  { id: "how-to-use", href: "/how-to-use", icon: "❓", label: "How to Use" },
  { id: "suggestions", href: "/suggestions", icon: "💡", label: "Suggestions" },
];

export default function Sidebar({ active }: { active: Active }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Bell badge: total trends across saved niches, last computed by /alerts.
  const alertCount = useAlertCount();

  // Reveal the admin link only for the admin account. The page + API enforce
  // the real access check; this just hides the link from everyone else.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setIsAdmin(isAdminEmail(data.session?.user?.email));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogout() {
    setMobileOpen(false);
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <>
      {/* Mobile top navigation bar — visible only below lg. Houses the hamburger. */}
      <div className="lg:hidden fixed top-0 inset-x-0 h-14 z-30 flex items-center gap-3 px-4 border-b border-white/10 bg-[#0c0c10]/80 backdrop-blur-xl">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white text-lg transition-colors"
        >
          ☰
        </button>
        <span className="text-xl font-extrabold bg-gradient-to-r from-purple-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
          Fretrend
        </span>
      </div>

      {/* Desktop sidebar — unchanged at lg+, hidden below lg. */}
      <motion.aside
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="hidden lg:flex fixed h-full w-64 flex-col p-6 border-r border-white/10 bg-white/[0.03] backdrop-blur-xl z-20"
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
                {item.id === "alerts" && alertCount > 0 && (
                  <span className="relative z-10 ml-auto min-w-5 px-1.5 h-5 flex items-center justify-center rounded-full text-[11px] font-bold bg-gradient-to-r from-purple-500 to-cyan-500 text-white">
                    {alertCount > 99 ? "99+" : alertCount}
                  </span>
                )}
              </motion.a>
            );
          })}

          {isAdmin && (
            <motion.a
              href="/admin"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              whileHover={{ x: 5 }}
              className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                active === "admin" ? "text-white" : "text-white/60 hover:text-white"
              }`}
            >
              {active === "admin" && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-600/30 to-cyan-500/20 border border-purple-500/40"
                  style={{ boxShadow: "0 0 20px -4px rgba(124,58,237,0.6)" }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              {active !== "admin" && (
                <span className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/5 transition-colors" />
              )}
              <span className="relative z-10 text-lg">🛡️</span>
              <span className="relative z-10 font-medium">Admin</span>
            </motion.a>
          )}

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

      {/* Mobile drawer overlay — only rendered below lg when opened. */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="lg:hidden fixed top-0 left-0 h-full w-72 max-w-[80%] z-50 flex flex-col p-6 border-r border-white/10 bg-[#0c0c10]/95 backdrop-blur-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <span className="text-2xl font-extrabold bg-gradient-to-r from-purple-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
                  Fretrend
                </span>
                <button
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white transition-colors flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              <nav className="flex flex-col gap-1.5 flex-1">
                {NAV.map((item) => {
                  const isActive = item.id === active;
                  return (
                    <a
                      key={item.id}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                        isActive
                          ? "bg-gradient-to-r from-purple-600/30 to-cyan-500/20 border border-purple-500/40 text-white"
                          : "text-white/60 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                      {item.id === "alerts" && alertCount > 0 && (
                        <span className="ml-auto min-w-5 px-1.5 h-5 flex items-center justify-center rounded-full text-[11px] font-bold bg-gradient-to-r from-purple-500 to-cyan-500 text-white">
                          {alertCount > 99 ? "99+" : alertCount}
                        </span>
                      )}
                    </a>
                  );
                })}

                {isAdmin && (
                  <a
                    href="/admin"
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                      active === "admin"
                        ? "bg-gradient-to-r from-purple-600/30 to-cyan-500/20 border border-purple-500/40 text-white"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span className="text-lg">🛡️</span>
                    <span className="font-medium">Admin</span>
                  </a>
                )}

                <a
                  href="/upgrade"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 mt-2 rounded-xl bg-gradient-to-r from-purple-600/20 to-cyan-500/10 border border-purple-500/30 text-purple-300 hover:text-white transition-colors"
                >
                  <span className="text-lg">⚡</span>
                  <span className="font-medium">Upgrade Plan</span>
                </a>
              </nav>

              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors mt-4"
              >
                <span className="text-lg">🚪</span>
                <span className="font-medium">Logout</span>
              </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
