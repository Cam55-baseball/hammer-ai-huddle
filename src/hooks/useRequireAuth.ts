import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { canEvictNow } from "@/lib/auth/canEvict";

/**
 * Auth-stable guard for protected pages.
 *
 * Eviction is the LAST resort. The guard requires:
 *
 *  1. Auth context settled (`!loading && isAuthStable`).
 *  2. `canEvictNow()` returns ok (tab visible, online, not typing, no persisted
 *     token, no recent token refresh).
 *  3. TWO consecutive failed `supabase.auth.getSession()` checks, 1.5s apart,
 *     after an initial 5s grace window. Token refreshes on slow mobile networks
 *     routinely take 2–4s — anything shorter false-positives evicts users.
 *  4. One last attempted `refreshSession()` before pulling the trigger.
 *
 * A missed redirect is recoverable. A false eviction mid-session is not.
 */
export function useRequireAuth(enabled = true) {
  const { user, session, loading, isAuthStable } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!enabled) return;
    if (loading || !isAuthStable) return;
    if (user || session) return;
    if (!canEvictNow().ok) return;

    let cancelled = false;
    const t = setTimeout(async () => {
      if (cancelled) return;
      if (!canEvictNow().ok) return;

      // First live recheck.
      const first = await supabase.auth.getSession();
      if (cancelled) return;
      if (first?.data?.session?.user) return;

      // Wait 1.5s and recheck again — covers mid-flight refreshes.
      await new Promise((r) => setTimeout(r, 1500));
      if (cancelled) return;
      if (!canEvictNow().ok) return;

      const second = await supabase.auth.getSession();
      if (cancelled) return;
      if (second?.data?.session?.user) return;

      // Last-chance refresh.
      try {
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (cancelled) return;
        if (refreshed?.session?.user) return;
      } catch {
        // fall through
      }

      if (!canEvictNow().ok) return;
      // eslint-disable-next-line no-console
      console.warn("[useRequireAuth] redirecting to /auth after verified no-session");
      navigate("/auth", {
        replace: true,
        state: { returnTo: location.pathname + location.search },
      });
    }, 5000);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [enabled, user, session, loading, isAuthStable, navigate, location.pathname, location.search]);
}
