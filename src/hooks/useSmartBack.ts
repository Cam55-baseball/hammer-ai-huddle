/**
 * useSmartBack — the in-app back arrow should return to the screen the athlete
 * actually came from, not jump to the dashboard.
 *
 * On iOS (Capacitor WebView) there is no browser back button and no edge-swipe
 * back by default, so a hardcoded `navigate('/dashboard')` is a dead end: a user
 * who reached a module through a module-selection screen gets thrown two levels
 * up and has to start over.
 *
 * Behaviour:
 *  - If this app owns a previous history entry (react-router sets
 *    `location.key !== 'default'` once it has navigated at least once inside
 *    the app), go back one entry.
 *  - Otherwise — deep link, hard reload, app cold start — fall back to the
 *    given route so the user is never stranded.
 */
import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export function useSmartBack(fallback: string = "/dashboard") {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    const hasAppHistory = location.key !== undefined && location.key !== "default";
    if (hasAppHistory) {
      navigate(-1);
      return;
    }
    navigate(fallback, { replace: true });
  }, [navigate, location.key, fallback]);
}
