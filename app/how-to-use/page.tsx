"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "../components/Sidebar";
import AnimatedBackground from "../components/AnimatedBackground";

const FADE_UP = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

/** Dashed placeholder where a real screenshot can be dropped in later. */
function Screenshot({ caption }: { caption: string }) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-white/15 bg-white/[0.02] aspect-[16/8] flex flex-col items-center justify-center text-center px-4">
      <span className="text-3xl mb-2 opacity-50">🖼️</span>
      <p className="text-white/40 text-xs">{caption}</p>
    </div>
  );
}

function StepCard({
  step,
  icon,
  title,
  accent,
  children,
}: {
  step: number;
  icon: string;
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      variants={FADE_UP}
      className={`relative rounded-2xl p-px bg-gradient-to-br ${accent}`}
    >
      <div className="rounded-2xl bg-[#0c0c10]/85 backdrop-blur-xl p-6 h-full">
        <div className="flex items-center gap-3 mb-4">
          <span className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center font-bold">
            {step}
          </span>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <span>{icon}</span> {title}
          </h3>
        </div>
        <div className="text-white/70 text-sm leading-relaxed space-y-3">{children}</div>
      </div>
    </motion.section>
  );
}

const FAQS: { q: string; a: string }[] = [
  {
    q: "Is Fretrend really free?",
    a: "Yes. Fretrend itself is free, and it runs on your own Groq API key — Groq offers a generous free tier, so you pay providers directly (usually nothing) and we charge nothing extra.",
  },
  {
    q: "Why do I need my own Groq API key?",
    a: "Your key powers the AI Content Kit generation. Using your own key keeps your usage private and means you're never rate-limited by other users.",
  },
  {
    q: "Where does the trend data come from?",
    a: "Fretrend scans five live sources in real time — Google Trends, HackerNews, Reddit, YouTube, and Google News — then ranks and scores everything by virality.",
  },
  {
    q: "What is the virality score?",
    a: "A 0–100 estimate of how hot a topic is right now, based on engagement signals from each source. 80+ is 🔥 Hot, 60–79 is 📈 Rising, and below 60 is 🌱 Emerging.",
  },
  {
    q: "Does the script match the duration I pick?",
    a: "The AI targets an exact word count for each length (30s ≈ 75 words, 60s ≈ 150, 3min ≈ 450, 5min ≈ 750, 10min ≈ 1500). The script panel shows the live word count vs. the target so you can see the match.",
  },
  {
    q: "Is my Groq key stored safely?",
    a: "Your key is saved to your private Supabase account row and is only used to call Groq on your behalf when you generate a kit. It's never shared.",
  },
];

const KIT_FIELDS: { icon: string; name: string; desc: string }[] = [
  { icon: "🎥", name: "Full Video Script", desc: "A ready-to-record script (HOOK → INTRO → MAIN CONTENT → CTA) matching your chosen duration." },
  { icon: "🏆", name: "Viral Titles", desc: "5 high-CTR title options engineered to win the click." },
  { icon: "🪝", name: "Opening Hooks", desc: "3 attention-grabbing first lines to stop the scroll." },
  { icon: "🖼️", name: "Thumbnail Ideas", desc: "2 detailed thumbnail concepts — colors, text, and emotion." },
  { icon: "📈", name: "Why It's Trending", desc: "The context behind the spike and why viewers care right now." },
  { icon: "🎯", name: "Content Angles", desc: "3 unique angles to stand out from everyone else covering it." },
  { icon: "🎬", name: "Best Format", desc: "Whether to go Short, Long-form, or Carousel — and why." },
  { icon: "⏳", name: "Catch Window", desc: "How many days you have before the trend peaks." },
  { icon: "🚀", name: "Virality Tips", desc: "3 specific tactics to maximize views on this exact topic." },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/[0.04] transition-colors"
      >
        <span className="font-medium text-white/90 text-sm">{q}</span>
        <motion.span animate={{ rotate: open ? 45 : 0 }} className="shrink-0 text-purple-300 text-lg">
          +
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-4 text-white/60 text-sm leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HowToUse() {
  return (
    <main className="relative min-h-screen text-white flex">
      <AnimatedBackground />
      <Sidebar active="how-to-use" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="ml-64 flex-1 p-8 relative z-10"
      >
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mb-10"
          >
            <motion.h2
              className="text-3xl font-extrabold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent"
              style={{ backgroundSize: "200% auto" }}
              animate={{ backgroundPosition: ["0% center", "200% center"] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              How to Use Fretrend
            </motion.h2>
            <p className="text-white/50 text-sm mt-1">
              From zero to viral-ready content in five simple steps 🚀
            </p>
          </motion.div>

          {/* Welcome */}
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative rounded-2xl p-px bg-gradient-to-br from-purple-500/40 via-white/5 to-cyan-500/30 mb-10"
          >
            <div className="rounded-2xl bg-[#0c0c10]/85 backdrop-blur-xl p-7">
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2">👋 Welcome to Fretrend</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Fretrend is your trend-intelligence co-pilot. It scans the web in real time, finds the
                topics blowing up right now in any niche, and then turns the one you pick into a
                complete, ready-to-shoot content kit — titles, hooks, thumbnails, and a full video
                script — powered by AI. No guesswork, no blank page. Just find what&apos;s hot and
                hit record.
              </p>
            </div>
          </motion.section>

          {/* Steps */}
          <motion.div
            variants={{ show: { transition: { staggerChildren: 0.1 } } }}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-5"
          >
            {/* Step 1 */}
            <StepCard
              step={1}
              icon="🔑"
              title="Get Your Free Groq API Key"
              accent="from-purple-500/30 to-cyan-500/20"
            >
              <p>
                Fretrend uses Groq to generate your content kits — it&apos;s fast and has a generous
                free tier. Here&apos;s how to grab a key in under two minutes:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 marker:text-purple-400">
                <li>
                  Go to{" "}
                  <a
                    href="https://console.groq.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-300 hover:text-cyan-200 underline underline-offset-2"
                  >
                    console.groq.com
                  </a>{" "}
                  and sign up (Google login works in one click).
                </li>
                <li>
                  In the left menu, open <span className="text-white/90 font-medium">API Keys</span>.
                </li>
                <li>
                  Click <span className="text-white/90 font-medium">Create API Key</span>, give it a
                  name like &ldquo;Fretrend&rdquo;, and confirm.
                </li>
                <li>
                  Copy the key (it starts with{" "}
                  <code className="px-1.5 py-0.5 rounded bg-white/10 text-purple-200 text-xs">gsk_</code>
                  ). <span className="text-amber-300/80">Copy it now — Groq only shows it once.</span>
                </li>
              </ol>
              <Screenshot caption="Screenshot: Groq console → API Keys → Create API Key" />
            </StepCard>

            {/* Step 2 */}
            <StepCard
              step={2}
              icon="⚙️"
              title="Add Your Key in Settings"
              accent="from-cyan-500/30 to-purple-500/20"
            >
              <p>
                Open the <span className="text-white/90 font-medium">Settings</span> page from the
                sidebar (the ⚙️ icon on the left). Paste your{" "}
                <code className="px-1.5 py-0.5 rounded bg-white/10 text-purple-200 text-xs">gsk_…</code>{" "}
                key into the Groq API Key field and hit{" "}
                <span className="text-white/90 font-medium">Save API Key</span>. That&apos;s it —
                your key is stored privately to your account and unlocks AI Content Kits everywhere.
              </p>
              <a
                href="/settings"
                className="inline-flex items-center gap-2 mt-1 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-cyan-500"
              >
                ⚙️ Open Settings
              </a>
            </StepCard>

            {/* Step 3 */}
            <StepCard
              step={3}
              icon="🔥"
              title="Find Trends"
              accent="from-fuchsia-500/30 to-purple-500/20"
            >
              <p>
                Head to the <span className="text-white/90 font-medium">Trends</span> page and type
                any niche — &ldquo;AI&rdquo;, &ldquo;Finance&rdquo;, &ldquo;Gaming&rdquo;, anything.
                Fretrend instantly scans <span className="text-white/90 font-medium">5 live sources</span>{" "}
                (Google Trends, HackerNews, Reddit, YouTube, Google News) and returns a ranked list.
              </p>
              <p>
                Each result shows a <span className="text-white/90 font-medium">virality score</span>{" "}
                out of 100 and a tier — 🔥 Hot, 📈 Rising, or 🌱 Emerging. Use the category chips to
                filter, and the ↻ button to refresh.
              </p>
              <a
                href="/trends"
                className="inline-flex items-center gap-2 mt-1 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-cyan-500"
              >
                🔥 Explore Trends
              </a>
            </StepCard>

            {/* Step 4 */}
            <StepCard
              step={4}
              icon="✨"
              title="Generate an AI Content Kit"
              accent="from-purple-500/30 to-cyan-500/20"
            >
              <p>
                On any trend card, click{" "}
                <span className="text-white/90 font-medium">✨ Generate AI Content Kit</span>. Pick a
                video duration (30s → 10min), then hit generate. In seconds you get a complete kit —
                here&apos;s what each part means:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {KIT_FIELDS.map((f) => (
                  <div
                    key={f.name}
                    className="rounded-lg border border-white/5 bg-white/[0.03] p-3"
                  >
                    <p className="font-medium text-white/90 text-sm flex items-center gap-1.5">
                      <span>{f.icon}</span> {f.name}
                    </p>
                    <p className="text-white/50 text-xs mt-1 leading-snug">{f.desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-white/50 text-xs">
                Every item has a one-click <span className="text-white/80">Copy</span> button, and you
                can <span className="text-white/80">Save Report</span> to revisit it later.
              </p>
            </StepCard>

            {/* Step 5 */}
            <StepCard
              step={5}
              icon="🎬"
              title="Create Your Content"
              accent="from-cyan-500/30 to-purple-500/20"
            >
              <p>Now turn the kit into a real post. A few tips to get the most out of it:</p>
              <ul className="list-disc list-inside space-y-1.5 marker:text-cyan-400">
                <li>
                  <span className="text-white/90">Move fast.</span> Check the{" "}
                  <span className="text-white/90">Catch Window</span> — publish before the trend peaks.
                </li>
                <li>
                  <span className="text-white/90">Lead with the hook.</span> The first 3 seconds decide
                  everything; record the strongest hook first.
                </li>
                <li>
                  <span className="text-white/90">Make the script yours.</span> Read it aloud, swap in
                  your own voice and examples — it&apos;s a launch pad, not a cage.
                </li>
                <li>
                  <span className="text-white/90">A/B your title &amp; thumbnail.</span> You have 5
                  titles and 2 thumbnail concepts — test them.
                </li>
                <li>
                  <span className="text-white/90">Match the format.</span> Follow the recommended
                  Short / Long-form / Carousel call for that topic.
                </li>
              </ul>
            </StepCard>
          </motion.div>

          {/* FAQ */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mt-12"
          >
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">❓ Frequently Asked Questions</h3>
            <div className="flex flex-col gap-2.5">
              {FAQS.map((f) => (
                <FaqItem key={f.q} q={f.q} a={f.a} />
              ))}
            </div>
          </motion.div>

          {/* Footer CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-12 mb-4 text-center"
          >
            <p className="text-white/50 text-sm mb-4">Got an idea to make Fretrend better?</p>
            <a
              href="/suggestions"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              💡 Share a Suggestion
            </a>
          </motion.div>
        </div>
      </motion.div>
    </main>
  );
}
