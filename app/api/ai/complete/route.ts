import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/app/lib/server/adminAuth";
import { generateGeminiContent } from "@/app/lib/server/geminiService";
import { MockAIProvider } from "@/app/lib/services/aiProvider";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let userId: string | null = null;

  try {
    // 1. Authenticate user server-side
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "");
    const adminDb = getAdminClient();

    if (token) {
      const { data: { user }, error: authErr } = await adminDb.auth.getUser(token);
      if (!authErr && user) {
        userId = user.id;
      }
    }

    if (process.env.NODE_ENV === "production" && !userId) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to use AI generation." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { systemPrompt, userPrompt, temperature, jsonMode } = body;

    if (!userPrompt || typeof userPrompt !== "string") {
      return NextResponse.json({ error: "userPrompt is required." }, { status: 400 });
    }

    // 2. Generate with server-side Google Gemini
    try {
      const content = await generateGeminiContent({
        prompt: userPrompt,
        systemInstruction: systemPrompt || "You are an expert creator assistant for Veelox.",
        temperature: temperature ?? 0.7,
        jsonMode: Boolean(jsonMode),
        userId: userId ?? null,
      });

      return NextResponse.json({
        content,
        isDevelopmentMode: false,
        providerUsed: "gemini",
      });
    } catch (geminiErr: any) {
      console.warn("[AI API] Gemini completion failed, checking fallback:", geminiErr.message);

      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { error: "AI generation is temporarily unavailable." },
          { status: 503 }
        );
      }

      // Development fallback
      const mock = new MockAIProvider();
      const content = await mock.complete({ systemPrompt, userPrompt, temperature, jsonMode });
      return NextResponse.json({ content, isDevelopmentMode: true, providerUsed: "mock" });
    }
  } catch (err: any) {
    console.error("[AI API] Error during completion:", err.message);

    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "AI generation is temporarily unavailable." },
        { status: 503 }
      );
    }

    const mock = new MockAIProvider();
    const content = await mock.complete({
      systemPrompt: "Veelox",
      userPrompt: "Fallback",
      jsonMode: true,
    });
    return NextResponse.json({ content, isDevelopmentMode: true, providerUsed: "mock" });
  }
}
