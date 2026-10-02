import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { isAdminEmail } from "../admin";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Service-role client — bypasses Row Level Security so server-side operations
 * can access provider configurations and system telemetry.
 * This key is server-only and must NEVER be exposed to the client.
 */
export function getAdminClient(): SupabaseClient {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error("Server is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Returns true if the given email matches the configured admin email allowlist.
 */
export function isAuthorizedAdminEmail(email: string | null | undefined): boolean {
  return isAdminEmail(email);
}

export type AdminAuthResult =
  | { db: SupabaseClient; user: User }
  | { error: NextResponse };

/**
 * Central server-side admin authorization helper.
 * 1. Reads the Bearer token from the Authorization header.
 * 2. Validates the JWT with Supabase Auth server-side.
 * 3. Verifies the user is an authorized admin.
 * 4. Returns the service-role client and User object, or a 401/403 NextResponse error.
 */
export async function requireAdmin(req: NextRequest): Promise<AdminAuthResult> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return {
      error: NextResponse.json(
        { error: "Server infrastructure misconfigured: missing service-role credentials." },
        { status: 500 }
      ),
    };
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return {
      error: NextResponse.json({ error: "Unauthorized: Missing authentication token." }, { status: 401 }),
    };
  }

  const db = getAdminClient();
  const { data, error } = await db.auth.getUser(token);

  if (error || !data.user) {
    return {
      error: NextResponse.json({ error: "Unauthorized: Invalid or expired session." }, { status: 401 }),
    };
  }

  if (!isAuthorizedAdminEmail(data.user.email)) {
    return {
      error: NextResponse.json(
        { error: "Forbidden: You do not have administrative privileges." },
        { status: 403 }
      ),
    };
  }

  return { db, user: data.user };
}

/**
 * Resolves the authenticated user ID from:
 * 1. Authorization header: "Bearer <token>"
 * 2. Supabase session cookies: "fretrend-auth" (or chunked "fretrend-auth.0", "fretrend-auth.1", ...)
 * 3. Supabase standard SSR cookies: "sb-*-auth-token", "sb-access-token"
 * 4. Safe fallback in development/test environments so local creator pipelines never block on 401.
 */
export async function getAuthenticatedUserId(req: NextRequest): Promise<string | null> {
  const adminDb = getAdminClient();

  // 1. Bearer token in Authorization header
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();

  if (token) {
    try {
      const { data: { user }, error } = await adminDb.auth.getUser(token);
      if (!error && user?.id) {
        return user.id;
      }
    } catch (e) {
      console.warn("[adminAuth] Bearer token validation warning:", e);
    }
  }

  // 2. Cookie-backed session ('fretrend-auth' or chunked 'fretrend-auth.0', 'fretrend-auth.1')
  try {
    let cookieVal = req.cookies.get("fretrend-auth")?.value;
    if (!cookieVal) {
      let assembled = "";
      for (let i = 0; ; i++) {
        const chunk = req.cookies.get(`fretrend-auth.${i}`)?.value;
        if (!chunk) break;
        assembled += chunk;
      }
      if (assembled) cookieVal = assembled;
    }

    if (cookieVal) {
      try {
        const decoded = decodeURIComponent(cookieVal);
        const parsed = JSON.parse(decoded);
        const cookieAccessToken = parsed.access_token || parsed.currentSession?.access_token;
        if (cookieAccessToken) {
          const { data: { user }, error } = await adminDb.auth.getUser(cookieAccessToken);
          if (!error && user?.id) return user.id;
        }
        if (parsed.user?.id) {
          return parsed.user.id;
        }
      } catch {
        const { data: { user }, error } = await adminDb.auth.getUser(cookieVal);
        if (!error && user?.id) return user.id;
      }
    }

    // Check standard Supabase cookies
    const allCookies = req.cookies.getAll();
    for (const cookie of allCookies) {
      if (cookie.name.includes("-auth-token") || cookie.name === "sb-access-token") {
        try {
          const raw = decodeURIComponent(cookie.value);
          const parsed = JSON.parse(raw);
          const t = Array.isArray(parsed) ? parsed[0] : (parsed.access_token || raw);
          if (typeof t === "string" && t.length > 20) {
            const { data: { user }, error } = await adminDb.auth.getUser(t);
            if (!error && user?.id) return user.id;
          }
        } catch {}
      }
    }
  } catch (cookieErr) {
    console.warn("[adminAuth] Cookie inspection error:", cookieErr);
  }

  // 3. Fallback in development/test environment
  if (process.env.NODE_ENV !== "production") {
    try {
      const { data: usersData } = await adminDb.auth.admin.listUsers({ page: 1, perPage: 1 });
      if (usersData?.users?.[0]?.id) {
        return usersData.users[0].id;
      }
    } catch (devFallbackErr) {
      console.warn("[adminAuth] Dev fallback user lookup warning:", devFallbackErr);
    }
  }

  return null;
}

