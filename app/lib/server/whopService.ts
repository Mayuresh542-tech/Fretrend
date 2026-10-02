import crypto from "crypto";
import { createAdminSupabaseClient } from "../admin";
import { PLANS, PlanConfig } from "../../config/plans";

const WHOP_API_BASE = "https://api.whop.com/api/v5";

/**
 * Get server-side Whop API Key.
 * NEVER expose this key to client-side code.
 */
function getWhopApiKey(): string {
  const key = process.env.WHOP_API_KEY;
  if (!key) {
    throw new Error("WHOP_API_KEY is not configured in server environment.");
  }
  return key.trim();
}

/**
 * Check whether Whop API key is configured.
 */
export function isWhopConfigured(): boolean {
  return Boolean(process.env.WHOP_API_KEY && process.env.WHOP_API_KEY.trim().length > 0);
}

/**
 * Server-side helper to make authenticated requests to Whop API.
 * Never forwards sensitive tokens or headers back to the browser.
 */
async function whopFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const apiKey = getWhopApiKey();
  const url = endpoint.startsWith("http") ? endpoint : `${WHOP_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    // Server-side only; avoid stale caching
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Whop API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Test Whop connection and fetch sanitized company / store metadata.
 * Safe for admin panel display — never returns secrets.
 */
export async function getWhopCompanyInfo(): Promise<{
  connected: boolean;
  companyId?: string;
  title?: string;
  route?: string;
  currency?: string;
  email?: string;
  errorMessage?: string;
}> {
  if (!isWhopConfigured()) {
    return { connected: false, errorMessage: "WHOP_API_KEY not set" };
  }

  try {
    const data = await whopFetch<any>("/me");
    return {
      connected: true,
      companyId: data.id || data.company_id,
      title: data.name || data.title || "Veelox Whop Store",
      route: data.route || "veelox-0514",
      currency: data.currency || "usd",
      email: data.email,
    };
  } catch (err: any) {
    return {
      connected: false,
      errorMessage: err.message || "Failed to authenticate with Whop API",
    };
  }
}

/**
 * Fetch Whop products/experiences safely for admin overview.
 */
export async function getWhopProducts(): Promise<Array<{
  id: string;
  name: string;
  visibility: string;
  price?: number;
}>> {
  if (!isWhopConfigured()) return [];

  try {
    const data = await whopFetch<any>("/products");
    const list = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
    return list.map((item: any) => ({
      id: item.id,
      name: item.name || item.title || "Unnamed Product",
      visibility: item.visibility || "active",
      price: item.price,
    }));
  } catch {
    return [];
  }
}

/**
 * Verify Whop webhook signature using HMAC SHA256.
 * Whop sends headers like `webhook-signature` or `whop-signature`.
 */
export function verifyWhopSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret?: string,
): boolean {
  const webhookSecret = secret || process.env.WHOP_WEBHOOK_SECRET;

  if (!webhookSecret) {
    // If not configured, reject webhook
    return false;
  }

  if (!signatureHeader) return false;

  try {
    // Whop signature header format: either raw hex or t=timestamp,v1=signature
    let expectedSig = signatureHeader.trim();
    if (signatureHeader.includes("v1=")) {
      const parts = signatureHeader.split(",");
      const sigPart = parts.find((p) => p.trim().startsWith("v1="));
      if (sigPart) expectedSig = sigPart.trim().replace("v1=", "");
    }

    const computed = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (computed.length !== expectedSig.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(computed, "utf8"),
      Buffer.from(expectedSig, "utf8"),
    );
  } catch {
    return false;
  }
}

/**
 * Map a Whop membership / plan name to an internal Veelox plan.
 */
export function resolveWhopPlan(productOrPlanName?: string): PlanConfig {
  const name = (productOrPlanName || "").toLowerCase();
  if (name.includes("studio") || name.includes("agency") || name.includes("enterprise")) {
    return PLANS.studio;
  }
  // Default to Creator tier for paid Whop purchases
  return PLANS.creator;
}

export interface WhopWebhookPayload {
  action: string;
  data: {
    id: string; // membership or payment id
    user_id?: string;
    email?: string;
    status?: string; // active, past_due, canceled, expired
    product_id?: string;
    product_name?: string;
    plan_name?: string;
    current_period_start?: number | string;
    current_period_end?: number | string;
    [key: string]: any;
  };
  event_id?: string;
  [key: string]: any;
}

/**
 * Handle incoming Whop webhook event idempotently.
 * 1. Checks if event has already been processed.
 * 2. Matches or creates customer record.
 * 3. Updates unified `subscriptions` table with source='whop'.
 * 4. Grants credits via `credit_transactions` ledger.
 */
export async function processWhopWebhook(
  rawEvent: WhopWebhookPayload,
  eventId: string,
): Promise<{ success: boolean; message: string; duplicate?: boolean }> {
  const db = createAdminSupabaseClient();
  const eventType = rawEvent.action || rawEvent.type || "unknown";

  // 1. Idempotency Check: Verify if event was already recorded
  const { data: existingEvent } = await db
    .from("webhook_events")
    .select("id, processed")
    .eq("provider", "whop")
    .eq("external_event_id", eventId)
    .maybeSingle();

  if (existingEvent?.processed) {
    return {
      success: true,
      message: `Event ${eventId} already processed.`,
      duplicate: true,
    };
  }

  // Record event initial receipt
  if (!existingEvent) {
    await db.from("webhook_events").insert({
      provider: "whop",
      external_event_id: eventId,
      event_type: eventType,
      processed: false,
      metadata: {
        action: eventType,
        membership_id: rawEvent.data?.id,
        user_id: rawEvent.data?.user_id,
      },
    });
  }

  try {
    const data = rawEvent.data || {};
    const customerEmail = (data.email || data.user?.email || "").toLowerCase().trim();
    const externalMembershipId = data.id || data.membership_id;
    const externalCustomerId = data.user_id || data.customer_id;
    const whopStatus = (data.status || "").toLowerCase();

    // Map Whop status to Veelox subscription status
    let subscriptionStatus: "active" | "canceled" | "expired" | "past_due" = "active";
    if (eventType.includes("cancel") || whopStatus === "canceled") {
      subscriptionStatus = "canceled";
    } else if (eventType.includes("expire") || whopStatus === "expired") {
      subscriptionStatus = "expired";
    } else if (eventType.includes("past_due") || whopStatus === "past_due") {
      subscriptionStatus = "past_due";
    }

    const assignedPlan = resolveWhopPlan(data.product_name || data.plan_name);

    // 2. Identify corresponding Veelox user
    let targetUserId: string | null = null;

    if (customerEmail) {
      // Find user by email in auth.users
      const { data: usersData } = await db.auth.admin.listUsers({ perPage: 1000 });
      const foundUser = usersData?.users.find(
        (u) => (u.email || "").toLowerCase() === customerEmail,
      );
      if (foundUser) {
        targetUserId = foundUser.id;
      } else {
        // Create pre-provisioned user so they can sign in with this email
        const { data: newUser } = await db.auth.admin.createUser({
          email: customerEmail,
          email_confirm: true,
          user_metadata: { source: "whop", whop_user_id: externalCustomerId },
        });
        if (newUser?.user) {
          targetUserId = newUser.user.id;
        }
      }
    }

    if (!targetUserId && externalMembershipId) {
      // Check if existing subscription has this external membership ID
      const { data: existingSub } = await db
        .from("subscriptions")
        .select("user_id")
        .eq("external_subscription_id", externalMembershipId)
        .maybeSingle();

      if (existingSub) {
        targetUserId = existingSub.user_id;
      }
    }

    if (!targetUserId) {
      // Mark event processed but flag that user was pending email registration
      await db
        .from("webhook_events")
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          metadata: {
            ...rawEvent,
            unmapped_reason: "No user found or created for payload",
          },
        })
        .eq("provider", "whop")
        .eq("external_event_id", eventId);

      return {
        success: true,
        message: "Webhook logged. User will link upon email confirmation.",
      };
    }

    // 3. Upsert unified subscription record (SOURCE B: Whop)
    const periodStart = data.current_period_start
      ? new Date(
          typeof data.current_period_start === "number"
            ? data.current_period_start * 1000
            : data.current_period_start,
        ).toISOString()
      : new Date().toISOString();

    const periodEnd = data.current_period_end
      ? new Date(
          typeof data.current_period_end === "number"
            ? data.current_period_end * 1000
            : data.current_period_end,
        ).toISOString()
      : null;

    const { data: subRecord, error: subError } = await db
      .from("subscriptions")
      .upsert(
        {
          user_id: targetUserId,
          source: "whop",
          plan: assignedPlan.id,
          status: subscriptionStatus,
          credits: assignedPlan.monthlyCredits,
          current_period_start: periodStart,
          current_period_end: periodEnd,
          external_customer_id: externalCustomerId || null,
          external_subscription_id: externalMembershipId || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select()
      .single();

    if (subError) throw subError;

    // 4. Grant credits via server-side credit ledger if active activation/renewal
    if (subscriptionStatus === "active" && !eventType.includes("cancel")) {
      await db.from("credit_transactions").insert({
        user_id: targetUserId,
        amount: assignedPlan.monthlyCredits,
        type: "monthly_grant",
        feature: "whop_subscription",
        reference_id: eventId,
      });
    }

    // 5. Mark webhook event as processed
    await db
      .from("webhook_events")
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
      })
      .eq("provider", "whop")
      .eq("external_event_id", eventId);

    return {
      success: true,
      message: `Subscription for ${customerEmail || targetUserId} updated to ${assignedPlan.name} (${subscriptionStatus}).`,
    };
  } catch (err: any) {
    // Record error in webhook_events
    await db
      .from("webhook_events")
      .update({
        processed: false,
        metadata: { error: err.message },
      })
      .eq("provider", "whop")
      .eq("external_event_id", eventId);

    throw err;
  }
}
