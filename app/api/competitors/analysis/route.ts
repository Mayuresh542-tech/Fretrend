import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { decrypt } from "../../../lib/crypto";

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

export interface TitleFormula {
  formula: string;
  example: string;
}

export interface CompetitorAnalysis {
  whatsWorking: string[];
  contentGaps: string[];
  titleFormulas: TitleFormula[];
}

interface VideoInput {
  title?: string;
  views?: number;
  channel?: string;
}

function buildPrompt(niche: string, videos: VideoInput[]): string {
  const list = videos
    .map((v, i) => `${i + 1}. "${String(v.title ?? "").trim()}" — ${Number(v.views ?? 0).toLocaleString()} views (${String(v.channel ?? "").trim()})`)
    .join("\n");
  const avg = videos.length
    ? Math.round(videos.reduce((s, v) => s + Number(v.views ?? 0), 0) / videos.length)
    : 0;

  return `You are an expert YouTube growth strategist performing competitor analysis for the "${niche}" niche.

Here are the current top ${videos.length} videos in this niche, ranked by views:
${list}

Average views across these videos: ${avg.toLocaleString()}.

Analyze the TITLES, channels, and view counts above, then return ONLY a JSON object with these EXACT fields:
- "whatsWorking": array of 4-6 strings. Each is a specific, concrete insight about WHY these videos win — recurring title patterns, the hooks and emotional triggers competitors lean on, and the content formats/angles that clearly attract views. Reference patterns you actually observe in the titles above.
- "contentGaps": array of 4-6 strings. Each names a specific topic, sub-niche, audience, or angle that these top videos are NOT covering = an opportunity the user could own. Be concrete and actionable, not generic.
- "titleFormulas": array of 4-6 objects, each shaped { "formula": string, "example": string }. "formula" is a reusable winning title template distilled from the videos (e.g. "How to [achieve X]", "[Number] [things] every [audience] needs", "Why [surprising claim]"). "example" is a ready-to-use title for the "${niche}" niche that follows that exact formula.

Return STRICTLY valid JSON with no markdown fences and no commentary.`;
}

export async function POST(req: NextRequest) {
  try {
    const { niche, videos } = await req.json();

    const keyResult = await resolveGroqKey(req);
    if ("error" in keyResult) {
      return NextResponse.json({ error: keyResult.error }, { status: keyResult.status });
    }
    const { groqKey } = keyResult;

    const cleanNiche = String(niche ?? "").trim();
    const list: VideoInput[] = Array.isArray(videos) ? videos.slice(0, 10) : [];
    if (!cleanNiche || list.length === 0) {
      return NextResponse.json({ error: "Niche and videos are required." }, { status: 400 });
    }

    const prompt = buildPrompt(cleanNiche, list);

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
          temperature: 0.8,
          max_tokens: 3072,
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

    // Normalize defensively — the model occasionally drifts from the schema.
    const analysis: CompetitorAnalysis = {
      whatsWorking: Array.isArray(parsed.whatsWorking)
        ? parsed.whatsWorking.map((s) => String(s)).filter(Boolean)
        : [],
      contentGaps: Array.isArray(parsed.contentGaps)
        ? parsed.contentGaps.map((s) => String(s)).filter(Boolean)
        : [],
      titleFormulas: Array.isArray(parsed.titleFormulas)
        ? parsed.titleFormulas
            .map((f) => {
              const obj = (f ?? {}) as Record<string, unknown>;
              return { formula: String(obj.formula ?? "").trim(), example: String(obj.example ?? "").trim() };
            })
            .filter((f) => f.formula)
        : [],
    };

    return NextResponse.json({ analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
