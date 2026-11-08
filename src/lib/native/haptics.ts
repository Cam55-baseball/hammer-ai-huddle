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

/** Rest is over (foreground). Web fallback keeps the previous [200, 100, 200] buzz. */
export function hapticRestEnd(webPattern: number | number[] = [200, 100, 200]) {
  if (isNativeApp() && nativeFlagOn("native_rest_alerts_v1")) {
    void Haptics.notification({ type: NotificationType.Success }).catch(() => {});
    return;
  }
  vibrate(webPattern);
}

/** A set was saved. Light tap on the iPhone app only; the web had no buzz here and keeps none. */
export function hapticSetComplete() {
  if (isNativeApp() && nativeFlagOn("native_rest_alerts_v1")) {
    void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
  }
}
