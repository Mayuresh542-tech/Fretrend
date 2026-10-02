"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function ReferralTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ref = searchParams?.get("ref");
    if (ref && ref.trim()) {
      const cleanRef = ref.trim().toUpperCase();
      try {
        localStorage.setItem("veelox_ref", cleanRef);
        // Also set a 30-day cookie for server-side referral capture
        document.cookie = `veelox_ref=${encodeURIComponent(
          cleanRef
        )}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
      } catch {
        // Safe fallback in restricted environments
      }
    }
  }, [searchParams]);

  return null;
}
