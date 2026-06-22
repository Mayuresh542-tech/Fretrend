import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { decrypt } from "../../lib/crypto";

// Reads the caller's Authorization header to fetch their Groq key, so it must
// always run dynamically at request time (never prerendered/cached).
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Resolve the caller's Groq key: verify their bearer token, read the encrypted
 * key from Supabase, and decrypt it server-side. Mirrors the content-kit route.
 */
async function resolveGroqKey(
  req: NextRequest,
): Promise<{ groqKey: string } | { error: string; status: number }> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return { error: "Server is missing SUPABASE_SERVICE_ROLE_KEY.", status: 500 };
  }

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { error: "Unauthorized", status: 401 };

  const db = adminClient();
  const { data: userData, error: userErr } = await db.auth.getUser(token);
  if (userErr || !userData.user) return { error: "Unauthorized", status: 401 };

  const { data } = await db
    .from("api_keys")
    .select("groq_key")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  const stored = data?.groq_key;
  if (!stored) return { error: "missing_key", status: 400 };
  return { groqKey: decrypt(stored).trim() };
}

export interface PlatformSection {
  label: string;
  kind: "text" | "list";
  value: string | string[];
}

interface PlatformSpec {
  name: string;
  guidance: string;
}

/** Per-platform output contract handed to Groq. Keep labels stable — the UI
 *  renders whatever sections come back, but these match the product spec. */
const PLATFORM_SPECS: Record<string, PlatformSpec> = {
  youtube: {
    name: "YouTube",
    guidance: `Optimize for a long-form YouTube video. Return these sections, in this order:
- { "label": "Title", "kind": "text", "value": a compelling, SEO-aware long-form title (50-70 characters) }
- { "label": "Description", "kind": "text", "value": a full description — a strong opening line, 2-3 sentences of context, a short bulleted list of what's covered, and a subscribe CTA }
- { "label": "Full Script", "kind": "text", "value": a complete spoken script with labeled HOOK, INTRO, MAIN CONTENT and CTA sections, each label on its own line separated by newlines }
- { "label": "Tags", "kind": "list", "value": 10-15 SEO tags as plain keywords with NO # symbol }`,
  },
  tiktok: {
    name: "TikTok",
    guidance: `Optimize for TikTok — vertical, fast, native and high-energy. Return these sections, in this order:
- { "label": "Hook", "kind": "text", "value": one punchy scroll-stopping line delivered in the first 2 seconds }
- { "label": "Script (15-60s)", "kind": "text", "value": a fast-paced, conversational spoken script sized for a 15-60 second video }
- { "label": "Trending Sounds", "kind": "list", "value": 3-4 suggested trending audio/sound styles that fit this content }
- { "label": "Hashtags", "kind": "list", "value": 5-8 hashtags mixing niche-specific and broad-reach tags, each including the # symbol }`,
  },
  reels: {
    name: "Instagram Reels",
    guidance: `Optimize for Instagram Reels. Return these sections, in this order:
- { "label": "Hook", "kind": "text", "value": a first-3-seconds hook combining a visual idea and a spoken line }
- { "label": "Caption", "kind": "text", "value": a catchy caption with tasteful emojis and a clear call to action }
- { "label": "Script (15-45s)", "kind": "text", "value": a short, punchy spoken script for a 15-45 second Reel }
- { "label": "Hashtags", "kind": "list", "value": 8-12 relevant hashtags, each including the # symbol }`,
  },
  twitter: {
    name: "Twitter / X",
    guidance: `Optimize for Twitter/X. Return these sections, in this order:
- { "label": "Single Viral Tweet", "kind": "text", "value": one punchy standalone tweet under 280 characters }
- { "label": "Thread", "kind": "list", "value": a 5-7 tweet thread that builds a narrative; each array item is ONE tweet prefixed like "1/", "2/" and kept under 280 characters }`,
  },
  linkedin: {
    name: "LinkedIn",
    guidance: `Optimize for LinkedIn — professional, insightful and value-first. Return these sections, in this order:
- { "label": "Hook", "kind": "text", "value": a scroll-stopping first line that earns the "see more" click }
- { "label": "Post", "kind": "text", "value": a professional, value-focused post with short paragraphs separated by newlines, a genuine insight or angle, and a closing question or takeaway }
- { "label": "Hashtags", "kind": "list", "value": 3-5 professional hashtags, each including the # symbol }`,
  },
};

function buildPrompt(topic: string, niche: string, score: number, spec: PlatformSpec): string {
  return `You are a platform-native content strategist. Repurpose this trending topic specifically for ${spec.name}.

Topic: "${topic}"
Niche: ${niche}
Virality score: ${score}/100

${spec.guidance}

Match ${spec.name}'s native style, tone, ideal length, and best practices EXACTLY — content written for one platform should never read like it was copied from another. Return ONLY a JSON object shaped { "sections": [ ... ] } containing the sections described above, in that order. Every section must have "label" (string), "kind" ("text" or "list"), and "value" (a string for "text", an array of strings for "list"). No markdown fences and no commentary.`;
}

export async function POST(req: NextRequest) {
  try {
    const { topic, niche, score, platform } = await req.json();

    const keyResult = await resolveGroqKey(req);
    if ("error" in keyResult) {
      return NextResponse.json({ error: keyResult.error }, { status: keyResult.status });
    }
    const { groqKey } = keyResult;

    const cleanTopic = String(topic ?? "").trim();
    if (!cleanTopic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }
    const spec = PLATFORM_SPECS[String(platform ?? "").trim()];
    if (!spec) {
      return NextResponse.json({ error: "Unknown platform" }, { status: 400 });
    }

    const prompt = buildPrompt(
      cleanTopic,
      String(niche ?? "").trim() || "general",
      Number.isFinite(score) ? Math.round(score) : 0,
      spec,
    );

    let res: Response;
    try {
      res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.85,
          max_tokens: 4096,
          response_format: { type: "json_object" },
        }),
        signal: AbortSignal.timeout(30000),
      });
    } catch (err) {
      if (err instanceof Error && err.name === "TimeoutError") {
        return NextResponse.json({ error: "Groq timed out — try again." }, { status: 504 });
      }
      throw err;
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      if (res.status === 401) {
        return NextResponse.json({ error: "invalid_key" }, { status: 401 });
      }
      if (res.status === 429) {
        return NextResponse.json(
          { error: "Groq rate limit hit — wait a moment and try again." },
          { status: 429 },
        );
      }
      return NextResponse.json(
        { error: "Groq request failed.", detail: detail.slice(0, 300) },
        { status: res.status },
      );
    }

    const data = await res.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "Empty response from Groq." }, { status: 502 });
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json({ error: "Groq returned malformed JSON — try again." }, { status: 502 });
    }

    // Normalize defensively — coerce each section to a clean text/list shape.
    const rawSections = Array.isArray(parsed.sections) ? parsed.sections : [];
    const sections: PlatformSection[] = rawSections
      .map((s) => {
        const obj = (s ?? {}) as Record<string, unknown>;
        const label = String(obj.label ?? "").trim();
        const kind: "text" | "list" = obj.kind === "list" ? "list" : "text";
        let value: string | string[];
        if (kind === "list") {
          value = Array.isArray(obj.value)
            ? obj.value.map((v) => String(v).trim()).filter(Boolean)
            : obj.value
              ? [String(obj.value).trim()]
              : [];
        } else {
          value = Array.isArray(obj.value)
            ? obj.value.map((v) => String(v)).join("\n")
            : String(obj.value ?? "").trim();
        }
        return { label, kind, value };
      })
      .filter((s) => s.label && (Array.isArray(s.value) ? s.value.length > 0 : s.value.length > 0));

    if (sections.length === 0) {
      return NextResponse.json({ error: "Groq returned no usable content — try again." }, { status: 502 });
    }

    return NextResponse.json({ platform: String(platform), sections });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
