// Server copy of src/lib/lift/verifiedMax.ts (verifiedMax only). Keep identical in rule.
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
    if (m.one_tap_outcome === "cut_short" || m.one_tap_outcome === "skipped") continue; // not completed as prescribed
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

