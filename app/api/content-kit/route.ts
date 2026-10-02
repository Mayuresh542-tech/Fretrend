import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { buildVoiceInstruction, DEFAULT_BRAND_VOICE } from "../../lib/brandVoice";
import { generateGeminiJson } from "../../lib/server/geminiService";
import {
  deductCreditsForContentKit,
  completeCreditTransaction,
  refundCreditsForContentKit,
} from "../../lib/server/creditService";
import { CONTENT_KIT_COST } from "../../config/credits";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function adminClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function resolveVoiceInstruction(token?: string | null): Promise<{ voiceInstruction: string; userId: string | null }> {
  if (!token) return { voiceInstruction: buildVoiceInstruction(DEFAULT_BRAND_VOICE, null), userId: null };

  const db = adminClient();
  if (!db) return { voiceInstruction: buildVoiceInstruction(DEFAULT_BRAND_VOICE, null), userId: null };

  try {
    const { data: userData, error: userErr } = await db.auth.getUser(token);
    if (userErr || !userData.user) {
      return { voiceInstruction: buildVoiceInstruction(DEFAULT_BRAND_VOICE, null), userId: null };
    }
    const userId = userData.user.id;
    const { data } = await db
      .from("profiles")
      .select("brand_voice, brand_voice_custom")
      .eq("id", userId)
      .maybeSingle();

    return {
      voiceInstruction: buildVoiceInstruction(data?.brand_voice, data?.brand_voice_custom),
      userId,
    };
  } catch {
    return { voiceInstruction: buildVoiceInstruction(DEFAULT_BRAND_VOICE, null), userId: null };
  }
}

export interface ContentKit {
  titles: string[];
  hooks: string[];
  thumbnail_ideas: string[];
  why_trending: string;
  content_angles: string[];
  best_format: string;
  catch_window: string;
  virality_tips: string[];
  script: string;
}

function buildPrompt(
  topic: string,
  niche: string,
  score: number,
  durationLabel: string,
  wordCount: number,
  format: string,
  voiceInstruction: string
): { prompt: string; systemInstruction: string } {
  const systemInstruction = `You are an elite viral content strategist and scriptwriter for Veelox. ${voiceInstruction}
Rules:
1. Ground all analysis and scripts in the actual trending topic provided.
2. Do NOT hallucinate unverified statistics, fake subscriber counts, or fake view metrics.
3. Return STRICTLY valid JSON matching the requested fields.`;

  const prompt = `Generate a complete viral content kit for this trending topic: "${topic}" in the "${niche}" niche with a virality score of ${score}/100.

Return ONLY a JSON object with these EXACT fields:
- "titles": array of 5 high-CTR, curiosity-driven YouTube and social titles.
- "hooks": array of 3 scroll-stopping opening lines (delivered within the first 3 seconds).
- "thumbnail_ideas": array of 2 descriptive sentences detailing high-contrast thumbnail concepts (subject, emotion, colors, and 2-4 word text overlay).
- "why_trending": one clear, insightful paragraph explaining the cultural or technical catalyst driving interest in this topic right now.
- "content_angles": array of 3 distinct, contrarian or high-value angles to cover this topic differently from competitors.
- "best_format": string specifying the optimal format (e.g., "Shorts / Reels (60s)" or "Long-form Explainer (8-10m)") with a 1-sentence rationale.
- "catch_window": string estimating how many days before this trend inflection peaks (e.g. "3-5 days before mainstream saturation").
- "virality_tips": array of 3 tactical tips to maximize watch time and viewer retention on this topic.
- "script": a complete, ready-to-record spoken script for a ${durationLabel} video targeting approximately ${wordCount} words. Format it with section labels on their own lines:
HOOK:
[hook lines]
INTRO:
[context setup]
MAIN CONTENT:
[core insights and breakdown]
CTA:
[call to action]

Use natural transitions and concise spoken cadence.`;

  return { prompt, systemInstruction };
}

/**
 * High-quality development fallback kit if Gemini API key is unconfigured in development.
 */
function buildDevFallbackKit(topic: string, niche: string, score: number, durationLabel: string, format: string): ContentKit {
  const cleanTopic = topic || "AI Content Creation";
  return {
    titles: [
      `The Real Reason ${cleanTopic} is Everywhere Right Now`,
      `I Tested ${cleanTopic} for 7 Days (Shocking Truth)`,
      `Why 99% of Creators Are Wrong About ${cleanTopic}`,
      `The Ultimate Beginner Blueprint to ${cleanTopic}`,
      `Don't Touch ${cleanTopic} Until You Watch This`,
    ],
    hooks: [
      `Everyone is talking about ${cleanTopic}, but almost nobody realizes what actually changed this week.`,
      `If you're still ignoring ${cleanTopic}, you're about to fall severely behind.`,
      `Here is the exact framework behind ${cleanTopic} that took me months to figure out.`,
    ],
    thumbnail_ideas: [
      `High-contrast split image showing a warning badge on the left and a 10x multiplier on the right with bold text reading 'DON'T IGNORE'.`,
      `Extreme close-up subject looking shocked at an illuminated display with vibrant cinematic lighting and overlay text reading 'IT HAPPENED'.`,
    ],
    why_trending: `Surging algorithmic and community interest in "${cleanTopic}" across the ${niche} landscape is driven by recent workflow updates, accessible tool democratization, and expanding audience demand for practical execution over theoretical hype.`,
    content_angles: [
      `Insider reality check: dissecting what actually works vs. what is marketing hype.`,
      `Zero-to-one implementation: the minimum 3 steps required to start seeing results today.`,
      `Future-proofing: how to capitalize on this shift before algorithmic saturation.`,
    ],
    best_format: `${format} (${durationLabel}) — rapid retention format ideal for capturing high initial curiosity.`,
    catch_window: `4 to 7 days before mainstream creator saturation.`,
    virality_tips: [
      `Cut dead air immediately in the first 2 seconds; start in media res.`,
      `Use visual proof or screen recordings within the first 15 seconds to validate the hook.`,
      `Ask a polarizing question in the comments to drive discussion and replay loops.`,
    ],
    script: `HOOK:
Everyone is talking about ${cleanTopic} this week, but almost nobody realizes what actually changed.

INTRO:
If you've been scrolling tech feeds lately, you've seen the surge. But while most creators are just repeating headlines, there's a practical workflow you need to know.

MAIN CONTENT:
Here are the three core things that matter. First, the barriers to entry just dropped to near zero. Second, audiences are actively rewarding creators who show real, transparent tests instead of generic hype. And third, early movers are capturing disproportionate search volume right now.

CTA:
Save this video for your next planning session, and drop your thoughts in the comments below.`,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { topic, niche, score } = body;

    if (!topic || typeof topic !== "string" || !topic.trim()) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim() || null;

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required to generate Content Kits.", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { voiceInstruction, userId } = await resolveVoiceInstruction(token);
    if (!userId) {
      return NextResponse.json(
        { error: "Valid user session required to generate Content Kits.", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // 1. Server-side credit balance check and atomic reservation/deduction
    const cleanTopic = String(topic).trim();
    const deductResult = await deductCreditsForContentKit(userId, cleanTopic);

    if (!deductResult.success) {
      return NextResponse.json(
        {
          error: "You need 5 credits to generate a Content Kit.",
          code: "INSUFFICIENT_CREDITS",
          creditsRemaining: deductResult.creditsRemaining,
          requiredCredits: CONTENT_KIT_COST,
        },
        { status: 402 }
      );
    }

    const durationSec = typeof body.duration === "number" ? body.duration : null;
    const durationLabel = String(
      body.durationLabel || (durationSec ? `${durationSec}-second` : "60-second")
    ).trim();
    const rawWordCount =
      body.wordCount ?? body.targetWords ?? (durationSec ? Math.round(durationSec * 2.5) : 150);
    const safeWordCount = Number.isFinite(rawWordCount) ? Math.round(rawWordCount) : 150;
    const format = String(
      body.format || (durationSec && durationSec >= 180 ? "long-form" : "short-form")
    ).trim();

    const { prompt, systemInstruction } = buildPrompt(
      cleanTopic,
      String(niche ?? "").trim() || "general",
      Number.isFinite(score) ? Math.round(score) : 75,
      durationLabel,
      safeWordCount,
      format,
      voiceInstruction
    );

    try {
      // Test hook for failure simulation
      if (body.testSimulateFailure === true || req.headers.get("x-simulate-failure") === "true") {
        throw new Error("Simulated generation failure for testing auto-refund");
      }

      const kit = await generateGeminiJson<ContentKit>({
        prompt,
        systemInstruction,
        temperature: 0.75,
        userId,
        operation: "content_kit_generation",
      });

      // Mark transaction completed
      await completeCreditTransaction(deductResult.transactionId);

      return NextResponse.json({
        kit,
        creditsRemaining: deductResult.creditsRemaining,
        creditsUsed: CONTENT_KIT_COST,
        transactionId: deductResult.transactionId,
      });
    } catch (aiErr: any) {
      console.warn("[Content Kit API] Generation failed, automatically refunding 5 credits:", aiErr?.message);

      // 4. Automatically refund 5 credits and record the failed/refunded transaction
      const refundResult = await refundCreditsForContentKit(
        userId,
        deductResult.transactionId,
        aiErr?.message || "generation_failed"
      );

      if (aiErr?.message === "GEMINI_NOT_CONFIGURED") {
        return NextResponse.json(
          {
            error: "Gemini API key is not configured.",
            code: "MISSING_KEY",
            refunded: true,
            creditsRemaining: refundResult.creditsRemaining,
          },
          { status: 503 }
        );
      }

      if (aiErr?.message === "INVALID_GEMINI_KEY") {
        return NextResponse.json(
          {
            error: "The configured Gemini API key is invalid.",
            code: "INVALID_KEY",
            refunded: true,
            creditsRemaining: refundResult.creditsRemaining,
          },
          { status: 401 }
        );
      }

      const safeMessage =
        aiErr?.message?.includes("rate limit")
          ? "AI capacity reached — please wait a few seconds and try again."
          : aiErr?.message || "Failed to generate Content Kit. Your 5 credits have been refunded.";

      return NextResponse.json(
        {
          error: safeMessage,
          refunded: true,
          creditsRemaining: refundResult.creditsRemaining,
        },
        { status: 503 }
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
