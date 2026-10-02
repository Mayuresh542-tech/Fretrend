"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { useAuthGate } from "../lib/useAuthGate";
import { useRouter } from "next/navigation";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const router = useRouter();
  const { status } = useAuthGate();
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (status === "authed" && !redirectedRef.current) {
      redirectedRef.current = true;
      router.replace("/dashboard");
    }
  }, [status, router]);

  async function handleSignup() {
    if (!email.trim() || !password) {
      setError("Please provide an email and password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    setError("");
    setInfo("");

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { name: name.trim() },
        },
      });

      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        // Track affiliate referral if referral code exists
        if (data?.user?.id && typeof window !== "undefined") {
          const refCode = localStorage.getItem("veelox_ref");
          if (refCode) {
            fetch("/api/affiliates/track", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: data.user.id, referralCode: refCode }),
            }).catch(() => {});
          }
        }

        if (data?.session) {
          if (!redirectedRef.current) {
            redirectedRef.current = true;
            router.replace("/dashboard");
          }
        } else {
          setLoading(false);
          setInfo("Account created! Please check your email inbox to confirm your account, then return to sign in.");
        }
      }
    } catch {
      setError("An unexpected registration error occurred. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#08090C] text-[#F8FAFC] flex items-center justify-center px-4 relative overflow-hidden antialiased selection:bg-sky-500/30 selection:text-white">
      {/* Ambient Radial Glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(circle at 50% 35%, rgba(14, 165, 233, 0.08) 0%, rgba(13, 15, 21, 0.75) 50%, #08090C 90%)",
          }}
        />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-sky-500/10 blur-[130px] rounded-full pointer-events-none" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md rounded-3xl bg-[#0D0F15] border border-[#202534] shadow-[0_24px_70px_rgba(0,0,0,0.8)] p-8 sm:p-10 relative z-10"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-[0_0_16px_rgba(14,165,233,0.4)] group-hover:scale-105 transition-transform duration-200">
              <svg className="w-4 h-4 text-white fill-current" viewBox="0 0 24 24">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <span className="text-xl font-extrabold tracking-wider text-white font-heading uppercase">VEELOX</span>
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 mb-3 shadow-[0_0_16px_rgba(14,165,233,0.15)]">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-sky-300 font-semibold">CREATOR STUDIO</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-heading">Join Veelox</h1>
          <p className="text-xs text-slate-400 mt-1">From trending idea to finished, publish-ready video.</p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs px-4 py-3 rounded-xl mb-6 font-mono leading-relaxed">
            {error}
          </div>
        )}

        {info && (
          <div className="bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs px-4 py-3 rounded-xl mb-6 font-mono leading-relaxed">
            {info}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 block">Creator Handle / Name</label>
            <input
              type="text"
              placeholder="e.g. Maya Chen"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#12151E] border border-[#202534] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/70 focus:shadow-[0_0_16px_rgba(14,165,233,0.2)] transition font-sans"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 block">Email Address</label>
            <input
              type="email"
              placeholder="creator@veelox.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#12151E] border border-[#202534] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/70 focus:shadow-[0_0_16px_rgba(14,165,233,0.2)] transition font-sans"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 block">Password (min. 6 characters)</label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSignup()}
                className="w-full px-4 py-2.5 bg-[#12151E] border border-[#202534] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/70 focus:shadow-[0_0_16px_rgba(14,165,233,0.2)] transition font-mono"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-white font-mono cursor-pointer"
              >
                {show ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            onClick={handleSignup}
            disabled={loading}
            className="w-full py-3 rounded-full font-bold text-xs uppercase tracking-wider bg-white hover:bg-slate-100 text-zinc-950 shadow-[0_0_24px_rgba(255,255,255,0.25)] transition mt-2 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-zinc-900/30 border-t-zinc-900 animate-spin" />
                <span>Creating workspace…</span>
              </>
            ) : (
              <span>Create Free Account →</span>
            )}
          </button>
        </div>

        <div className="pt-6 mt-6 border-t border-[#202534] text-center">
          <p className="text-xs text-slate-400">
            Already have an account?{" "}
            <Link href="/login" className="text-sky-400 hover:text-sky-300 hover:underline font-bold transition">
              Sign in →
            </Link>
          </p>
        </div>
      </motion.div>
    </main>
  );
}
