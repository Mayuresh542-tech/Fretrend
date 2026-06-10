import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { encrypt, decrypt } from "../../lib/crypto";

// Reads the caller's Authorization header to authorize, so it must always run
// dynamically at request time (never prerendered/cached).
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Service-role client — bypasses Row Level Security. Server-only key (no
 * NEXT_PUBLIC_ prefix); must NEVER be imported into a client component.
 */
function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Verify the bearer token against Supabase Auth and resolve the user. Identity
 * comes from verifying the JWT server-side — the client's claims are never
 * trusted. Returns the admin client plus the authenticated user id.
 */
async function authorize(
  req: NextRequest,
): Promise<{ db: SupabaseClient; userId: string } | { error: NextResponse }> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return {
      error: NextResponse.json(
        { error: "Server is missing SUPABASE_SERVICE_ROLE_KEY." },
        { status: 500 },
      ),
    };
  }

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const db = adminClient();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { db, userId: data.user.id };
}

/** Return the caller's own Groq key, decrypted, so Settings can prefill it. */
export async function GET(req: NextRequest) {
  const auth = await authorize(req);
  if ("error" in auth) return auth.error;
  const { db, userId } = auth;

  try {
    const { data, error } = await db
      .from("api_keys")
      .select("groq_key")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;

    const stored = data?.groq_key;
    const groqKey = stored ? decrypt(stored) : "";
    return NextResponse.json({ groqKey });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load key";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Encrypt and store the caller's Groq key. */
export async function POST(req: NextRequest) {
  const auth = await authorize(req);
  if ("error" in auth) return auth.error;
  const { db, userId } = auth;

  try {
    const body = await req.json().catch(() => ({}));
    const groqKey = typeof body.groqKey === "string" ? body.groqKey.trim() : "";

    const stored = groqKey ? encrypt(groqKey) : "";
    const { error } = await db
      .from("api_keys")
      .upsert({ user_id: userId, groq_key: stored }, { onConflict: "user_id" });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save key";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
