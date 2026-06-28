import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Auth-stable guard for protected pages.
 *
 * Hardened (Phase 57 calendar-stability): eviction is the LAST resort. Before
 * any redirect to `/auth`, the guard must satisfy ALL of:
 *
 *  1. Auth context has settled (`!loading && isAuthStable`).
 *  2. Tab is visible.
 *  3. No active text input / contenteditable has focus (user isn't typing).
 *  4. `supabase.auth.getSession()` returns no session after a 1500 ms grace
 *     window (covers Supabase WS reconnects + token-refresh races on mobile).
 *  5. No Supabase `sb-*-auth-token` entry exists in `localStorage` (defends
 *     against a transient in-memory context blip while the persisted token
 *     is still valid — rehydration will catch up on the next tick).
 *
 * Anything less is a no-op. This is intentionally conservative: a missed
 * redirect is recoverable, a false eviction mid-typing is not.
 */
export function useRequireAuth(enabled = true) {
  const { user, session, loading, isAuthStable } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!enabled) return;
    if (loading || !isAuthStable) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    if (user || session) return;

    let cancelled = false;
    const t = setTimeout(async () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;

      // Rule 3 — never evict a typing user.
      const active = typeof document !== "undefined" ? document.activeElement : null;
      const isTyping =
        !!active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          (active as HTMLElement)?.isContentEditable === true);
      if (isTyping) return;

      // Rule 5 — if a persisted Supabase token is on disk, never evict. The
      // context will rehydrate from it on the next auth tick.
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          for (let i = 0; i < window.localStorage.length; i++) {
            const k = window.localStorage.key(i);
            if (k && k.startsWith("sb-") && k.endsWith("-auth-token")) {
              const v = window.localStorage.getItem(k);
              if (v && v.length > 20) return;
            }
          }
        }
      } catch {
        // ignore storage errors
      }

      // Rule 4 — live recheck.
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data?.session?.user) return;

      navigate("/auth", {
        replace: true,
        state: { returnTo: location.pathname + location.search },
      });
    }, 1500);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [enabled, user, session, loading, isAuthStable, navigate, location.pathname, location.search]);
}
