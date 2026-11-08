/**
 * "Rest is up" alerts (owner Nov 8, native_rest_alerts_v1).
 * Scheduled when a rest starts, for the moment it ends, so it fires with the app in the
 * background or the screen locked. Pause, skip, stop or leaving the timer cancels it;
 * a change to the end time reschedules it. Marked foreground:false so it never shows as a
 * banner while the app is open (the timer buzzes instead). Web: does nothing.
 */
import { useEffect } from "react";
import { LocalNotifications } from "@capacitor/local-notifications";
import { isNativeApp, nativeFlagOn } from "./nativeFlags";

/** Stable 31-bit notification id for a timer key (iOS needs a number). */
export function restAlertId(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 1) || 1;
}

export function restAlertText(nextExercise?: string | null): { title: string; body: string } {
  const next = (nextExercise ?? "").trim();
  return next
    ? { title: `Rest is up: ${next}`, body: "Time for your next set." }
    : { title: "Rest is up", body: "Time for your next set." };
}

const scheduled = new Map<string, number>(); // key → endsAt

function enabled() {
  return isNativeApp() && nativeFlagOn("native_rest_alerts_v1");
}

export async function cancelRestAlert(key: string): Promise<void> {
  if (!scheduled.has(key)) return;
  scheduled.delete(key);
  if (!enabled()) return;
  try { await LocalNotifications.cancel({ notifications: [{ id: restAlertId(key) }] }); } catch { /* ignore */ }
}

/**
 * Schedule (or reschedule) the alert for `key`. Uses the notification permission the
 * person already gave; it never asks for permission in the middle of a workout.
 */
export async function scheduleRestAlert(key: string, endsAt: number, nextExercise?: string | null): Promise<boolean> {
  if (!enabled()) return false;
  if (!Number.isFinite(endsAt) || endsAt <= Date.now() + 1000) { await cancelRestAlert(key); return false; }
  if (scheduled.get(key) === endsAt) return true;
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") return false;
    const id = restAlertId(key);
    if (scheduled.has(key)) await LocalNotifications.cancel({ notifications: [{ id }] });
    const { title, body } = restAlertText(nextExercise);
    await LocalNotifications.schedule({
      notifications: [{ id, title, body, schedule: { at: new Date(endsAt), allowWhileIdle: true }, foreground: false }],
    });
    scheduled.set(key, endsAt);
    return true;
  } catch {
    return false;
  }
}

/**
 * Keep one alert in step with a running rest. `endsAt` null = not running (paused,
 * stopped, skipped, finished) → cancel. Unmount → cancel.
 */
export function useRestAlert(key: string, endsAt: number | null, nextExercise?: string | null) {
  useEffect(() => {
    if (endsAt == null) { void cancelRestAlert(key); return; }
    void scheduleRestAlert(key, endsAt, nextExercise);
  }, [key, endsAt, nextExercise]);
  useEffect(() => () => { void cancelRestAlert(key); }, [key]);
}

export function _scheduledForTests() { return scheduled; }
