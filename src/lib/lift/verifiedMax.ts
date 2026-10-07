/**
 * Verified max — Round 8 Step 2c (owner rule, binding).
 * Never ask for or guess a max. A max exists only from the player's own logged work:
 *  - qualifying sets: player-entered weight, 1–10 reps, reps >= prescribed reps;
 *    estimate = weight × (1 + reps/30); needs >= 2 qualifying sets (across sets or sessions),
 *    and the confirmed value is the second-best estimate (both sets must support it);
 *  - or a tested max the player performed and logged (metrics.tested_max = true).
 * Until verified, screens show percentages only. HT's sets/reps/% never change.
 */
export interface LogRow {
  plan_date: string;
  load_used: number | null;
  reps_completed: number[] | null;
  metrics?: Record<string, unknown> | null;
}

export const UNLOCK_COPY = "Log your sets to unlock your numbers";

/** Only rows where the player typed the weight count. Legacy auto-logs stored the % there. */
export function isPlayerWeight(row: LogRow): boolean {
  const m = (row.metrics ?? {}) as Record<string, unknown>;
  return m.weight_source === "player" || typeof m.one_tap_outcome === "string" || m.tested_max === true;
}

export function estimateMax(weight: number, reps: number) {
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

export function verifiedMax(rows: ReadonlyArray<LogRow>): number | null {
  const estimates: number[] = [];
  let tested: number | null = null;
  for (const r of rows) {
    const w = Number(r.load_used);
    if (!isPlayerWeight(r) || !Number.isFinite(w) || w <= 0) continue;
    const m = (r.metrics ?? {}) as Record<string, unknown>;
    const reps = (r.reps_completed ?? []).filter((x) => Number.isFinite(x) && x > 0);
    if (m.tested_max === true && reps.length && reps[0] === 1) { tested = Math.max(tested ?? 0, w); continue; }
    const presc = Number(m.prescribed_reps);
    for (const n of reps) {
      if (n < 1 || n > 10) continue;
      if (Number.isFinite(presc) && presc > 0 && n < presc) continue; // not completed as prescribed
      estimates.push(estimateMax(w, n));
    }
  }
  estimates.sort((a, b) => b - a);
  const confirmed = estimates.length >= 2 ? estimates[1] : null;
  const best = Math.max(confirmed ?? 0, tested ?? 0);
  return best > 0 ? Math.round(best) : null;
}

/** Working weight from % of verified max, rounded down to 5 lb. Null when not verified. */
export function workingWeight(max: number | null, pct: number | null | undefined) {
  if (!max || pct == null || pct <= 0) return null;
  const p = pct <= 1.5 ? pct : pct / 100;
  return Math.floor((max * p) / 5) * 5;
}
