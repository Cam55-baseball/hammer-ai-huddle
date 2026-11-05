/**
 * Owner Nov 5 round 2, Group 3 — POSITION-PLAYER CONDITIONING = GAME-DAY READINESS.
 * Locked by owner Nov 5. Pure; shared by the app and wk-generate-daily.
 *
 * A position player is prepared to run up to 20 base-length sprints in a day
 * outside the warm-up (a game: about 4 at-bats × 4 bases, plus pre-game base
 * runs). Counted in BASES, never yards: baseball base = 90 ft, softball = 60 ft.
 * The existing base-count rest rule stays (30 s between reps until 4 bases,
 * then 5 min). Pitchers keep their yard rules (yards.ts).
 */
import { baseDistanceFeet } from "./combinedBaseRunning.ts";
import { prescribedBases } from "../runRest.ts";

export interface PositionSprintStandards {
  /** Daily ceiling outside warm-up. */
  maxBasesPerDay: number;
  /** Base sprints added per session for each green week (owner: 1–2). */
  stepPerGreenWeek: number;
  /** Share of capacity on the day before a game. */
  dayBeforeGameShare: number;
  /** Share of capacity the day after a high-sprint day (no back-to-back high days). */
  afterHighDayShare: number;
  /** Share of capacity on lower-readiness days (body-tax). */
  lowReadinessShare: number;
  /** A day at or above this share of capacity counts as a high-sprint day. */
  highDayShare: number;
}

export const DEFAULT_POSITION_SPRINT_STANDARDS: PositionSprintStandards = {
  maxBasesPerDay: 20,
  stepPerGreenWeek: 1,
  dayBeforeGameShare: 0.5,
  afterHighDayShare: 0.5,
  lowReadinessShare: 0.5,
  highDayShare: 0.75,
};

/** "Where are you starting from?" — position players only. */
export const BASE_SPRINT_OPTIONS = ["None", "1–5", "6–10", "11–15", "16–20+"] as const;
/** Starting bases per session: the low end of each band (None starts at 2). */
const START_BASES: Record<string, number> = { "None": 2, "1–5": 1, "6–10": 6, "11–15": 11, "16–20+": 16 };

/** Legacy yard answer (before Nov 5) → bases, so earlier answers still plan. */
const LEGACY_YARDS: Record<string, number> = { "None": 0, "Under 200 yd": 100, "200–500 yd": 350, "500–1,000 yd": 700 };

export function startingBases(answer: string | null | undefined, legacyYardAnswer: string | null | undefined, sport: "baseball" | "softball", s = DEFAULT_POSITION_SPRINT_STANDARDS): number {
  const max = s.maxBasesPerDay;
  if (answer && answer in START_BASES) return Math.min(max, Math.max(2, START_BASES[answer]));
  if (legacyYardAnswer && legacyYardAnswer in LEGACY_YARDS) {
    const bases = Math.floor((LEGACY_YARDS[legacyYardAnswer] * 3) / baseDistanceFeet(sport));
    return Math.min(max, Math.max(2, bases));
  }
  return 2;
}

/** Capacity per session: start + step per green week, never above the daily ceiling. */
export function sprintCapacity(startBases: number, greenWeeks: number, s = DEFAULT_POSITION_SPRINT_STANDARDS): number {
  const g = Math.max(0, Math.floor(greenWeeks));
  return Math.min(s.maxBasesPerDay, Math.max(0, Math.round(startBases + s.stepPerGreenWeek * g)));
}

export type SprintDayKind = "game" | "post_game" | "pre_game" | "after_high" | "low_readiness" | "full";

export interface SprintDayFacts {
  gameToday: boolean;
  gameYesterday: boolean;
  gameTomorrow: boolean;
  /** Bases saved for yesterday (outside warm-up). */
  yesterdayBases: number;
  lowReadiness: boolean;
}

/** Today's base-sprint target, outside warm-up. Game days: the game's sprints are the work. */
export function sprintDay(capacity: number, f: SprintDayFacts, s = DEFAULT_POSITION_SPRINT_STANDARDS): { kind: SprintDayKind; bases: number; because: string } {
  const cap = Math.min(s.maxBasesPerDay, Math.max(0, capacity));
  const share = (x: number) => Math.max(0, Math.floor(cap * x));
  if (f.gameToday) return { kind: "game", bases: 0, because: "Game today: your game's base running is today's sprint work, so no extra conditioning." };
  if (f.gameYesterday) return { kind: "post_game", bases: 0, because: "Recovery day after your game: no extra base sprints today." };
  const highYesterday = f.yesterdayBases >= Math.max(1, Math.ceil(cap * s.highDayShare));
  const options: { kind: SprintDayKind; bases: number; because: string }[] = [
    { kind: "full", bases: cap, because: `Getting you ready to run ${s.maxBasesPerDay} bases in a game: ${cap} base-length sprints today.` },
  ];
  if (f.gameTomorrow) options.push({ kind: "pre_game", bases: share(s.dayBeforeGameShare), because: `Game tomorrow: a lighter day, ${share(s.dayBeforeGameShare)} base-length sprints.` });
  if (highYesterday) options.push({ kind: "after_high", bases: share(s.afterHighDayShare), because: `You ran a lot of bases yesterday, so today is lighter: ${share(s.afterHighDayShare)} base-length sprints.` });
  if (f.lowReadiness) options.push({ kind: "low_readiness", bases: share(s.lowReadinessShare), because: `Your body needs a lighter day: ${share(s.lowReadinessShare)} base-length sprints.` });
  return options.reduce((a, b) => (b.bases < a.bases ? b : a));
}

export interface SprintRow { slot: string; movement_slug: string; sets?: number | null; reps?: number | null; distance_feet?: number | null; base_route?: unknown }

const EASY = (slug: string) => slug.startsWith("easy_base_jog_");

/** Base-length sprints in one rep. Declared base routes count their bases; other sprints count distance ÷ base length. */
export function basesPerRep(r: SprintRow, sport: "baseball" | "softball"): number {
  if (EASY(r.movement_slug)) return 0;
  const declared = prescribedBases(r.movement_slug, r.distance_feet ?? null, r.base_route, sport);
  if (declared) return declared;
  const d = Number(r.distance_feet ?? 0);
  return d > 0 ? d / baseDistanceFeet(sport) : 0;
}

const countable = (r: SprintRow) => r.slot === "conditioning" || r.slot === "speed";

export function sessionBases(rows: readonly SprintRow[], sport: "baseball" | "softball"): number {
  return Math.round(rows.filter(countable).reduce((n, r) => n + basesPerRep(r, sport) * (r.reps ?? 1) * (r.sets ?? 1), 0) * 10) / 10;
}

/**
 * Trim whole sets (conditioning first, then speed) so sprints fit the target.
 * Every row keeps at least 1 set, so weekly running floors and chosen work stay; nothing is ever added.
 */
export function fitRowsToBases<R extends SprintRow>(rows: R[], target: number, sport: "baseball" | "softball"): R[] {
  const out = rows.map((r) => ({ ...r }));
  const order = [...out.keys()].filter((i) => countable(out[i]) && basesPerRep(out[i], sport) > 0)
    .sort((a, b) => (out[a].slot === out[b].slot ? 0 : out[a].slot === "conditioning" ? -1 : 1));
  let total = sessionBases(out, sport);
  for (const i of order) {
    const r = out[i];
    const perSet = basesPerRep(r, sport) * (r.reps ?? 1);
    while (total > target + 1e-9 && (r.sets ?? 1) > 1) { r.sets = (r.sets ?? 1) - 1; total -= perSet; }
  }
  return out;
}

export function positionSprintStandards(raw: unknown): PositionSprintStandards {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_POSITION_SPRINT_STANDARDS;
  const n = (k: keyof PositionSprintStandards, lo: number, hi: number) => {
    const v = Number(o[k]);
    return Number.isFinite(v) && v >= lo && v <= hi ? v : d[k];
  };
  return {
    maxBasesPerDay: n("maxBasesPerDay", 1, 40), stepPerGreenWeek: n("stepPerGreenWeek", 1, 2),
    dayBeforeGameShare: n("dayBeforeGameShare", 0, 1), afterHighDayShare: n("afterHighDayShare", 0, 1),
    lowReadinessShare: n("lowReadinessShare", 0, 1), highDayShare: n("highDayShare", 0.1, 1),
  };
}
