"use client";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type AuthStatus = "loading" | "authed" | "unauthed";

/**
 * Client-side auth gate. Resolves the persisted Supabase session WITHOUT
 * redirecting prematurely.
 *
 * The subtlety this exists to handle: getSession() is async and, on a fresh
 * tab or a browser reopen, can resolve to `null` before the stored session has
 * finished hydrating / refreshing its (expired) access token. The real session
 * then arrives moments later via an onAuthStateChange event (INITIAL_SESSION /
 * TOKEN_REFRESHED). So we listen for that too, and callers must treat
 * "loading" as "don't redirect yet" — redirect only once we reach "unauthed".
 */
export function useAuthGate(): { status: AuthStatus; session: Session | null } {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session?.user) {
        setSession(data.session);
        setStatus("authed");
      } else {
        setStatus("unauthed");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (!mounted) return;
      if (s?.user) {
        setSession(s);
        setStatus("authed");
      } else if (event === "SIGNED_OUT") {
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
