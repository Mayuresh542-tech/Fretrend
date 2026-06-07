"use client";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex justify-between items-center px-8 py-6 border-b border-white/10"
      >
        <h1 className="text-2xl font-bold text-purple-500">Fretrend</h1>
        <div className="flex gap-4">
          <a href="/login" className="px-4 py-2 text-white/70 hover:text-white transition">Login</a>
          <a href="/signup" className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition">Get Started</a>
        </div>
      </motion.nav>

      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      <section className="flex flex-col items-center text-center px-8 py-24 relative">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="inline-block px-4 py-2 bg-purple-600/20 border border-purple-500/30 rounded-full text-purple-400 text-sm mb-6"
        >
          📡 Real-Time Trend Intelligence
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-5xl font-bold mb-6 leading-tight"
        >
          Spot Every Trend<br />
          <span className="text-purple-500">Before It Goes Viral</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-white/60 text-xl mb-10 max-w-2xl"
        >
          Enter any niche and Fretrend scans Google Trends, HackerNews, Reddit, YouTube, and Google News in real time — ranked, scored, and categorized.
        </motion.p>

        <motion.a
          href="/signup"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-8 py-4 bg-purple-600 rounded-xl text-lg font-semibold hover:bg-purple-700 transition"
        >
          Start Free Today 🚀
        </motion.a>
      </section>

      <section className="px-8 py-20 max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-4xl font-bold text-center mb-12"
        >
          One Search, Every Source
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { icon: "🔍", title: "Multi-Source Scan", desc: "Google Trends, HackerNews, Reddit, YouTube and Google News at once" },
            { icon: "📊", title: "Trend Scoring", desc: "Every topic ranked 0–99 by real engagement signals" },
            { icon: "🏷️", title: "Smart Categories", desc: "Auto-tagged by Tech, Finance, Gaming, Sports and more" },
            { icon: "⚡", title: "Real-Time Feed", desc: "Fresh results in seconds, cached for instant revisits" },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ scale: 1.05 }}
              className="bg-white/5 rounded-2xl p-6 border border-white/10 cursor-pointer transition-all"
            >
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-white/50 text-sm">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="px-8 py-20 max-w-4xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-4xl font-bold text-center mb-12"
        >
          How It Works
        </motion.h2>
        <div className="flex flex-col gap-6">
          {[
            { step: "01", title: "Pick Your Niche", desc: "Type any topic — AI, finance, gaming, crypto, sports, anything" },
            { step: "02", title: "Scan 5 Sources", desc: "Fretrend pulls trending topics from across the web instantly" },
            { step: "03", title: "Rank & Filter", desc: "See everything scored and categorized, filter to what matters" },
            { step: "04", title: "Act on Insight", desc: "Find the next big topic before your competition does" },
          ].map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="flex gap-6 items-start bg-white/5 rounded-2xl p-6 border border-white/10"
            >
              <span className="text-4xl font-bold text-purple-500/50">{s.step}</span>
              <div>
                <h3 className="text-lg font-semibold mb-1">{s.title}</h3>
                <p className="text-white/50 text-sm">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="px-8 py-20 max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-4xl font-bold text-center mb-12"
        >
          Simple Pricing
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { plan: "Free", price: "$0", quota: "25 searches/month", border: "border-white/10", popular: false },
            { plan: "Creator", price: "$9", quota: "500 searches/month", border: "border-purple-500", popular: true },
            { plan: "Pro", price: "$19", quota: "2,000 searches/month", border: "border-white/10", popular: false },
            { plan: "Agency", price: "$49", quota: "Unlimited searches", border: "border-white/10", popular: false },
          ].map((p, i) => (
            <motion.div
              key={p.plan}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ scale: 1.05 }}
              className={`bg-white/5 rounded-2xl p-6 border ${p.border} relative`}
            >
              {p.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-purple-600 rounded-full text-xs font-semibold">
                  Most Popular
                </span>
              )}
              <h3 className="text-lg font-semibold mb-2">{p.plan}</h3>
              <div className="text-4xl font-bold text-purple-500 mb-2">
                {p.price}<span className="text-sm text-white/50">/mo</span>
              </div>
              <p className="text-white/50 text-sm mb-6">{p.quota}</p>
              <a href="/signup" className="block text-center px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition">
                Get Started
              </a>
            </motion.div>
          ))}
        </div>
      </section>

      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="border-t border-white/10 px-8 py-8 flex justify-between items-center"
      >
        <p className="text-white/40">© 2025 Fretrend. All rights reserved.</p>
        <div className="flex gap-6">
          <a href="/privacy" className="text-white/40 hover:text-white text-sm transition">Privacy</a>
          <a href="/terms" className="text-white/40 hover:text-white text-sm transition">Terms</a>
        </div>
      </motion.footer>
    </main>
  )
}
