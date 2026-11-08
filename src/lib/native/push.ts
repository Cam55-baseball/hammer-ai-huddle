/**
 * iPhone push notifications (owner Nov 8, native_push_v1).
 * - The phone is registered with Apple only after the person has allowed notifications
 *   (the existing "Stay in the loop" prompt) and only while the switch is on for them.
 * - Every launch re-registers, so a refreshed device token replaces the old one.
 * - Sign out turns this phone's token off before the session ends.
 * - Tapping a push opens the screen named in its `link`.
 */
import { PushNotifications, type Token, type ActionPerformed } from "@capacitor/push-notifications";
import { App } from "@capacitor/app";
import { supabase } from "@/integrations/supabase/client";
import { isNativeIos, loadNativeFlags } from "./nativeFlags";

let currentToken: string | null = null;
let listenersInstalled = false;
let pendingLink: string | null = null;
let navigateTo: ((path: string) => void) | null = null;

/** Only in-app paths are followed from a push. */
export function safePushLink(link: unknown): string | null {
  return typeof link === "string" && /^\/[A-Za-z0-9/_\-?=&.%]*$/.test(link) && !link.startsWith("//") ? link : null;
}

export function linkFromAction(action: ActionPerformed): string | null {
  const data = (action?.notification?.data ?? {}) as Record<string, unknown>;
  return safePushLink(data.link);
}

async function appVersion(): Promise<string | null> {
  try { const i = await App.getInfo(); return `${i.version} (${i.build})`; } catch { return null; }
}

/** Saves (or refreshes) this phone's token for the signed-in person. */
export async function saveToken(token: string): Promise<boolean> {
  currentToken = token;
  const { error } = await supabase.rpc("register_push_token", { _token: token, _app_version: await appVersion() });
  if (error) console.warn("[push] token not saved", error.message);
  return !error;
}

export function installPushListeners(navigate: (path: string) => void) {
  navigateTo = navigate;
  if (pendingLink) { const l = pendingLink; pendingLink = null; navigate(l); }
  if (listenersInstalled || !isNativeIos()) return;
  listenersInstalled = true;
  void PushNotifications.addListener("registration", (t: Token) => { void saveToken(t.value); });
  void PushNotifications.addListener("registrationError", (e) => { console.warn("[push] registration failed", (e as any)?.error); });
  void PushNotifications.addListener("pushNotificationActionPerformed", (a: ActionPerformed) => {
    const link = linkFromAction(a);
    if (!link) return;
    if (navigateTo) navigateTo(link); else pendingLink = link;
  });
}

/**
 * Registers with Apple when allowed. Never asks for permission itself: the existing
 * prompt does that. Returns true when register() was called.
 */
export async function registerIfAllowed(userId: string | null): Promise<boolean> {
  if (!isNativeIos() || !userId) return false;
  const flags = await loadNativeFlags(userId);
  if (!flags.native_push_v1) return false;
  try {
    const perm = await PushNotifications.checkPermissions();
    if (perm.receive !== "granted") return false;
    await PushNotifications.register();
    return true;
  } catch (e) {
    console.warn("[push] register skipped", e);
    return false;
  }
}

/** Called by Sign out, before the session ends. Never blocks sign out. */
export async function disablePushTokenOnSignOut(): Promise<void> {
  if (!isNativeIos() || !currentToken) return;
  try {
    await Promise.race([
      supabase.rpc("disable_push_token", { _token: currentToken }),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch { /* sign out continues */ }
  currentToken = null;
}

export function _resetPushForTests() { currentToken = null; listenersInstalled = false; pendingLink = null; navigateTo = null; }
export function _currentTokenForTests() { return currentToken; }
