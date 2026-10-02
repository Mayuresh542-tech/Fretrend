"use client";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type AuthStatus = "loading" | "authed" | "unauthed";

/**
 * Client-side auth gate. Resolves the persisted Supabase session WITHOUT
 * redirecting prematurely.
 *
 * Auth state transitions:
 *   "loading" (checking) -> "authed" (valid session verified)
 *   "loading" (checking) -> "unauthed" (verified no session or signed out)
 *
 * Callers must treat "loading" as checking: never redirect while "loading".
 */
export function useAuthGate(): { status: AuthStatus; session: Session | null } {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let mounted = true;
    let hasResolvedSession = false;

    // 1. Subscribe to auth state changes as the primary reactive listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (!mounted) return;

      if (s?.user) {
        hasResolvedSession = true;
        setSession(s);
        setStatus("authed");
      } else if (event === "SIGNED_OUT") {
        hasResolvedSession = false;
        setSession(null);
        setStatus("unauthed");
      } else if (event === "INITIAL_SESSION" && !s) {
        if (!hasResolvedSession) {
          setSession(null);
          setStatus("unauthed");
        }
      }
    });

    // 2. Query getSession to resolve immediately from storage/memory
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data?.session?.user) {
        hasResolvedSession = true;
        setSession(data.session);
        setStatus("authed");
      } else if (!hasResolvedSession) {
        setSession(null);
        setStatus("unauthed");
      }
    }).catch(() => {
      if (!mounted) return;
      if (!hasResolvedSession) {
        setSession(null);
        setStatus("unauthed");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { status, session };
}

