import { getPlan, PlanConfig } from "../../config/plans";

export interface DirectCheckoutParams {
  userId?: string;
  email: string;
  planId: string;
  referralCode?: string;
}

export interface DirectCheckoutResult {
  status: "placeholder_pending" | "ready_for_payment" | "error";
  plan: PlanConfig;
  orderSummary: {
    planName: string;
    subtotal: number;
    currency: string;
    displayAmount: string;
    billingPeriod: string;
    creditsIncluded: number;
    customerEmail: string;
  };
  paymentGatewayReady: boolean;
  message: string;
  checkoutUrl?: string;
}

/**
 * Clean server-side abstraction for direct website checkout.
 * IMPORTANT:
 * - Does NOT fake payment success.
 * - Does NOT activate subscriptions automatically.
 * - Future payment gateway (Stripe, LemonSqueezy, Paddle, Razorpay) hooks in here.
 */
export async function createDirectCheckout(
  params: DirectCheckoutParams,
): Promise<DirectCheckoutResult> {
  const plan = getPlan(params.planId);

  if (!plan) {
    throw new Error(`Invalid plan selection: "${params.planId}".`);
  }

  if (plan.id === "free") {
    throw new Error("Free tier does not require checkout.");
  }

  const orderSummary = {
    planName: plan.name,
    subtotal: plan.price,
    currency: plan.currency,
    displayAmount: plan.displayPrice,
    billingPeriod: plan.billingPeriod,
    creditsIncluded: plan.monthlyCredits,
    customerEmail: params.email,
  };

  // TODO: [Payment Provider Integration]
  // 1. Initialize Stripe / Paddle / Razorpay customer
  // 2. Create Checkout Session with line items and customer email
  // 3. Attach metadata: { userId: params.userId, planId: plan.id, referralCode: params.referralCode }
  // 4. Return provider's checkoutUrl: session.url

  return {
    status: "placeholder_pending",
    plan,
    orderSummary,
    paymentGatewayReady: false,
    message:
      "Direct online payment processing is being finalized. In the meantime, you can activate this plan instantly via our verified Whop store.",
    checkoutUrl: plan.whopCheckoutUrl,
  };
}
