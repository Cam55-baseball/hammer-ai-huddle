/** Dates tried for "Add to today's work": today first, then the next six days. */
export function candidatePlanDates(today: Date, days = 7): string[] {
  const out: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() + i));
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export type AddAttempt = { saved?: boolean; warnings?: unknown[]; error?: string };

/**
 * Tries each date in order through the server's same-category safety save.
 * Stops at the first saved date or the first date that needs a warning answer.
 * Dates the server refuses (no matching session that day) move on to the next.
 */
export async function addToNextAppropriateSession(
  dates: string[],
  attempt: (date: string) => Promise<AddAttempt>,
): Promise<{ date: string | null; result: AddAttempt }> {
  let last: AddAttempt = { error: "No upcoming session of this kind. Nothing was saved." };
  for (const date of dates) {
    const r = await attempt(date);
    if (r.saved === true || (r.warnings && r.warnings.length)) return { date, result: r };
    last = r;
  }
  return { date: null, result: last };
}
