/**
 * E2E WP4 item 3 — youth throwing rules, live on the athlete's pitching card.
 * Pure. Combines the Step 26/27 modules into ONE verdict for today:
 * weekly / season / yearly pitch caps, the yearly innings cap, growth-adjusted
 * pitching age, the "pitched while fatigued" stop, and the pitcher-catcher line.
 * Budgets, flags and words only — never a dose. Baseball only (windmill limits
 * live in armLedger.ts; none of these numbers transfer to softball).
 */
import {
  PITCH_SMART_BANDS,
  bandIndex,
  checkCaps,
  fatigueFlag,
  growthAdjustment,
  PITCHER_CATCHER_LINE,
  PRO_PITCH_COUNT_STAFF_LINE,
  THIRD_DAY_LINE,
  TWO_GAMES_LINE,
  pitchSmartApplies,
  restDaysFor,
  thirdConsecutiveGameDay,
  type HeightCheck,
} from "../../../supabase/functions/_shared/wic/phases/youthThrowing";

export interface PitchDay {
  date: string; pitches: number; innings: number;
  /** Number of game outings logged or scheduled that day (bullpens are not games). */
  gameOutings?: number;
}

export interface YouthPitchingInput {
  sport: "baseball" | "softball";
  age: number | null;
  level: string | null;
  today: string;
  days: PitchDay[];
  heights: HeightCheck[];
  /** Start of the current season if on file; otherwise the last 120 days count as the season. */
  seasonStart: string | null;
  /** Today's check-in fatigue, 1–10. ≥ 8 counts as a tired arm. */
  checkInFatigue: number | null;
  pitcherCatcher: boolean;
}

export interface YouthPitchingVerdict {
  applies: boolean;
  /** True when MLB Pitch Smart numbers are shown (amateur, age 7–22). */
  pitchSmart: boolean;
  /** Rest days today's combined pitches require (Pitch Smart only). */
  restDaysNeeded: number | null;
  pitchesToday: number;
  /** Staff-only line for pros and anyone over 22. */
  staffProLine: string | null;
  dailyMax: number | null;
  bandLabel: string | null;
  stopToday: boolean;
  lines: string[];
  warnings: string[];
  growthLine: string | null;
  staffGrowthLabel: string | null;
  pitcherCatcherLine: string | null;
}

export const FATIGUE_CHECKIN_THRESHOLD = 8;

const shift = (d: string, n: number) => new Date(Date.parse(d + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);

export function youthPitchingToday(i: YouthPitchingInput): YouthPitchingVerdict {
  const empty: YouthPitchingVerdict = {
    applies: false, pitchSmart: false, restDaysNeeded: null, pitchesToday: 0, staffProLine: null, dailyMax: null, bandLabel: null, stopToday: false, lines: [], warnings: [],
    growthLine: null, staffGrowthLabel: null, pitcherCatcherLine: i.pitcherCatcher ? PITCHER_CATCHER_LINE : null,
  };
  if (i.sport !== "baseball" || i.age == null) return empty;

  const fat = fatigueFlag({ checkInFatigued: (i.checkInFatigue ?? 0) >= FATIGUE_CHECKIN_THRESHOLD });
  const todayRow = i.days.filter((d) => d.date === i.today);
  const pitchesToday = todayRow.reduce((a, d) => a + d.pitches, 0);
  const pcLine = i.pitcherCatcher ? PITCHER_CATCHER_LINE : null;

  // Pros and anyone over 22: arm ledger, arm budget and fatigue stop only.
  if (!pitchSmartApplies(i.age, i.level)) {
    const lines = fat.stopOuting ? [`Stop pitching today. ${fat.reasons.join(". ")}.`] : [];
    return {
      applies: true, pitchSmart: false, restDaysNeeded: null, pitchesToday, staffProLine: PRO_PITCH_COUNT_STAFF_LINE,
      dailyMax: null, bandLabel: null, stopToday: fat.stopOuting, lines, warnings: [],
      growthLine: null, staffGrowthLabel: null, pitcherCatcherLine: pcLine,
    };
  }

  const sum = (from: string, f: (d: PitchDay) => number) =>
    i.days.filter((d) => d.date >= from && d.date <= i.today).reduce((a, d) => a + f(d), 0);
  const dow = (new Date(i.today + "T12:00:00Z").getUTCDay() + 6) % 7;
  const usage = {
    week: sum(shift(i.today, -dow), (d) => d.pitches),
    season: sum(i.seasonStart ?? shift(i.today, -120), (d) => d.pitches),
    year: sum(`${i.today.slice(0, 4)}-01-01`, (d) => d.pitches),
    inningsYear: sum(`${i.today.slice(0, 4)}-01-01`, (d) => d.innings),
  };
  const caps = checkCaps(i.age, i.level, usage, 0);
  const growth = growthAdjustment(i.age, i.heights, i.today);
  const band = growth.active ? growth.band : PITCH_SMART_BANDS[bandIndex(i.age)];
  const gameDates = i.days.filter((d) => (d.gameOutings ?? 0) > 0).map((d) => d.date);
  const thirdDay = thirdConsecutiveGameDay(gameDates, i.today);
  const gamesToday = todayRow.reduce((a, d) => a + (d.gameOutings ?? 0), 0);
  const twoGames = gamesToday >= 2;

  const lines: string[] = [];
  if (thirdDay) lines.push(THIRD_DAY_LINE);
  if (twoGames) lines.push(TWO_GAMES_LINE);
  if (caps.blocked) lines.push(`No more pitching for now — ${caps.blocks[0].toLowerCase()}.`);
  if (fat.stopOuting) lines.push(`Stop pitching today. ${fat.reasons.join(". ")}.`);

  return {
    applies: true,
    pitchSmart: true,
    restDaysNeeded: pitchesToday > 0 ? restDaysFor(band, pitchesToday) : null,
    pitchesToday,
    staffProLine: null,
    dailyMax: band.dailyMax,
    bandLabel: band.label,
    stopToday: caps.blocked || fat.stopOuting || thirdDay || twoGames,
    lines,
    warnings: caps.warnings,
    growthLine: growth.athleteLine,
    staffGrowthLabel: growth.staffLabel,
    pitcherCatcherLine: pcLine,
  };
}
