export type PlanId = "free" | "pro" | "creator" | "studio";

export interface PlanConfig {
  id: PlanId;
  name: string;
  price: number;
  yearlyPrice: number;
  currency: string;
  displayPrice: string;
  yearlyDisplayPrice: string;
  billingPeriod: "monthly" | "forever";
  monthlyCredits: number;
  description: string;
  badge?: string;
  highlight?: boolean;
  features: string[];
  directCheckoutEnabled: boolean;
  whopCheckoutEnabled: boolean;
  whopCheckoutUrl: string;
}

export const WHOP_DEFAULT_CHECKOUT_URL =
  process.env.WHOP_CHECKOUT_URL || "https://whop.com/veelox-0514/veelox-3d/";

const FREE_PLAN: PlanConfig = {
  id: "free",
  name: "Free",
  price: 0,
  yearlyPrice: 0,
  currency: "USD",
  displayPrice: "$0",
  yearlyDisplayPrice: "$0",
  billingPeriod: "forever",
  monthlyCredits: 30,
  description: "Limited credits and basic functionality for testing AI video creation.",
  features: [
    "30 monthly credits",
    "Real-time trend signals",
    "AI script generation",
    "Standard quality video rendering",
    "Access to template gallery",
  ],
  directCheckoutEnabled: false,
  whopCheckoutEnabled: false,
  whopCheckoutUrl: "",
};

const PRO_PLAN: PlanConfig = {
  id: "pro",
  name: "Pro",
  price: 19,
  yearlyPrice: 190,
  currency: "USD",
  displayPrice: "$19",
  yearlyDisplayPrice: "$190",
  billingPeriod: "monthly",
  monthlyCredits: 350,
  description: "The primary plan for solo creators and teams producing weekly viral content.",
  highlight: true,
  badge: "MOST POPULAR",
  features: [
    "350 monthly credits (or 4,200/yr)",
    "Full AI Video & Voiceover pipeline",
    "Unlimited kinetic subtitle styling",
    "Commercial B-roll & Stock library",
    "1080p 60fps fast rendering",
    "Priority customer & founder support",
  ],
  directCheckoutEnabled: true,
  whopCheckoutEnabled: true,
  whopCheckoutUrl: WHOP_DEFAULT_CHECKOUT_URL,
};

export const PLANS: Record<PlanId, PlanConfig> = {
  free: FREE_PLAN,
  pro: PRO_PLAN,
  // Backward compatibility aliases for existing DB records & webhook event handlers
  creator: {
    ...PRO_PLAN,
    id: "creator",
    name: "Pro",
  },
  studio: {
    ...PRO_PLAN,
    id: "studio",
    name: "Pro",
  },
};

export function getPlan(id: string): PlanConfig | null {
  const normalized = id.toLowerCase().trim() as PlanId;
  if (normalized === "free") return PLANS.free;
  if (normalized === "pro" || normalized === "creator" || normalized === "studio") {
    return PLANS.pro;
  }
  return null;
}

export function getAllPlans(): PlanConfig[] {
  // Return ONLY the two modern plans for the UI
  return [PLANS.free, PLANS.pro];
}
