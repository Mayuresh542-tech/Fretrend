import { NextRequest, NextResponse } from "next/server";
import { generateGeminiJson } from "../../../lib/server/geminiService";

export const dynamic = "force-dynamic";

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

function buildPrompt(niche: string, videos: VideoInput[]): { prompt: string; systemInstruction: string } {
  const list = videos
    .map(
      (v, i) =>
        `${i + 1}. "${String(v.title ?? "").trim()}" — ${Number(
          v.views ?? 0
        ).toLocaleString()} views (${String(v.channel ?? "").trim()})`
    )
    .join("\n");

  const avg = videos.length
    ? Math.round(videos.reduce((s, v) => s + Number(v.views ?? 0), 0) / videos.length)
    : 0;

  const systemInstruction = `You are a world-class YouTube growth analyst and audience strategist for Veelox.
Critical rules:
1. Base your analysis STRICTLY on the actual video titles, channel names, and view counts provided below.
2. Do NOT invent fake viewer statistics or fake retention curves.
3. Deliver high-value, actionable strategic observations distinguishing between observed data and strategic recommendations.`;

  const prompt = `Perform competitor analysis for the "${niche}" niche based on these top ${videos.length} videos:

${list}

Average views across observed videos: ${avg.toLocaleString()}.

Analyze the patterns above and return ONLY a JSON object with these EXACT fields:
- "whatsWorking": array of 4-6 strings. Specific, concrete insights about WHY these videos succeed — recurring title triggers, emotional anchors, and format hooks observable in the titles above.
- "contentGaps": array of 4-6 strings. Specific underserved topics, angles, or questions that these competitors are NOT addressing — prime opportunities for a new creator to own.
- "titleFormulas": array of 4-6 objects shaped { "formula": string, "example": string }. "formula" is a reusable winning pattern distilled from the data. "example" is an original, ready-to-use title for the "${niche}" niche following that formula.

Return STRICTLY valid JSON with no markdown fences and no conversational commentary.`;

  return { prompt, systemInstruction };
}

export async function POST(req: NextRequest) {
  try {
    const { niche, videos } = await req.json();

    const cleanNiche = String(niche ?? "").trim();
    const list: VideoInput[] = Array.isArray(videos) ? videos.slice(0, 10) : [];
    if (!cleanNiche || list.length === 0) {
      return NextResponse.json({ error: "Niche and videos are required." }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim() || null;

    const { prompt, systemInstruction } = buildPrompt(cleanNiche, list);

    try {
      const parsed = await generateGeminiJson<Record<string, any>>({
        prompt,
        systemInstruction,
        temperature: 0.7,
        operation: "competitor_analysis",
      });

      const analysis: CompetitorAnalysis = {
        whatsWorking: Array.isArray(parsed?.whatsWorking)
          ? parsed.whatsWorking.map((s: any) => String(s)).filter(Boolean)
          : [],
        contentGaps: Array.isArray(parsed?.contentGaps)
          ? parsed.contentGaps.map((s: any) => String(s)).filter(Boolean)
          : [],
        titleFormulas: Array.isArray(parsed?.titleFormulas)
          ? parsed.titleFormulas
              .map((f: any) => {
                const obj = (f ?? {}) as Record<string, unknown>;
                return {
                  formula: String(obj.formula ?? "").trim(),
                  example: String(obj.example ?? "").trim(),
                };
              })
              .filter((f) => f.formula && f.example)
          : [],
      };

      return NextResponse.json({ analysis });
    } catch (aiErr: any) {
      console.warn("[Competitors Analysis API] Gemini error:", aiErr.message);

      if (process.env.NODE_ENV === "development") {
        return NextResponse.json({
          analysis: {
            whatsWorking: [
              `Curiosity-driven titles posing questions achieve 2.4x higher clickthrough in the ${cleanNiche} niche.`,
              "Explicit timeframe challenges ('7 Days', '30 Days') dominate top search rankings.",
              "Contrarian 'Why X is Wrong' hooks capture high comment velocity and repeat shares.",
            ],
            contentGaps: [
              `Beginner-to-intermediate transition workflows are currently underserved.`,
              `Objective budget benchmarks and cost comparisons have zero dedicated coverage in the top 10 results.`,
              `Practical execution blueprints with zero theoretical fluff.`,
            ],
            titleFormulas: [
              { formula: "Why [Established Authority] is Wrong About [Topic]", example: `Why 99% of People Are Wrong About ${cleanNiche}` },
              { formula: "I Tested [Topic] for [Timeframe] (Here's What Happened)", example: `I Tested ${cleanNiche} for 30 Days (Real Numbers)` },
              { formula: "The [Topic] Blueprint Nobody Wants You to Know", example: `The Complete ${cleanNiche} Roadmap for 2025` },
            ],
          },
          isDevelopmentMode: true,
        });
      }

      return NextResponse.json(
        { error: "AI competitor analysis is temporarily unavailable. Please retry in a moment." },
        { status: 503 }
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
