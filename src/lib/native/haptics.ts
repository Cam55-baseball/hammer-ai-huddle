/**
 * Haptics for rest timers and set completion (owner Nov 8, native_rest_alerts_v1).
 * iPhone app + switch on: the Haptics plugin (navigator.vibrate does nothing in the iOS web view).
 * Everywhere else: exactly the old behavior (navigator.vibrate when the browser has it).
 */
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { isNativeApp, nativeFlagOn } from "./nativeFlags";

function vibrate(pattern: number | number[]) {
  try { navigator.vibrate?.(pattern); } catch { /* unsupported */ }
}

/**
 * Rest is over (foreground). Web fallback keeps each timer's previous behavior:
 * pass the pattern it used to buzz, or null where it never buzzed.
 */
export function hapticRestEnd(webPattern: number | number[] | null = [200, 100, 200]) {
  if (isNativeApp() && nativeFlagOn("native_rest_alerts_v1")) {
    void Haptics.notification({ type: NotificationType.Success }).catch(() => {});
    return;
  }
  if (webPattern != null) vibrate(webPattern);
}

/** A set was saved. Light tap on the iPhone app only; the web had no buzz here and keeps none. */
export function hapticSetComplete() {
  if (isNativeApp() && nativeFlagOn("native_rest_alerts_v1")) {
    void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
  }
}
