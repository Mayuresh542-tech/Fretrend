"use client";
import { useEffect } from "react";

/**
 * Fixes the "blank page on browser back button" bug.
 *
 * Every page animates in from `initial={{ opacity: 0 }}` via Framer Motion.
 * When the browser serves a page from its back/forward cache (bfcache) on a
 * Back/Forward navigation, Framer Motion's frame loop is restored in a frozen
 * state and the enter animations never replay — leaving the page wrapper,
 * sidebar, and cards stuck at opacity 0, i.e. a fully blank screen.
 *
 * The `pageshow` event fires with `persisted === true` ONLY on a bfcache
 * restore. In that single case we force a fresh load so Framer Motion
 * re-initialises and the UI animates in normally. A fresh load fires
 * `pageshow` with `persisted === false`, so there is no reload loop, and
 * ordinary navigations are left untouched.
 */
export default function BFCacheReload() {
  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        window.location.reload();
      }
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return null;
}
