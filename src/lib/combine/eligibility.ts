/**
 * Combine eligibility — one attempt per athlete, per sport, per calendar month.
 *
 * Pure function. The same rule is enforced in the database by the
 * `combine_sessions_monthly_eligibility` trigger, which raises
 * `combine_already_taken_this_month` rather than failing silently. This
 * function exists so a caller can check (and explain) before attempting the
 * insert — it is not the only line of defence.
 *
 * FOUNDATION ONLY. Not wired to any live surface.
 */

import type { CombineSport } from "./events";

export type CombineIneligibleReason =
  | "already_taken_this_month"
  | "sport_mismatch_unresolved";

export interface CombineSessionLike {
  readonly user_id: string;
  readonly sport: string;
  /** ISO timestamp of when the session row was created. */
  readonly created_at: string;
}

export interface CombineEligibilityEligible {
  readonly eligible: true;
  /** UTC calendar month key the new attempt would occupy, e.g. "2026-08". */
  readonly month_key: string;
}

export interface CombineEligibilityBlocked {
  readonly eligible: false;
  readonly reason: CombineIneligibleReason;
  readonly month_key: string;
  /** When the blocking attempt was taken, when one exists. */
  readonly existing_session_created_at: string | null;
  /** First moment the athlete may attempt this sport again (ISO, UTC). */
  readonly next_eligible_at: string | null;
  readonly message: string;
}

export type CombineEligibility = CombineEligibilityEligible | CombineEligibilityBlocked;

/** UTC calendar-month key for a date. Month boundaries are UTC, not local. */
export function combineMonthKey(at: Date): string {
  const y = at.getUTCFullYear();
  const m = String(at.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function startOfNextMonthUtc(at: Date): string {
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 1, 0, 0, 0, 0)).toISOString();
}

/**
 * Decide whether an athlete may start a new combine session for a sport.
 *
 * `existingSessions` may be the athlete's full session history — this filters
 * by athlete, sport and month itself so a caller cannot accidentally widen the
 * rule by passing a pre-filtered list built on the wrong boundary.
 *
 * An unparseable `created_at` is treated as blocking, never as absent: an
 * unreadable prior attempt is missing information, not proof of eligibility.
 */
export function evaluateCombineEligibility(
  userId: string,
  sport: CombineSport,
  existingSessions: readonly CombineSessionLike[],
  now: Date = new Date(),
): CombineEligibility {
  const monthKey = combineMonthKey(now);

  const blocking = existingSessions.find((s) => {
    if (s.user_id !== userId) return false;
    if (s.sport !== sport) return false;
    const created = new Date(s.created_at);
    if (Number.isNaN(created.getTime())) return true; // unreadable → treat as blocking
    return combineMonthKey(created) === monthKey;
  });

  if (!blocking) {
    return { eligible: true, month_key: monthKey };
  }

  const createdValid = !Number.isNaN(new Date(blocking.created_at).getTime());

  return {
    eligible: false,
    reason: "already_taken_this_month",
    month_key: monthKey,
    existing_session_created_at: createdValid ? blocking.created_at : null,
    next_eligible_at: startOfNextMonthUtc(now),
    message: `A ${sport} combine has already been taken this calendar month (${monthKey}). One attempt per sport per month.`,
  };
}
