/**
 * hie-analyze subjective readiness (owner Nov 12: "Optimize, we don't want to fake or assume
 * anything for a user").
 *
 * PROPOSED formula (owner-requested change; no published source):
 *   sleep part = sleep_quality / 5 × 40           (unchanged)
 *   pain part  = 30 − min(pain_scale × 5, 30)     (unchanged)
 *   stress     = not read, not defaulted, not counted (owner Nov 9: stress never drives readiness)
 *   score      = (sleep + pain) / 70 × 100        when that day answered pain
 *              = sleep / 40 × 100                 when no check-in that day answered pain
 * so the best possible answers still give 100.
 *
 * Only real check-in fields; the latest check-in day is combined with the shared rule
 * (`_shared/checkIns/mergeCheckInDay.ts`). Only check-ins saved in the last 3 days count (the
 * same window compute-hammer-state uses). Nothing is ever assumed: no recent check-in or no
 * sleep-quality answer → score unknown (null); no pain answer → sleep only, said plainly.
 */
import { mergeLatestCheckInDay, type CheckInRow } from "../_shared/checkIns/mergeCheckInDay.ts";

export const VAULT_READINESS_SELECT = "entry_date, quiz_type, created_at, sleep_quality, pain_scale, pain_location";
export const READINESS_WINDOW_DAYS = 3;

export const NO_CHECKIN_RECOMMENDATION = "No check-in in the last 3 days, so readiness is unknown.";
export const NO_SLEEP_RECOMMENDATION =
  "Your latest check-in has no sleep-quality answer, so readiness is unknown. Answer the morning sleep question to calibrate it.";
export const SLEEP_ONLY_NOTE = "Based on sleep only — no pain check-in today.";

export type ReadinessBasis = "sleep_and_pain" | "sleep_only" | null;

function real(v: unknown): number | null {
  if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Check-ins saved within the last 3 days (rows without a save time can't be shown recent). */
export function recentCheckIns<T extends CheckInRow>(rows: readonly T[], now: Date): T[] {
  const from = now.getTime() - READINESS_WINDOW_DAYS * 86400000;
  return rows.filter((r) => {
    const t = typeof r.created_at === "string" ? Date.parse(r.created_at) : NaN;
    return Number.isFinite(t) && t >= from;
  });
}

export function computeReadiness(
  vaultData: readonly CheckInRow[] | null | undefined,
  now: Date = new Date(),
): { score: number | null; recommendation: string; basis: ReadinessBasis } {
  const day = mergeLatestCheckInDay(recentCheckIns(vaultData ?? [], now));
  if (!day) return { score: null, recommendation: NO_CHECKIN_RECOMMENDATION, basis: null };
  const sleep = real(day.sleep_quality);
  if (sleep === null) return { score: null, recommendation: NO_SLEEP_RECOMMENDATION, basis: null };
  const pain = real(day.pain_scale);
  const sleepPart = (sleep / 5) * 40;
  const raw = pain === null ? (sleepPart / 40) * 100 : ((sleepPart + (30 - Math.min(pain * 5, 30))) / 70) * 100;
  const score = Math.round(Math.max(0, Math.min(100, raw)));
  let recommendation: string;
  if (score >= 80) recommendation = `You are ${score}% ready → Train full intent`;
  else if (score >= 60) recommendation = `You are ${score}% ready → Standard training volume`;
  else if (score >= 40) recommendation = `You are ${score}% ready → Reduce volume, focus on timing and mechanics`;
  else recommendation = `You are ${score}% ready → Active recovery only`;
  if (pain === null) recommendation = `${recommendation}. ${SLEEP_ONLY_NOTE}`;
  return { score, recommendation, basis: pain === null ? "sleep_only" : "sleep_and_pain" };
}

/** Week-plan intensity: an unknown score causes no readiness adjustment (same as a ready day). */
export function weekPlanIntensity(readinessScore: number | null, dayIndex: number): "high" | "medium" {
  const lowered = readinessScore !== null && readinessScore < 70;
  return lowered ? "medium" : dayIndex < 3 ? "high" : "medium";
}

/** The readiness line for the week-plan prompt (no number when unknown). */
export function weekPlanReadinessLine(readinessScore: number | null, recommendation: string): string {
  return readinessScore === null
    ? `- Readiness: unknown (${recommendation}) — do not change intensity for readiness`
    : `- Readiness: ${readinessScore}/100 (${recommendation})`;
}
