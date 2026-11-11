/**
 * Owner Nov 10 (evening): ONE definition of what "counts as a practice" in the
 * scheduled_practice_sessions table, plus the one length window. Used by the planner
 * reader (tissueCost shadow adapter), coach-practice-check and every app screen
 * (re-exported by src/lib/practice/practiceLength.ts) so they can never disagree.
 *
 * Not practices (stored in the same table): Baserunning IQ sessions
 * (session_module "baserunning_iq") and Travel/Other notes (session_module "note",
 * practice_kind or session_type "travel"/"other"). They add no practice minutes,
 * never get the "Length not entered" label and are never asked for a length.
 * Pure: no imports, safe for Deno and the browser.
 */

export const PRACTICE_LENGTH_MIN = 10;
export const PRACTICE_LENGTH_MAX = 360;

export interface PracticeKindFields {
  session_module?: string | null;
  practice_kind?: string | null;
  session_type?: string | null;
}

const NOT_PRACTICE_MODULES = new Set(["baserunning_iq", "note"]);
const NOT_PRACTICE_KINDS = new Set(["travel", "other"]);

const low = (v: unknown) => String(v ?? "").trim().toLowerCase();

export function countsAsPractice(row: PracticeKindFields | null | undefined): boolean {
  if (!row) return false;
  if (NOT_PRACTICE_MODULES.has(low(row.session_module))) return false;
  if (NOT_PRACTICE_KINDS.has(low(row.practice_kind))) return false;
  if (NOT_PRACTICE_KINDS.has(low(row.session_type))) return false;
  return true;
}

export type SubmittedLength = { ok: true; minutes: number | null } | { ok: false };

/**
 * A length sent by a client. Missing/blank → saved blank (null), never a default, so
 * older app versions keep working. A whole number 10–360 is kept exactly as entered.
 * Anything else is refused — never clamped, rounded or replaced.
 */
export function readSubmittedPracticeLength(value: unknown): SubmittedLength {
  if (value === undefined || value === null) return { ok: true, minutes: null };
  if (typeof value === "string" && value.trim() === "") return { ok: true, minutes: null };
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value.trim()) : NaN;
  if (!Number.isInteger(n) || n < PRACTICE_LENGTH_MIN || n > PRACTICE_LENGTH_MAX) return { ok: false };
  return { ok: true, minutes: n };
}
