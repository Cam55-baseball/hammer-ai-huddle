// Windmill outing innings. Pure.
// Entered game innings always win when they are larger than the pitch-count estimate;
// the estimate (ceil(pitches/15)) stays as the safety floor when innings were not entered
// or were entered lower. Never lowers the innings the arm rules see.

export interface WindmillGameInningsRow { game_date: string; pitcher_innings: number | null; status?: string | null; deleted_at?: string | null; ignored_for_training?: boolean | null }

export function enteredInningsByDate(rows: WindmillGameInningsRow[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of rows) {
    if (r.deleted_at || r.ignored_for_training === true) continue;
    if (r.status && !/^(final|completed)$/i.test(String(r.status))) continue;
    const n = Number(r.pitcher_innings);
    if (!Number.isFinite(n) || n <= 0) continue;
    out.set(r.game_date, (out.get(r.game_date) ?? 0) + n);
  }
  return out;
}

export function windmillHistory(pitchesByDay: Map<string, number>, entered: Map<string, number>, before: string) {
  const dates = new Set([...pitchesByDay.keys(), ...entered.keys()]);
  return [...dates].filter((d) => d < before).sort().map((date) => {
    const pitches = pitchesByDay.get(date) ?? 0;
    const estimate = Math.ceil(pitches / 15);
    const actual = entered.get(date) ?? 0;
    return { date, pitches, innings: Math.max(estimate, actual), inningsSource: actual > estimate ? "entered" as const : "estimate" as const };
  });
}
