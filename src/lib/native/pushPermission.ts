/**
 * Owner Nov 12 (build 13 fix 3): existing players can allow iPhone notifications.
 * iPhone app only, and only while native_push_v1 is on for the person. Granting registers the
 * phone and saves its token with the app build (push.ts → register_push_token).
 */
import { PushNotifications } from "@capacitor/push-notifications";
import { Preferences } from "@capacitor/preferences";
import { isNativeIos, loadNativeFlags } from "./nativeFlags";
import { registerIfAllowed } from "./push";

/** off = switch off / not the iPhone app; not_asked = iOS hasn't asked yet; declined = turned off in iPhone Settings. */
export type PhonePushState = "off" | "not_asked" | "on" | "declined";

export function stateFromPermission(receive: string | undefined | null): Exclude<PhonePushState, "off"> {
  if (receive === "granted") return "on";
  if (receive === "denied") return "declined";
  return "not_asked"; // "prompt" / "prompt-with-rationale"
}

export async function phonePushState(userId: string | null): Promise<PhonePushState> {
  if (!isNativeIos() || !userId) return "off";
  const flags = await loadNativeFlags(userId);
  if (!flags.native_push_v1) return "off";
  try { return stateFromPermission((await PushNotifications.checkPermissions()).receive); } catch { return "off"; }
}

/** Asks iOS (the only system prompt iOS ever shows), then registers and saves the token when allowed. */
export async function turnOnPhonePush(userId: string): Promise<PhonePushState> {
  const now = await phonePushState(userId);
  if (now === "off" || now === "declined") return now;
  if (now === "not_asked") {
    try { await PushNotifications.requestPermissions(); } catch { /* answer read below */ }
  }
  const after = await phonePushState(userId);
  if (after === "on") await registerIfAllowed(userId);
  return after;
}

/** Opens this app's page in iPhone Settings (the web view hands "app-settings:" to iOS). */
export function openIphoneSettings(): void {
  try { window.location.href = "app-settings:"; } catch { /* nothing else to do */ }
}

// ---- One ask for existing players -----------------------------------------------------------
const ASK_KEY = (uid: string) => `hm.pushAskExisting.${uid}`;
const ONBOARDING_KEY = (uid: string) => `hm.notifPrimerAsked.${uid}`;

/** Pure: show the prompt only once, only when iOS hasn't asked, and never on sign-in/onboarding screens. */
export function shouldOfferExistingPrompt(input: { state: PhonePushState; askedBefore: boolean; path: string }): boolean {
  if (input.state !== "not_asked" || input.askedBefore) return false;
  return !/^\/(auth|signup|get-started|profile-setup|onboarding)(\/|$)/.test(input.path) && input.path !== "/";
}

export async function askedBefore(uid: string): Promise<boolean> {
  try { if (localStorage.getItem(ASK_KEY(uid)) != null || localStorage.getItem(ONBOARDING_KEY(uid)) != null) return true; } catch { /* fall through */ }
  try { return (await Preferences.get({ key: ASK_KEY(uid) })).value != null; } catch { return false; }
}

/** Remembered in both stores, because iOS may clear web view storage. */
export async function rememberAsked(uid: string, answer: string): Promise<void> {
  const v = `${answer}:${new Date().toISOString()}`;
  try { localStorage.setItem(ASK_KEY(uid), v); } catch { /* ignore */ }
  try { await Preferences.set({ key: ASK_KEY(uid), value: v }); } catch { /* ignore */ }
}
