import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

/**
 * Default fallback admin email if ADMIN_EMAILS environment variable is unset.
 */
export const DEFAULT_ADMIN_EMAIL = "mayureshsharma542@gmail.com";

/**
 * Get all authorized admin emails from the ADMIN_EMAILS environment variable
 * or the default fallback. Case-insensitive list.
 */
export function getAdminEmails(): string[] {
  const envVal = process.env.ADMIN_EMAILS || "";
  const emails = envVal
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (emails.length === 0) {
    emails.push(DEFAULT_ADMIN_EMAIL.toLowerCase());
  }

  return Array.from(new Set(emails));
}

/**
 * Strict case-insensitive check whether an email belongs to an authorized admin.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const allowlist = getAdminEmails();
  return allowlist.includes(normalized);
}

/**
 * Server-only helper to create a Supabase client with the service role key.
 * This key bypasses Row Level Security and must NEVER be exposed client-side.
 */
export function createAdminSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in server environment.");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Strict server-side verification of an incoming request's Bearer token or cookie.
 * Verifies JWT via Supabase Auth and confirms email is in ADMIN_EMAILS.
 * Throws or returns an error object if unauthorized.
 */
export async function verifyServerAdmin(
  authHeaderOrToken: string | null | undefined,
): Promise<{ user: User; db: SupabaseClient }> {
  const token = (authHeaderOrToken || "").replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    throw new Error("Missing authentication token.");
  }

  const db = createAdminSupabaseClient();
  const { data, error } = await db.auth.getUser(token);

  if (error || !data.user) {
    throw new Error("Invalid or expired session token.");
  }

  if (!isAdminEmail(data.user.email)) {
    throw new Error("Forbidden: Account is not an authorized administrator.");
  }

  return { user: data.user, db };
}
