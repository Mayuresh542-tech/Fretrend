/**
 * The single admin account allowed to access the admin panel and its API.
 * This is NOT a secret (the real protection is the server-side service-role
 * check in app/api/admin/route.ts) — it's shared by the client (to decide
 * whether to show the admin link / page) and the server (to authorize).
 *
 * To change who is admin, edit this one value.
 */
export const ADMIN_EMAIL = "mayureshsharma542@gmail.com";

/** Case-insensitive admin check. */
export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}
