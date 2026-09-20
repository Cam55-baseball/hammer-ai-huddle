// Tissue Cost Scheduler v1.2 §A — "load above your normal".
//
// Each tank is judged on load ABOVE the athlete's own steady state, so routine
// daily sport load never delays a lift; only spikes above routine do.
//
// baseline_k = c / (1 - r), r = 0.5 ^ (1 / half_life)
// c = typical daily NON-LIFT cost, taken in order:
//   1. the median non-lift daily cost over the last 28 days of logged days
//   2. if there is no history, the practices and games on the calendar
//   3. if there is nothing, 0
//
// Baseline cap: the steady state of 120 practice-minutes a day at moderate
// intensity. Above that the spike governor and the load-pattern signal take
// over, so extreme chronic load can never hide.
//
// Pure. No clock, no I/O.

import { type DaySchedule, TANKS, type TankLevels, type TcsConfig } from "./types.ts";
import { dayDiff, sportCost, zeroTanks } from "./tanks.ts";

/**
 * Steady state of a constant daily cost `c` under the tank's half-life.
 *
 * `days` limits the run-in: the level a routine of `c` per day would have
 * reached after `days` days, c · (1 − r^days) / (1 − r). With a long history
 * this converges to the spec's c / (1 − r). Limiting it matters at cold start:
 * an athlete with four logged days has not yet reached steady state, and
 * subtracting the infinite steady state would wipe out their real load.
 */
export function steadyState(c: number, halfLife: number, days = Infinity): number {
  const r = Math.pow(0.5, 1 / Math.max(0.1, halfLife));
  const denom = 1 - r;
  if (denom <= 0) return c;
  const full = c / denom;
  if (!Number.isFinite(days)) return full;
  return full * (1 - Math.pow(r, Math.max(0, days)));
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** The per-tank daily non-lift cost cap: 120 min/day moderate practice. */
export function baselineCapDailyCost(config: TcsConfig): TankLevels {
  const row = config.costs.practice_per60min_moderate;
  const factor = (config.baselineCapPracticeMinutes ?? 120) / 60;
  return {
    nerve: row.nerve * factor,
    muscle: row.muscle * factor,
    connective: row.connective * factor,
    arm: row.arm * factor,
  };
}

export interface BaselineResult {
  /** Steady-state level produced by the athlete's typical daily sport load. */
  baseline: TankLevels;
  /** Typical daily non-lift cost that produced it. */
  typicalDailyCost: TankLevels;
  /** Which source was used. */
  source: "history_median" | "calendar_plan" | "none";
  /** True where the cap bound the value. */
  capped: boolean;
}

/**
 * Compute the athlete's own normal.
 *
 * @param pastDays logged days strictly before `today`
 * @param calendar planned days on or after `today`
 */
export function computeBaseline(
  pastDays: DaySchedule[],
  calendar: DaySchedule[],
  today: string,
  config: TcsConfig,
): BaselineResult {
  const window = config.baselineWindowDays ?? config.historyWindowDays;

  const inWindow = pastDays.filter((d) => {
    const off = dayDiff(d.date, today);
    return off > 0 && off <= window;
  });

  let source: BaselineResult["source"] = "none";
  let rows: DaySchedule[] = [];

  if (inWindow.length > 0) {
    source = "history_median";
    rows = inWindow;
  } else {
    const planned = calendar.filter((d) => {
      const off = dayDiff(today, d.date);
      return off >= 0 && off <= window && ((d.practiceMinutes ?? 0) > 0 || !!d.games);
    });
    if (planned.length > 0) {
      source = "calendar_plan";
      rows = planned;
    }
  }

  const typical = zeroTanks();
  if (rows.length > 0) {
    const perTank: Record<string, number[]> = { nerve: [], muscle: [], connective: [], arm: [] };
    for (const d of rows) {
      // Non-lift cost only: a lift is the spike we are measuring against.
      const c = sportCost(d, config);
      for (const t of TANKS) perTank[t].push(c[t]);
    }
    for (const t of TANKS) typical[t] = median(perTank[t]);
  }

  const cap = baselineCapDailyCost(config);
  let capped = false;
  const baseline = zeroTanks();
  for (const t of TANKS) {
    const c = Math.min(typical[t], cap[t]);
    if (typical[t] > cap[t]) capped = true;
    typical[t] = c;
    baseline[t] = steadyState(c, config.halfLives[t]);
  }

  return { baseline, typicalDailyCost: typical, source, capped };
}

/** Judged level = max(0, level − baseline), per tank. */
export function judgedLevels(levels: TankLevels, baseline: TankLevels): TankLevels {
  const out = zeroTanks();
  for (const t of TANKS) out[t] = Math.max(0, levels[t] - baseline[t]);
  return out;
}
