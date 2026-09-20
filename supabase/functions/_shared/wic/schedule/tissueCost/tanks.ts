// Tissue Cost Scheduler v1 — tank math.
// Pure. No clock, no I/O. Config is always passed in.

import {
  type CheckIn,
  type CostRow,
  type DaySchedule,
  type Profile,
  type Tank,
  TANKS,
  type TankLevels,
  type TcsConfig,
} from "./types.ts";

export function zeroTanks(): TankLevels {
  return { nerve: 0, muscle: 0, connective: 0, arm: 0 };
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return n;
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function addScaled(into: TankLevels, row: CostRow, factor: number): void {
  into.nerve += row.nerve * factor;
  into.muscle += row.muscle * factor;
  into.connective += row.connective * factor;
  into.arm += row.arm * factor;
}

/* ------------------------------------------------------------------ dates */

const DAY_MS = 86_400_000;

/** Parse YYYY-MM-DD as a UTC midnight instant. DST-safe because it never uses local time. */
export function parseDate(iso: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ""));
  if (!m) return NaN;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function isValidDate(iso: string): boolean {
  const t = parseDate(iso);
  if (!Number.isFinite(t)) return false;
  return toIso(t) === String(iso).slice(0, 10);
}

export function toIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return toIso(parseDate(iso) + days * DAY_MS);
}

/** Calendar days difference (b − a). */
export function dayDiff(a: string, b: string): number {
  return Math.round((parseDate(b) - parseDate(a)) / DAY_MS);
}

/** Full rest days strictly between two dates. Mon → Fri = 3. */
export function fullRestDaysBetween(a: string, b: string): number {
  return dayDiff(a, b) - 1;
}

/**
 * Athlete-local calendar date for an instant. Used by callers at the boundary;
 * `decide()` itself only ever receives an already-local ISO date.
 */
export function localDateOf(instantMs: number, timezone: string): string {
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return fmt.format(new Date(instantMs));
  } catch {
    return new Date(instantMs).toISOString().slice(0, 10);
  }
}

/* ------------------------------------------------------- per-day modifiers */

export interface DayModifiers {
  /** Per-tank half-life multiplier (>1 = slower drain). */
  halfLifeMul: TankLevels;
  /** Per-tank cost multiplier. */
  costMul: TankLevels;
  /** Regions/tanks where loaded work is blocked today. */
  blocksLoadedWork: boolean;
}

export function dayModifiers(
  profile: Profile,
  checkIn: CheckIn | null | undefined,
  config: TcsConfig,
): DayModifiers {
  const m = config.modifiers;
  const hl: TankLevels = { nerve: 1, muscle: 1, connective: 1, arm: 1 };
  const cost: TankLevels = { nerve: 1, muscle: 1, connective: 1, arm: 1 };
  let blocks = false;

  if (checkIn?.poorSleep || checkIn?.highSoreness) {
    hl.muscle *= m.poorSleepOrSorenessHalfLife;
    hl.connective *= m.poorSleepOrSorenessHalfLife;
  }
  if (profile.growthMode) hl.connective *= m.growthModeConnectiveHalfLife;

  const band = profile.trainingAgeBand ?? "intermediate";
  const bandMul = m.trainingAgeCost[band] ?? 1;
  for (const t of TANKS) cost[t] *= bandMul;

  for (const p of checkIn?.pain ?? []) {
    if (!p) continue;
    if (p.blocksLoadedWork) blocks = true;
    const tank = p.tank && TANKS.includes(p.tank) ? p.tank : null;
    if (tank) cost[tank] *= m.painCostMultiplier;
  }

  for (const t of TANKS) {
    hl[t] = clamp(hl[t], m.halfLifeMultiplierBounds.min, m.halfLifeMultiplierBounds.max);
    cost[t] = clamp(cost[t], m.costMultiplierBounds.min, m.costMultiplierBounds.max);
  }
  return { halfLifeMul: hl, costMul: cost, blocksLoadedWork: blocks };
}

/* ----------------------------------------------------------- cost builders */

/** Cost of everything on a day that is NOT the lift (skill work, games, practice, jumps, sprints, throws). */
export function sportCost(day: DaySchedule | null | undefined, config: TcsConfig): TankLevels {
  const out = zeroTanks();
  if (!day) return out;
  const c = config.costs;

  const g = day.games;
  if (g) {
    const role = g.role ?? "position";
    const count = Math.max(0, num(g.count, 1) || (g.doubleheader ? 2 : 1));
    const row =
      role === "catcher"
        ? c.game_catcher
        : role === "starting_pitcher"
        ? c.game_starting_pitcher
        : c.game_position;
    addScaled(out, row, count);
  }

  const minutes = Math.max(0, num(day.practiceMinutes, 0));
  if (minutes > 0) {
    const factor = config.practiceIntensityFactor[day.practiceIntensity ?? "moderate"] ?? 1;
    addScaled(out, c.practice_per60min_moderate, (minutes / 60) * factor);
  }

  const j = day.jumpContacts;
  if (j) {
    addScaled(out, c.jumps_tier1_per10, Math.max(0, num(j.tier1, 0)) / 10);
    addScaled(out, c.jumps_tier2_per10, Math.max(0, num(j.tier2, 0)) / 10);
    addScaled(out, c.jumps_tier3_per10, Math.max(0, num(j.tier3, 0)) / 10);
  }

  const yards = Math.max(0, num(day.maxSprintYards, 0));
  if (yards > 0) addScaled(out, c.sprint_per100yd, yards / 100);

  const throws = Math.max(0, num(day.maxIntentThrows, 0));
  if (throws > 0) addScaled(out, c.throws_per25_max_intent, throws / 25);

  return out;
}

/** Cost of a lift session. Skipped sessions cost nothing. */
export function liftCost(
  day: DaySchedule | null | undefined,
  config: TcsConfig,
  noveltyMul = true,
): TankLevels {
  const out = zeroTanks();
  const lift = day?.lift;
  if (!lift || lift.skipped) return out;
  const c = config.costs;
  const row =
    lift.class === "H"
      ? lift.method === "double_eccentric"
        ? c.lift_H_double_eccentric
        : c.lift_H_standard
      : lift.class === "M"
      ? c.lift_M
      : c.lift_L;

  const sets = num(lift.hardSets, config.referenceHardSets);
  const factor = clamp(
    (sets > 0 ? sets : config.referenceHardSets) / config.referenceHardSets,
    config.hardSetsBounds.min,
    config.hardSetsBounds.max,
  );
  addScaled(out, row, factor);
  if (noveltyMul && lift.novelty) out.muscle *= config.modifiers.noveltyMuscleCost;
  return out;
}

export function applyCostMul(cost: TankLevels, mul: TankLevels): TankLevels {
  return {
    nerve: cost.nerve * mul.nerve,
    muscle: cost.muscle * mul.muscle,
    connective: cost.connective * mul.connective,
    arm: cost.arm * mul.arm,
  };
}

/** One day of drain. */
export function decay(levels: TankLevels, config: TcsConfig, halfLifeMul: TankLevels): TankLevels {
  const out = zeroTanks();
  for (const t of TANKS as readonly Tank[]) {
    const hl = Math.max(0.1, config.halfLives[t] * halfLifeMul[t]);
    out[t] = levels[t] * Math.pow(0.5, 1 / hl);
  }
  return out;
}

export function addLevels(a: TankLevels, b: TankLevels): TankLevels {
  return {
    nerve: a.nerve + b.nerve,
    muscle: a.muscle + b.muscle,
    connective: a.connective + b.connective,
    arm: a.arm + b.arm,
  };
}

/**
 * Run the tanks from the start of the history window up to (but not including)
 * `today`'s lift, then add today's sport cost. Returns the level a lift would
 * see at today's session time (lift goes after skill work / after the game).
 */
export function runTanks(input: {
  days: DaySchedule[]; // ordered, oldest first, all strictly before `today`
  today: string;
  todayDay: DaySchedule | null;
  profile: Profile;
  checkInByDate: Map<string, CheckIn>;
  config: TcsConfig;
}): { levels: TankLevels; contributions: Array<{ date: string; cost: TankLevels; day: DaySchedule }> } {
  const { days, today, todayDay, profile, checkInByDate, config } = input;
  let levels = zeroTanks();
  const contributions: Array<{ date: string; cost: TankLevels; day: DaySchedule }> = [];

  let cursor: string | null = null;
  for (const day of days) {
    const mods = dayModifiers(profile, checkInByDate.get(day.date), config);
    if (cursor !== null) {
      const gap = Math.max(0, dayDiff(cursor, day.date));
      for (let i = 0; i < gap; i++) levels = decay(levels, config, mods.halfLifeMul);
    }
    cursor = day.date;
    const cost = applyCostMul(addLevels(sportCost(day, config), liftCost(day, config)), mods.costMul);
    levels = addLevels(levels, cost);
    contributions.push({ date: day.date, cost, day });
  }

  const todayMods = dayModifiers(profile, checkInByDate.get(today), config);
  if (cursor !== null) {
    const gap = Math.max(0, dayDiff(cursor, today));
    for (let i = 0; i < gap; i++) levels = decay(levels, config, todayMods.halfLifeMul);
  }
  const todaySport = applyCostMul(sportCost(todayDay, config), todayMods.costMul);
  levels = addLevels(levels, todaySport);
  if (todayDay) contributions.push({ date: today, cost: todaySport, day: todayDay });

  return { levels, contributions };
}
