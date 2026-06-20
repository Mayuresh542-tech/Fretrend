"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface StepMeta {
  emoji: string;
  title: string;
  /** Soft glow color behind the emoji badge. */
  glow: string;
}

const STEPS: StepMeta[] = [
  { emoji: "🎉", title: "Welcome to Fretrend!", glow: "rgba(168,85,247,0.45)" },
  { emoji: "⚡", title: "Get Your FREE Groq Key", glow: "rgba(34,197,94,0.40)" },
  { emoji: "🔒", title: "Your Data Is Safe", glow: "rgba(6,182,212,0.40)" },
  { emoji: "⚙️", title: "Add Your Key", glow: "rgba(124,58,237,0.45)" },
  { emoji: "🚀", title: "You're All Set!", glow: "rgba(217,70,239,0.45)" },
];

const GROQ_STEPS: { n: number; label: React.ReactNode }[] = [
  {
    n: 1,
    label: (
      <>
        Go to{" "}
        <a
          href="https://console.groq.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-cyan-300 underline decoration-cyan-400/40 underline-offset-2 hover:text-cyan-200"
        >
          console.groq.com
        </a>
      </>
    ),
  },
  { n: 2, label: "Sign up — it's free" },
  { n: 3, label: "Click API Keys" },
  { n: 4, label: "Create API Key" },
  { n: 5, label: "Copy it" },
];

// Slide-and-fade between steps; direction flips depending on Back/Next.
const cardVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 48 : -48 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -48 : 48 }),
};

/**
 * First-run welcome flow. Shown exactly once — the very first time a newly
 * signed-up user lands on the dashboard — then never again. Completion is
 * persisted to `profiles.onboarding_completed` (migration 0006); skipping also
 * marks it complete so it doesn't reappear. Requires the caller to be authed
 * and pass the user's id.
 */
export default function OnboardingFlow({ userId }: { userId: string }) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [finishing, setFinishing] = useState(false);

  const last = STEPS.length - 1;

  // Decide whether to show the flow — exactly once. We only open it when we can
  // positively read an incomplete profile row; any error (table missing, no row,
  // network) silently leaves it closed so existing users are never interrupted.
  // NOTE: run-once ref guard with NO cancel-on-cleanup — pairing the two stalls
  // the effect (see the saved/admin auth pitfall).
  const checkedRef = useRef(false);
  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;
    console.log("[OnboardingFlow] mounted — checking profile for", userId);
    (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", userId)
          .maybeSingle();
        console.log("[OnboardingFlow] profile check →", { data, error });

        if (error) {
          // Table missing or query blocked — we can't decide, so stay closed.
          console.warn("[OnboardingFlow] profile query failed, not showing:", error.message);
          return;
        }

        if (!data) {
          // No profile row yet → this is a first run. We do NOT rely on the DB
          // signup trigger (it may not be installed); create the row here and
          // show onboarding. ignoreDuplicates avoids clobbering a row that a
          // concurrent run/trigger may have just inserted.
          console.log("[OnboardingFlow] no profile row → creating one + showing onboarding");
          const { error: insErr } = await supabase
            .from("profiles")
            .upsert({ id: userId, onboarding_completed: false }, { onConflict: "id", ignoreDuplicates: true });
          if (insErr) console.warn("[OnboardingFlow] could not create profile row:", insErr.message);
          setVisible(true);
          return;
        }

        if (data.onboarding_completed === false) {
          console.log("[OnboardingFlow] onboarding incomplete → showing");
          setVisible(true);
        } else {
          console.log("[OnboardingFlow] onboarding already completed → not showing");
        }
      } catch (e) {
        console.warn("[OnboardingFlow] profile check threw, not showing:", e);
      }
    })();
  }, [userId]);

  // Lock background scroll while the modal is open.
  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  function goTo(next: number) {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  }

  async function markCompleted() {
    try {
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", userId);
    } catch {
      /* best effort — the flow is dismissed regardless */
    }
  }

  // Finish the flow: persist completion, then either navigate away or just close.
  async function finish(destination?: string) {
    if (finishing) return;
    setFinishing(true);
    await markCompleted();
    if (destination) {
      router.push(destination);
    } else {
      setVisible(false);
      setFinishing(false);
    }
  }

  const ctaLabel = ["Get Started", "Continue", "Continue", "Continue", "Explore Trends →"][step];

  function handlePrimary() {
    if (step === last) {
      void finish("/trends");
    } else {
      goTo(step + 1);
    }
  }

  function renderBody() {
    switch (step) {
      case 0:
        return (
          <p className="text-white/60 leading-relaxed">
            You&apos;re now part of the future of content creation! Let&apos;s get you set up in{" "}
            <span className="font-semibold text-white">2 minutes</span>.
          </p>
        );
      case 1:
        return (
          <div className="flex flex-col items-center gap-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-green-400/30 bg-green-500/10 px-4 py-1.5 text-sm font-semibold text-green-300">
              ✅ 100% FREE — No credit card. Ever.
            </span>

            <ol className="w-full flex flex-col gap-2.5 text-left">
              {GROQ_STEPS.map((s) => (
                <li key={s.n} className="flex items-center gap-3 text-sm text-white/75">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 text-xs font-bold text-white">
                    {s.n}
                  </span>
                  <span>{s.label}</span>
                </li>
              ))}
            </ol>

            <p className="w-full rounded-xl border border-purple-500/20 bg-purple-600/10 px-4 py-3 text-left text-xs text-purple-200">
              💡 Generous free limits — hundreds of content kits per day, free!
            </p>
          </div>
        );
      case 2:
        return (
          <div className="flex flex-col items-center gap-4">
            <p className="text-white/60 leading-relaxed">
              Your API key is protected with{" "}
              <span className="font-semibold text-cyan-300">AES-256 encryption</span> — the same
              standard banks use. Only <span className="font-semibold text-white">YOU</span> can
              access it. Not even our team can see it.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {["🔐 AES-256", "🛡️ Bank-grade", "🙈 Private to you"].map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="flex flex-col items-center gap-5">
            <p className="text-white/60 leading-relaxed">
              Add your free Groq key in{" "}
              <span className="font-semibold text-white">Settings</span> to unlock AI Content Kits.
            </p>
            <motion.button
              onClick={() => void finish("/settings")}
              disabled={finishing}
              whileHover={{ scale: 1.02, boxShadow: "0 0 26px -8px rgba(124,58,237,0.7)" }}
              whileTap={{ scale: 0.98 }}
              className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 py-3 font-semibold text-white transition disabled:opacity-50"
            >
              Go to Settings →
            </motion.button>
          </div>
        );
      case 4:
        return (
          <p className="text-white/60 leading-relaxed">
            Start discovering <span className="font-semibold text-white">viral trends</span> and
            generating content that gets <span className="font-semibold text-white">millions of views</span>!
          </p>
        );
      default:
        return null;
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="relative w-full max-w-lg rounded-3xl p-px bg-gradient-to-br from-purple-500/50 via-white/10 to-cyan-500/40 shadow-[0_0_60px_-12px_rgba(124,58,237,0.6)]"
            role="dialog"
            aria-modal="true"
            aria-label="Welcome to Fretrend"
          >
            <div className="relative overflow-hidden rounded-[calc(1.5rem-1px)] bg-[#0c0c10]/95 p-6 backdrop-blur-2xl sm:p-8">
              {/* Soft moving glow */}
              <motion.div
                aria-hidden
                className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full blur-[90px]"
                style={{ background: STEPS[step].glow }}
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Header */}
              <div className="relative mb-6 flex items-center justify-between">
                <span className="text-xs font-medium tracking-wide text-white/40">
                  Step {step + 1} of {STEPS.length}
                </span>
                <button
                  onClick={() => void finish()}
                  disabled={finishing}
                  className="text-sm text-white/40 transition hover:text-white/80 disabled:opacity-50"
                >
                  Skip
                </button>
              </div>

              {/* Animated step content */}
              <div className="relative min-h-[260px]">
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={step}
                    custom={direction}
                    variants={cardVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.4, ease: EASE }}
                    className="flex flex-col items-center text-center"
                  >
                    <motion.div
                      className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-purple-600/30 to-cyan-500/20 text-4xl"
                      animate={{ scale: [1, 1.06, 1] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    >
                      {STEPS[step].emoji}
                    </motion.div>
                    <h2 className="mb-3 bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-2xl font-extrabold text-transparent">
                      {STEPS[step].title}
                    </h2>
                    {renderBody()}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Footer: progress dots + navigation */}
              <div className="relative mt-8 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  {STEPS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goTo(i)}
                      aria-label={`Go to step ${i + 1}`}
                      className="py-2"
                    >
                      <motion.span
                        className={`block h-2 rounded-full ${
                          i <= step ? "bg-gradient-to-r from-purple-500 to-cyan-400" : "bg-white/20"
                        }`}
                        animate={{ width: i === step ? 26 : 8 }}
                        transition={{ duration: 0.35, ease: EASE }}
                      />
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {step > 0 && (
                    <button
                      onClick={() => goTo(step - 1)}
                      disabled={finishing}
                      className="rounded-xl px-4 py-2.5 text-sm font-medium text-white/60 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
                    >
                      Back
                    </button>
                  )}
                  <motion.button
                    onClick={handlePrimary}
                    disabled={finishing}
                    whileHover={{ scale: 1.03, boxShadow: "0 0 24px -8px rgba(124,58,237,0.7)" }}
                    whileTap={{ scale: 0.97 }}
                    className="rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
                  >
                    {finishing && step === last ? "Loading…" : ctaLabel}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
