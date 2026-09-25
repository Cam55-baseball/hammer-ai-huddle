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
  type HeightCheck,
} from "../../../supabase/functions/_shared/wic/phases/youthThrowing";

export interface PitchDay { date: string; pitches: number; innings: number }

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
    applies: false, dailyMax: null, bandLabel: null, stopToday: false, lines: [], warnings: [],
    growthLine: null, staffGrowthLabel: null, pitcherCatcherLine: i.pitcherCatcher ? PITCHER_CATCHER_LINE : null,
  };
  if (i.sport !== "baseball" || i.age == null) return empty;

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
  const fat = fatigueFlag({ checkInFatigued: (i.checkInFatigue ?? 0) >= FATIGUE_CHECKIN_THRESHOLD });

  const lines: string[] = [];
  if (caps.blocked) lines.push(`No more pitching for now — ${caps.blocks[0].toLowerCase()}.`);
  if (fat.stopOuting) lines.push(`Stop pitching today. ${fat.reasons.join(". ")}.`);

  return {
    applies: true,
    dailyMax: band.dailyMax,
    bandLabel: band.label,
    stopToday: caps.blocked || fat.stopOuting,
    lines,
    warnings: caps.warnings,
    growthLine: growth.athleteLine,
    staffGrowthLabel: growth.staffLabel,
    pitcherCatcherLine: i.pitcherCatcher ? PITCHER_CATCHER_LINE : null,
  };
}
