/**
 * Native (Capacitor iOS/Android) session mirror.
 *
 * iOS may clear WKWebView localStorage. The auth client (auto-generated, not
 * editable) keeps its session in localStorage, so inside the native app we
 * mirror that one key into @capacitor/preferences (native storage):
 *   - before the auth client starts, restore the newest copy into localStorage;
 *   - after every auth change (and when the app goes to background), copy it back.
 * An existing localStorage session is copied over on first launch, so nobody is
 * signed out by the upgrade. On the web this module does nothing.
 */
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;
export const AUTH_STORAGE_KEY = PROJECT_ID ? `sb-${PROJECT_ID}-auth-token` : "";

export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function expiresAt(raw: string | null): number {
  if (!raw) return -1;
  try {
    const v = JSON.parse(raw);
    return Number(v?.expires_at ?? v?.currentSession?.expires_at ?? 0) || 0;
  } catch {
    return -1;
  }
}

/** Pick the copy to keep: the one that expires later (i.e. the newer token). */
export function pickNewest(local: string | null, native: string | null): string | null {
  if (!local) return native;
  if (!native) return local;
  return expiresAt(native) > expiresAt(local) ? native : local;
}

/** Run once before the auth client is created. Never throws. */
export async function restoreNativeSession(): Promise<void> {
  if (!isNativeApp() || !AUTH_STORAGE_KEY) return;
  try {
    const local = localStorage.getItem(AUTH_STORAGE_KEY);
    const { value: native } = await Preferences.get({ key: AUTH_STORAGE_KEY });
    const keep = pickNewest(local, native);
    if (keep && keep !== local) localStorage.setItem(AUTH_STORAGE_KEY, keep);
    if (keep && keep !== native) await Preferences.set({ key: AUTH_STORAGE_KEY, value: keep });
  } catch {
    /* storage unavailable — fall back to whatever localStorage has */
  }
}

/** Copy the current localStorage session into native storage. */
export async function syncNativeSession(explicitSignOut = false): Promise<void> {
  if (!isNativeApp() || !AUTH_STORAGE_KEY) return;
  try {
    const local = localStorage.getItem(AUTH_STORAGE_KEY);
    if (local) await Preferences.set({ key: AUTH_STORAGE_KEY, value: local });
    else if (explicitSignOut) await Preferences.remove({ key: AUTH_STORAGE_KEY });
  } catch {
    /* ignore */
  }
}
