import { NextRequest, NextResponse } from "next/server";

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

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

function buildPrompt(
  topic: string,
  niche: string,
  score: number,
  durationLabel: string,
  wordCount: number,
  format: string,
): string {
  return `You are a viral content strategist. Generate a complete content kit for this trending topic: ${topic} in the ${niche} niche with virality score ${score}/100. Return ONLY a JSON object with these exact fields: titles (array of 5 viral YouTube titles with high CTR), hooks (array of 3 attention-grabbing opening lines for videos), thumbnail_ideas (array of 2 strings, each one complete descriptive sentence detailing the thumbnail concept including colors, on-image text, and emotions), why_trending (one paragraph explaining why this topic is trending now and why viewers care), content_angles (array of 3 unique angles to cover this topic differently from competitors), best_format (string: Short/Long-form/Carousel with reason), catch_window (string: how many days before this trend peaks), virality_tips (array of 3 specific tips to maximize views on this topic), script (string: a complete, ready-to-record ${format} video script for a ${durationLabel} video that is EXACTLY ${wordCount} words long — count your words and match ${wordCount} as closely as possible. Format it as labeled sections in this exact order, each label on its own line: "HOOK:" then the hook, "INTRO:" then the intro, "MAIN CONTENT:" then the body, "CTA:" then the call to action. Use natural transitions between sections and engaging, conversational language optimized for a ${format} video. Use the literal "\\n" newline character to separate sections.)`;
}

export async function POST(req: NextRequest) {
  try {
    const { topic, niche, score, groqKey, durationLabel, wordCount, format } = await req.json();

    if (!groqKey?.trim()) {
      return NextResponse.json({ error: "missing_key" }, { status: 400 });
    }
    if (!topic?.trim()) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    const safeWordCount = Number.isFinite(wordCount) ? Math.round(wordCount) : 150;
    const prompt = buildPrompt(
      String(topic).trim(),
      String(niche ?? "").trim() || "general",
      Number.isFinite(score) ? Math.round(score) : 0,
      String(durationLabel ?? "").trim() || "60-second",
      safeWordCount,
      String(format ?? "").trim() || "short-form",
    );

    let res: Response;
    try {
      res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${String(groqKey).trim()}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.85,
          max_tokens: 6144,
          response_format: { type: "json_object" },
        }),
        signal: AbortSignal.timeout(30000),
      });
    } catch (err: any) {
      if (err?.name === "TimeoutError") {
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

    let kit: ContentKit;
    try {
      kit = JSON.parse(content);
    } catch {
      return NextResponse.json({ error: "Groq returned malformed JSON — try again." }, { status: 502 });
    }

    return NextResponse.json({ kit });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Unexpected error" }, { status: 500 });
  }
}
