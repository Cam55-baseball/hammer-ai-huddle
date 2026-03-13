/**
 * Shared Tex Vision scoring utility.
 * Ensures deterministic, clamped calculations across all drills.
 */

/** Clamp a number between min and max */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/** Calculate accuracy percentage (0-100), safe from division by zero */
export function calcAccuracy(correct: number, total: number): number {
  if (total <= 0) return 0;
  return clamp(Math.round((correct / total) * 100), 0, 100);
}

/** Calculate average reaction time from an array of ms values */
export function calcAvgReaction(times: number[]): number | undefined {
  if (times.length === 0) return undefined;
  return Math.round(times.reduce((a, b) => a + b, 0) / times.length);
}

/** 
 * Guard to ensure onComplete is only called once.
 * Returns a wrapped function that no-ops after first call.
 */
export function onceGuard<T extends (...args: any[]) => void>(fn: T): T {
  let called = false;
  return ((...args: any[]) => {
    if (called) return;
    called = true;
    fn(...args);
  }) as T;
}
