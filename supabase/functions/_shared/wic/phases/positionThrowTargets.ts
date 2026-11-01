/**
 * Owner Nov 1 — position-player throw targets (owner-confirmed). Pure.
 *
 * Every throw counts (warm-ups, practice, catch play, long toss, games). Targets are
 * full-go RAW throw counts over a 6-day week. Players build ~10%/week (never more
 * than ~30% week to week) and hold steady in-season. Pitchers keep their existing
 * arm rules and role cycle (no target here).
 *
 * The arm-safety caps in armLedger.ts always win: the target is cut to fit and the
 * conflict is reported, never overridden. Arm units stay internal (never shown).
 */
import { armBudget, ARM_DEFAULTS, type Sport } from "./armLedger.ts";
import { THROW_WEIGHTS } from "./throwCount.ts";
import { GREENLIGHT_STEP, type GreenlightResult } from "../progression/greenlight.ts";

export type ThrowGroup = "middle_infield" | "first_base" | "outfield" | "catcher";

export interface ThrowTarget {
  group: ThrowGroup; label: string;
  day: [number, number]; heavyDayMax: number | null; week: [number, number];
  /** Catcher return throws to the pitcher are LIGHT (catch-play weight). */
  lightReturnShare: number;
}

export const THROW_TARGETS: Record<ThrowGroup, ThrowTarget> = {
  middle_infield: { group: "middle_infield", label: "SS / 2B / 3B", day: [60, 100], heavyDayMax: 150, week: [400, 600], lightReturnShare: 0 },
  first_base: { group: "first_base", label: "First base", day: [40, 70], heavyDayMax: null, week: [250, 400], lightReturnShare: 0 },
  outfield: { group: "outfield", label: "Outfield", day: [50, 80], heavyDayMax: null, week: [300, 480], lightReturnShare: 0 },
  catcher: { group: "catcher", label: "Catcher", day: [120, 200], heavyDayMax: null, week: [700, 1000], lightReturnShare: 0.8 },
};

export const WEEKLY_BUILD = 0.10;
export const MAX_WEEKLY_JUMP = 0.30;
export const TRAINING_DAYS = 6;
/** Owner Nov 1 round 2: players under 19 build 3x more slowly and never see the target. */
export const YOUTH_TARGET_MAX_AGE = 18;
export const YOUTH_SLOWDOWN = 3;
export function isYouthThrower(age: number | null): boolean { return age !== null && age <= YOUTH_TARGET_MAX_AGE; }

/** Position token → group. Pitchers and unknown positions get no target (null). */
export function throwGroup(position: unknown): ThrowGroup | null {
  const p = String(position ?? "").trim().toLowerCase().replace(/[\s_-]/g, "");
  if (!p) return null;
  if (["c", "catcher"].includes(p)) return "catcher";
  if (["1b", "firstbase", "first"].includes(p)) return "first_base";
  if (["ss", "shortstop", "2b", "secondbase", "3b", "thirdbase", "if", "infield", "infielder", "mi", "middleinfield"].includes(p)) return "middle_infield";
  if (["of", "outfield", "outfielder", "lf", "cf", "rf", "leftfield", "centerfield", "rightfield"].includes(p)) return "outfield";
  return null;
}

/** Internal arm units for a day of `raw` throws: 30 warm-ups at catch-play weight, catcher
 *  returns at catch-play weight, the rest at the existing low/moderate off-mound weight. */
export function unitsForRawDay(group: ThrowGroup, raw: number): number {
  const warm = Math.min(raw, 30);
  const rest = raw - warm;
  const light = rest * THROW_TARGETS[group].lightReturnShare;
  return warm * THROW_WEIGHTS.warmup_catch + light * THROW_WEIGHTS.warmup_catch + (rest - light) * ARM_DEFAULTS.intentWeight.moderate;
}

/** Largest raw daily count whose units fit the given unit cap. */
export function rawThatFits(group: ThrowGroup, unitCap: number): number {
  let n = 0;
  while (n < 1000 && unitsForRawDay(group, n + 1) <= unitCap) n++;
  return n;
}

export interface WeekTargetInput {
  group: ThrowGroup; sport: Sport; age: number | null;
  /** Raw throws logged in the previous 7 days; null when nothing is logged. */
  lastWeekRaw: number | null;
  inSeason: boolean;
  /** Owner Nov 1 round 4: greenlight result for throwing. Missing = hold (never rush). */
  greenlight?: GreenlightResult | null;
}
export interface WeekTarget {
  weekly: number; daily: number; holding: boolean;
  /** Plain-words conflicts with an arm-safety cap (cap wins). */
  conflicts: string[];
  /** No history: the owner has not set a starting point. */
  needsStart: boolean;
  /** Under 19: the target is used for the plan but never shown. */
  hidden: boolean;
  /** Owner Nov 1 round 4: plain greenlight "Because" line (off-season). */
  because?: string | null;
}

export function weeklyThrowTarget(i: WeekTargetInput): WeekTarget {
  const t = THROW_TARGETS[i.group];
  const conflicts: string[] = [];
  if (i.lastWeekRaw === null || i.lastWeekRaw <= 0) return { weekly: 0, daily: 0, holding: false, conflicts, needsStart: true, hidden: isYouthThrower(i.age) };
  const last = i.lastWeekRaw;
  let weekly: number;
  if (i.inSeason) weekly = Math.min(last, t.week[1]);
  else {
    // Owner Nov 1 round 4: step only on the greenlight rule (green → +5%, red → back, else hold),
    // never past the existing weekly jump cap or the full-go top.
    const slow = isYouthThrower(i.age) ? YOUTH_SLOWDOWN : 1;
    const pct = (GREENLIGHT_STEP.throwing as { pct: number }).pct;
    const change = i.greenlight?.change ?? 0;
    const stepped = change === 1 ? last * (1 + pct) : change === -1 ? last / (1 + pct) : last;
    weekly = Math.min(t.week[1], Math.round(stepped), Math.floor(last * (1 + MAX_WEEKLY_JUMP / slow)));
  }
  let daily = Math.min(t.day[1], Math.round(weekly / TRAINING_DAYS));
  const budget = armBudget({ sport: i.sport, role: i.group === "catcher" ? "catcher" : "position", age: i.age });
  const dailyFit = rawThatFits(i.group, budget.daily);
  if (daily > dailyFit) {
    conflicts.push(`Daily target ${daily} is above the arm-safety daily cap (${dailyFit} throws at this age). The cap wins.`);
    daily = dailyFit;
  }
  const weeklyFit = rawThatFits(i.group, budget.weekly / TRAINING_DAYS) * TRAINING_DAYS;
  if (weekly > weeklyFit) {
    conflicts.push(`Weekly target ${weekly} is above the arm-safety weekly cap (about ${weeklyFit} throws at this age). The cap wins.`);
    weekly = weeklyFit;
    daily = Math.min(daily, Math.floor(weeklyFit / TRAINING_DAYS));
  }
  return { weekly, daily, holding: i.inSeason, conflicts, needsStart: false, hidden: isYouthThrower(i.age), because: i.inSeason ? null : (i.greenlight?.because ?? "Because: no finished throwing week to judge yet, so your throwing stays where it is.") };
}

/** Full-go target conflicts with the caps for one position and age (for the owner report). */
export function fullGoConflicts(group: ThrowGroup, sport: Sport, age: number | null): string[] {
  const t = THROW_TARGETS[group];
  const b = armBudget({ sport, role: group === "catcher" ? "catcher" : "position", age });
  const out: string[] = [];
  const dayFit = rawThatFits(group, b.daily);
  if (t.day[1] > dayFit) out.push(`${t.label}: normal day up to ${t.day[1]} but the daily cap allows ${dayFit}`);
  if (t.heavyDayMax && t.heavyDayMax > dayFit) out.push(`${t.label}: heavy day up to ${t.heavyDayMax} but the daily cap allows ${dayFit}`);
  const weekFit = rawThatFits(group, b.weekly / TRAINING_DAYS) * TRAINING_DAYS;
  if (t.week[1] > weekFit) out.push(`${t.label}: week up to ${t.week[1]} but the weekly cap allows about ${weekFit}`);
  return out;
}

/** Player wording (no arm units). */
export function throwTargetLine(group: ThrowGroup, w: WeekTarget): string {
  const t = THROW_TARGETS[group];
  if (w.hidden) return "";
  if (w.needsStart) return `${t.label} goal at full go: about ${t.week[0]}–${t.week[1]} throws a week. Log your throws so we can build you toward it.`;
  return w.holding
    ? `In-season: hold steady at about ${w.weekly} throws this week (${w.daily} a day), counting every throw.`
    : `Building toward ${t.week[0]}–${t.week[1]} throws a week: about ${w.weekly} this week (${w.daily} a day), counting every throw.${w.because ? ` ${w.because}` : ""}`;
}
