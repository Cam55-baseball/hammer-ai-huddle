// SM-2-style spaced repetition scheduler for IQ situations.
// Returns updated mastery, EF factor, interval (days), and next-due timestamp.

import type { IqUserProgress } from "./types";

export interface SrUpdate {
  mastery_score: number;
  ef_factor: number;
  interval_days: number;
  next_due_at: string;
  streak: number;
}

/**
 * grade: 0-5 quality score (SM-2 standard).
 *   0 = total blackout, 3 = correct with effort, 5 = perfect.
 * A correct quiz answer maps to grade 4; with timing bonuses to 5.
 */
export function nextReview(
  prev: Pick<IqUserProgress, "ef_factor" | "interval_days" | "mastery_score" | "streak">,
  grade: number,
  now: Date = new Date(),
): SrUpdate {
  const q = Math.max(0, Math.min(5, grade));
  let ef = prev.ef_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ef < 1.3) ef = 1.3;

  let interval: number;
  let streak = prev.streak;

  if (q < 3) {
    interval = 1;
    streak = 0;
  } else {
    streak += 1;
    if (streak === 1) interval = 1;
    else if (streak === 2) interval = 3;
    else interval = Math.round(prev.interval_days * ef);
  }

  // Mastery score drifts toward 100 with successes, decays with failures.
  const delta = q >= 3 ? Math.max(2, Math.round((100 - prev.mastery_score) * 0.18)) : -10;
  const mastery = Math.max(0, Math.min(100, prev.mastery_score + delta));

  const due = new Date(now);
  due.setDate(due.getDate() + interval);

  return {
    mastery_score: mastery,
    ef_factor: Number(ef.toFixed(3)),
    interval_days: interval,
    next_due_at: due.toISOString(),
    streak,
  };
}

export function gradeFromAttempt(correct: boolean, timeMs?: number | null): number {
  if (!correct) return 1;
  if (!timeMs) return 4;
  if (timeMs < 5000) return 5;
  if (timeMs < 12000) return 4;
  return 3;
}
