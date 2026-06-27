import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Auth-stable guard for protected pages.
 *
 * Replaces the bare `if (!user) navigate('/auth')` pattern that caused
 * random eviction-to-login during token refresh, tab-switch, network blips,
 * or preview-origin session drift.
 *
 * Rules:
 *  - Waits for auth to settle (`!loading && isAuthStable`).
 *  - Skips while the tab is hidden (avoids tab-switch evictions).
 *  - On `!user && !session`, waits 400ms then re-checks `getSession()` once
 *    more before navigating to `/auth`. Token refreshes settle in < 250ms.
 *  - Preserves intended path via `returnTo`.
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
      // Second-tick recheck via the live client — token refresh may have settled.
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data?.session?.user) return;
      navigate("/auth", {
        replace: true,
        state: { returnTo: location.pathname + location.search },
      });
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [enabled, user, session, loading, isAuthStable, navigate, location.pathname, location.search]);
}
