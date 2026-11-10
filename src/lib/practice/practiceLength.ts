/**
 * Owner Nov 10: practice length is asked for, never assumed into the record.
 * A blank stored length stays blank; the planner counts it as its documented 60-minute default
 * and every screen that shows such a practice labels that assumption.
 * Pure and hook-free. Practice length is not a measurement: it never goes to the ledger.
 */
import { IMPOSSIBLE_NUMBER_MESSAGE } from "@/lib/ledger/entryCheck";

export const PRACTICE_LENGTH_MIN = 10;
export const PRACTICE_LENGTH_MAX = 360;
export const PRACTICE_LENGTH_PICKS = [60, 90, 120] as const;
export const PRACTICE_LENGTH_DEFAULT = 60;
export const PRACTICE_LENGTH_QUESTION = "How long is practice?";
export const PRACTICE_LENGTH_REQUIRED_MESSAGE = "Add how long practice is (minutes).";
export const PRACTICE_LENGTH_IMPOSSIBLE_MESSAGE = IMPOSSIBLE_NUMBER_MESSAGE;
export const PRACTICE_LENGTH_ASSUMPTION_LINE = "Length not entered — counted as 60 minutes. Add the length.";

export type PracticeLengthProblem = "required" | "impossible" | null;

/** Typed minutes → whole number, or null when blank / not a number. */
export function parsePracticeLength(value: unknown): number | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Why a typed length can't be saved (null = fine). */
export function practiceLengthProblem(value: unknown): PracticeLengthProblem {
  const raw = value == null ? "" : String(value).trim();
  if (!raw) return "required";
  const n = parsePracticeLength(raw);
  if (n == null || !Number.isInteger(n) || n < PRACTICE_LENGTH_MIN || n > PRACTICE_LENGTH_MAX) return "impossible";
  return null;
}

export function practiceLengthMessage(p: PracticeLengthProblem): string | null {
  return p === "required" ? PRACTICE_LENGTH_REQUIRED_MESSAGE : p === "impossible" ? PRACTICE_LENGTH_IMPOSSIBLE_MESSAGE : null;
}

const CANCELLED = new Set(["canceled", "cancelled"]);

/** A shown practice whose length was never entered (cancelled ones don't count, so no label). */
export function practiceLengthMissing(row: { duration_minutes?: number | null; status?: string | null } | null | undefined): boolean {
  if (!row) return false;
  if (CANCELLED.has(String(row.status ?? "").toLowerCase())) return false;
  return row.duration_minutes == null;
}
