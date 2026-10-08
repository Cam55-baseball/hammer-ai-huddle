/**
 * Native (iOS) third-party sign-in that never leaves the app.
 *
 * Apple Guideline 4: sign-in must not open the external Safari app. Inside the
 * Capacitor shell a top-level navigation to appleid.apple.com is handed to
 * Safari, so on native we instead:
 *   1. ask the auth client for the provider URL without navigating;
 *   2. open it in an in-app browser sheet (SFSafariViewController via
 *      @capacitor/browser);
 *   3. receive the return on the app's own URL scheme, finish the session in
 *      the app's web view, close the sheet and continue at /auth/callback.
 * On the web nothing here runs.
 */
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { supabase } from "@/integrations/supabase/client";
import { isNativeApp } from "./nativeSessionStore";

/** Must match the URL scheme the owner registers in Xcode (Info.plist). */
export const NATIVE_AUTH_SCHEME = "com.hammersmodality.app";
export const NATIVE_AUTH_CALLBACK = `${NATIVE_AUTH_SCHEME}://auth/callback`;

/** Pull tokens or a code out of the return URL (query or hash). */
export function parseNativeReturn(url: string): {
  code: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  error: string | null;
  redirect: string | null;
} {
  const qIndex = url.indexOf("?");
  const hIndex = url.indexOf("#");
  const query = qIndex >= 0 ? url.slice(qIndex + 1, hIndex > qIndex ? hIndex : undefined) : "";
  const hash = hIndex >= 0 ? url.slice(hIndex + 1) : "";
  const q = new URLSearchParams(query);
  const h = new URLSearchParams(hash);
  const get = (k: string) => q.get(k) ?? h.get(k);
  return {
    code: get("code"),
    accessToken: get("access_token"),
    refreshToken: get("refresh_token"),
    error: get("error_description") ?? get("error"),
    redirect: get("redirect"),
  };
}

let listening = false;

/** Install once at boot; harmless on the web. */
export function installNativeOAuthListener(onDone: (path: string) => void): void {
  if (!isNativeApp() || listening) return;
  listening = true;
  CapApp.addListener("appUrlOpen", async ({ url }) => {
    if (!url?.startsWith(NATIVE_AUTH_SCHEME)) return;
    const r = parseNativeReturn(url);
    try { await Browser.close(); } catch { /* sheet already closed */ }
    const next = new URLSearchParams();
    if (r.redirect) next.set("redirect", r.redirect);
    try {
      if (r.error) throw new Error(r.error);
      if (r.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(r.code);
        if (error) throw error;
      } else if (r.accessToken && r.refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: r.accessToken, refresh_token: r.refreshToken });
        if (error) throw error;
      } else {
        throw new Error("missing_tokens");
      }
    } catch (e) {
      next.set("error", e instanceof Error ? e.message : "sign_in_failed");
    }
    onDone(`/auth/callback${next.toString() ? `?${next}` : ""}`);
  });
}

/** Start a provider sign-in inside an in-app browser sheet. */
export async function startNativeOAuth(
  provider: "apple" | "google",
  redirectTarget?: string | null,
  scopes?: string,
): Promise<{ error: unknown | null }> {
  const callback = new URL(NATIVE_AUTH_CALLBACK);
  if (redirectTarget) callback.searchParams.set("redirect", redirectTarget);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: callback.toString(), scopes, skipBrowserRedirect: true },
  });
  if (error || !data?.url) return { error: error ?? new Error("no_url") };
  await Browser.open({ url: data.url, presentationStyle: "popover" });
  return { error: null };
}
