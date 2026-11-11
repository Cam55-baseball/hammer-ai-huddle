/**
 * hie-analyze subjective readiness (owner Nov 10).
 *
 * Reads only real check-in fields (sleep_quality, stress_level, pain_scale, pain_location) and
 * combines the latest check-in day with the shared rule: latest real answer per question,
 * pain from any row that day (higher number wins). A question nobody answered is unknown:
 * no sleep-quality answer means the score is unknown (null), never a default 3; pain nobody
 * reported adds no pain penalty. The formula itself is unchanged.
 */
import { mergeLatestCheckInDay, type CheckInRow } from "../_shared/checkIns/mergeCheckInDay.ts";

export const VAULT_READINESS_SELECT =
  "entry_date, quiz_type, created_at, sleep_quality, stress_level, pain_scale, pain_location";

export const NO_CHECKIN_RECOMMENDATION = "Log a focus quiz (sleep / stress / pain) to calibrate readiness.";
export const NO_SLEEP_RECOMMENDATION =
  "Your latest check-in has no sleep-quality answer, so readiness is unknown. Answer the morning sleep question to calibrate it.";

function real(v: unknown): number | null {
  if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function computeReadiness(vaultData: readonly CheckInRow[] | null | undefined): { score: number | null; recommendation: string } {
  // No silent fallback: no check-in → no subjective readiness signal at all.
  const day = mergeLatestCheckInDay(vaultData ?? []);
  if (!day) return { score: null, recommendation: NO_CHECKIN_RECOMMENDATION };
  const sleep = real(day.sleep_quality);
  if (sleep === null) return { score: null, recommendation: NO_SLEEP_RECOMMENDATION };
  // Stress handling is unchanged (owner reviewing it separately).
  const stress = real(day.stress_level) ?? 3;
  const pain = real(day.pain_scale) ?? 0;
  const sleepScore = (sleep / 5) * 40;
  const stressScore = ((5 - stress) / 5) * 30;
  const painPenalty = Math.min(pain * 5, 30);
  const score = Math.round(Math.max(0, Math.min(100, sleepScore + stressScore + 30 - painPenalty)));
  let recommendation: string;
  if (score >= 80) recommendation = `You are ${score}% ready → Train full intent`;
  else if (score >= 60) recommendation = `You are ${score}% ready → Standard training volume`;
  else if (score >= 40) recommendation = `You are ${score}% ready → Reduce volume, focus on timing and mechanics`;
  else recommendation = `You are ${score}% ready → Active recovery only`;
  return { score, recommendation };
}
