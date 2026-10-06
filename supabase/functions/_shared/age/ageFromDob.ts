/**
 * The ONE source of a player's age: `profiles.date_of_birth` (owner ruling
 * 2026-10-06). Whole years on `onDate` (UTC calendar dates). Missing or
 * invalid → null. Callers that need a number for safety use AGE_UNKNOWN_FLOOR
 * (13, the app minimum), never a guess upward.
 */
export const AGE_UNKNOWN_FLOOR = 13;

export function ageFromDob(dob: string | null | undefined, onDate: string = new Date().toISOString().slice(0, 10)): number | null {
  if (!dob || !/^\d{4}-\d{2}-\d{2}/.test(String(dob))) return null;
  const [by, bm, bd] = String(dob).slice(0, 10).split("-").map(Number);
  const [ty, tm, td] = onDate.slice(0, 10).split("-").map(Number);
  if (![by, bm, bd, ty, tm, td].every(Number.isFinite)) return null;
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age -= 1;
  return age >= 0 && age <= 120 ? age : null;
}
