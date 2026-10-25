/**
 * Coach-prescription arm-load check. Pure adapter over the SAME judges the
 * plan's arm ledger and Ramp Law use (armLedger.ts, armLedgerEntry.ts,
 * rampLaw.ts). It never invents a dose, a budget or a rule: logged entries and
 * the coach's planned throws are added together and judged by the existing
 * daily/weekly budgets, pitch maximums and the throwing build ladder.
 */
import { armBudget, ledgerDay, throwUnits, type Sport, type ThrowAthlete, type ThrowEvent } from "../wic/phases/armLedger.ts";
import { dayEvents, throwRoleFrom, THROW_TYPES, type ArmEntry } from "../wic/phases/armLedgerEntry.ts";
import { activeRamps } from "../wic/phases/rampLaw.ts";

const shift = (date: string, n: number) => new Date(Date.parse(`${date}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

export interface CoachArmInput {
  sport: Sport;
  positions: readonly unknown[];
  age: number | null;
  growthMode: boolean;
  date: string;
  /** Raw arm_ledger_entries rows (any status; skipped and unknown types are ignored). */
  entries: readonly ArmEntry[];
  /** The coach workout's planned throws, exact counts only. */
  planned: readonly { count: number; kind: "pitch" | "practice"; intensityClass: string | null }[];
  gameDates: readonly string[];
}

export function checkCoachArmLoad(input: CoachArmInput): { allowed: boolean; reason: string | null } {
  if (!input.planned.length) return { allowed: true, reason: null };
  if (input.planned.some(p => !Number.isInteger(p.count) || p.count <= 0)) {
    return { allowed: false, reason: "Throwing items need an exact throw count before your arm limit can be checked." };
  }
  const role = throwRoleFrom(input.positions[0], input.positions[1]);
  const athlete: ThrowAthlete = { sport: input.sport, role, age: input.age };
  const entries = input.entries.filter(e => e.status !== "skipped" && THROW_TYPES[e.throw_type]);
  const planned: ThrowEvent[] = input.planned.map(p => ({
    kind: p.kind, count: p.count,
    intent: p.intensityClass === "high" ? "high" : "moderate",
    estimated: false,
  }));
  const todayEvents = [...dayEvents(input.date, null, entries, []), ...planned];
  const day = ledgerDay(athlete, todayEvents);
  if (day.overDaily || day.warnings.length) {
    return { allowed: false, reason: `This workout would pass today's arm limit (${day.warnings[0] ?? "over budget"}). Ask your coach for a lighter version.` };
  }
  const budget = armBudget(athlete);
  let usedWeek = throwUnits(todayEvents);
  for (let i = 1; i < 7; i++) usedWeek += throwUnits(dayEvents(shift(input.date, -i), null, entries, []));
  if (usedWeek > budget.weekly) {
    return { allowed: false, reason: "This workout would pass this week's arm limit. Ask your coach for a lighter version." };
  }
  // Ramp Law: after a no-throw gap, intent builds back step by step. While a
  // throwing ramp runs, hard throwing and pitches wait for a full-intent step.
  const throwDays = [...new Set(entries.map(e => e.entry_date))].sort();
  const before = throwDays.filter(d => d < input.date);
  // A gap is only real when a throw day exists BEFORE the current streak.
  // No earlier history means the gap is unknown — never fabricate a year-long
  // break for a new account; the budgets above still guard the day.
  let gap: { daysOff: number; returnedOn: string } | null = null;
  if (before.length) {
    const last = before[before.length - 1];
    let streakStart = last;
    while (before.includes(shift(streakStart, -1))) streakStart = shift(streakStart, -1);
    const prior = before.filter(d => d < streakStart);
    if (prior.length) {
      gap = {
        daysOff: Math.round((Date.parse(`${streakStart}T12:00:00Z`) - Date.parse(`${prior[prior.length - 1]}T12:00:00Z`)) / 86400000) - 1,
        returnedOn: streakStart,
      };
    }
  }
  const ramps = activeRamps({
    today: input.date,
    gap: { throwing: gap },
    profile: {
      age: input.age,
      isPitcher: role === "pitcher" || role === "two_way" || role === "pitcher_catcher",
      growthMode: input.growthMode, painLast90: {}, firstTime: {}, eliteClean: false,
    },
    gameDates: input.gameDates,
  });
  const throwingRamp = ramps.find(r => r.discipline === "throwing");
  if (throwingRamp) {
    const step = throwingRamp.steps[throwingRamp.dayIndex];
    const topIntent = step?.intentPct ?? 50;
    if (planned.some(e => e.intent === "high" || e.kind === "pitch") && topIntent < 100) {
      return { allowed: false, reason: `Your arm is still building back after time off (${throwingRamp.line}). Hard throwing and pitches wait until the build finishes — ask your coach for a lighter version.` };
    }
  }
  return { allowed: true, reason: null };
}
