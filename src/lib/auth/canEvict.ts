/**
 * Shared "is it safe to redirect to /auth right now?" gate.
 *
 * Returns false when ANY of the following hold — in which case callers must
 * defer the eviction decision (typically by waiting and re-checking):
 *
 *  - Document is hidden (tab in background → token-refresh races common).
 *  - Browser is offline.
 *  - User is actively typing/editing (protectedEditing active).
 *  - A persisted Supabase auth token still exists in localStorage
 *    (rehydration will catch up; never evict in that window).
 *  - A recent TOKEN_REFRESHED event was observed within the last 10s.
 */
import { isProtectedEditingActive } from "@/lib/auth/protectedEditing";

let lastTokenRefreshAt = 0;
export function noteTokenRefreshed() {
  lastTokenRefreshAt = Date.now();
}

export function hasPersistedSupabaseToken(): boolean {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith("sb-") && k.endsWith("-auth-token")) {
        const v = window.localStorage.getItem(k);
        if (v && v.length > 20) return true;
      }
    }
  } catch {
    // ignore
  }
  return false;
}

export interface EvictionGate {
  ok: boolean;
  reason?: string;
}

export function canEvictNow(): EvictionGate {
  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    return { ok: false, reason: "tab_hidden" };
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { ok: false, reason: "offline" };
  }
  if (isProtectedEditingActive()) {
    return { ok: false, reason: "protected_editing" };
  }
  if (hasPersistedSupabaseToken()) {
    return { ok: false, reason: "persisted_token_present" };
  }
  if (Date.now() - lastTokenRefreshAt < 10_000) {
    return { ok: false, reason: "recent_token_refresh" };
  }
  return { ok: true };
}
