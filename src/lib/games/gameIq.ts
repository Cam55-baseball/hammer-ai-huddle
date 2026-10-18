/**
 * Game IQ — player reports, tap-in heat maps and the matchup planner,
 * built ONLY from entered game facts (gp_at_bats, gp_pitches,
 * gp_defense_plays, gp_baserun_events). Blank fields leave denominators and
 * show "Not entered"; under MIN_TREND_SAMPLE entries is an "early read";
 * no rows at all is "Need more data".
 */
import { recordedRate } from "@/utils/recordedPercentages";
import { MIN_TREND_SAMPLE } from "./reportEngine";
import { baserunningSummary, type BaserunningEvent } from "./baserunningSummary";

export const NOT_ENTERED = "Not entered";
export const NEED_MORE_DATA = "Need more data";
export const NO_DATA_YET = "No data yet";

export interface IqStat {
  label: string;
  value: string;
  /** Plain sample label, e.g. "from 4 at-bats with a result · early read". */
  sample: string | null;
}

export interface IqSection {
  title: string;
  /** null when there are no rows at all → show NEED_MORE_DATA. */
  stats: IqStat[] | null;
}

const early = (n: number) => (n > 0 && n < MIN_TREND_SAMPLE ? " · early read" : "");
const sampleOf = (n: number, noun: string) => `from ${n} ${noun}${early(n)}`;

/** Percentage stat: numerator/denominator of entered facts only. */
export function rateStat(label: string, k: number, n: number, noun: string): IqStat {
  const r = recordedRate(k, n);
  if (r == null) return { label, value: NOT_ENTERED, sample: null };
  return { label, value: `${Math.round(r)}% (${k} of ${n})`, sample: sampleOf(n, noun) };
}

const countStat = (label: string, k: number, n: number, noun: string): IqStat =>
  n === 0 ? { label, value: NOT_ENTERED, sample: null } : { label, value: String(k), sample: sampleOf(n, noun) };

const has = (v: unknown) => v !== null && v !== undefined && String(v).trim() !== "";

/* ------------------------------------------------------------- hitter */

const HITS = ["1B", "2B", "3B", "HR", "single", "double", "triple", "home_run"];
const NON_AB = ["BB", "walk", "HBP", "hbp", "SF", "sac_fly", "SAC", "sac_bunt", "catchers_interference", "IBB"];
const WALKS = ["BB", "walk", "IBB"];
const KS = ["K", "K_swinging", "K_looking", "strikeout", "SO"];

export interface IqAtBat { result?: string | null; contact_quality?: string | null }

export function hitterReport(atBats: IqAtBat[]): IqSection {
  if (!atBats.length) return { title: "Hitting", stats: null };
  const entered = atBats.filter((a) => has(a.result));
  const official = entered.filter((a) => !NON_AB.includes(String(a.result)));
  const hits = official.filter((a) => HITS.includes(String(a.result))).length;
  const withQuality = entered.filter((a) => has(a.contact_quality));
  const hard = withQuality.filter((a) => ["barrel", "solid", "hard"].includes(String(a.contact_quality))).length;
  return {
    title: "Hitting",
    stats: [
      rateStat("Hit rate (hits per official at-bat)", hits, official.length, "official at-bats"),
      countStat("Walks", entered.filter((a) => WALKS.includes(String(a.result))).length, entered.length, "plate appearances with a result"),
      countStat("Strikeouts", entered.filter((a) => KS.includes(String(a.result))).length, entered.length, "plate appearances with a result"),
      rateStat("Hard contact (you marked solid or barrel)", hard, withQuality.length, "at-bats with contact marked"),
      { label: "Plate appearances missing a result", value: String(atBats.length - entered.length), sample: null },
    ],
  };
}

/* ------------------------------------------------------------- pitcher */

export interface IqPitch {
  perspective?: string | null;
  result?: string | null;
  location?: { zone?: number | string | null; outZone?: string | null } | null;
  count_balls?: number | null;
  count_strikes?: number | null;
  pitch_type?: string | null;
  pitcher_throws?: string | null;
  batter_handedness?: string | null;
}

const SWINGS = ["swinging_strike", "foul", "in_play", "bunt_foul", "bunt_in_play"];
const isStrike = (r: string) => r !== "ball" && r !== "hbp";

export function pitcherReport(pitches: IqPitch[]): IqSection {
  const mine = pitches.filter((p) => p.perspective === "pitcher");
  if (!mine.length) return { title: "Pitching", stats: null };
  const withResult = mine.filter((p) => has(p.result));
  const strikes = withResult.filter((p) => isStrike(String(p.result))).length;
  const swings = withResult.filter((p) => SWINGS.includes(String(p.result)));
  const whiffs = swings.filter((p) => p.result === "swinging_strike").length;
  const first = withResult.filter((p) => p.count_balls === 0 && p.count_strikes === 0);
  const firstStrikes = first.filter((p) => isStrike(String(p.result))).length;
  return {
    title: "Pitching",
    stats: [
      { label: "Pitches logged", value: String(mine.length), sample: null },
      rateStat("Strike rate", strikes, withResult.length, "pitches with a result"),
      rateStat("Swing-and-miss rate (of swings)", whiffs, swings.length, "swings"),
      rateStat("First-pitch strikes", firstStrikes, first.length, "0-0 pitches with a result"),
      { label: "Pitches missing a result", value: String(mine.length - withResult.length), sample: null },
    ],
  };
}

/* ------------------------------------------------------- defense/throwing */

export interface IqDefense { position?: string | null; error_flag?: boolean | null; putout?: boolean | null; assist?: boolean | null }

export function defenseReport(plays: IqDefense[]): IqSection {
  if (!plays.length) return { title: "Defense and throwing", stats: null };
  const errKnown = plays.filter((p) => typeof p.error_flag === "boolean");
  const clean = errKnown.filter((p) => p.error_flag === false).length;
  const poKnown = plays.filter((p) => typeof p.putout === "boolean");
  const asKnown = plays.filter((p) => typeof p.assist === "boolean");
  return {
    title: "Defense and throwing",
    stats: [
      { label: "Plays logged", value: String(plays.length), sample: null },
      rateStat("Plays without an error", clean, errKnown.length, "plays with error marked"),
      countStat("Putouts", poKnown.filter((p) => p.putout).length, poKnown.length, "plays with putout marked"),
      countStat("Assists (throw-outs)", asKnown.filter((p) => p.assist).length, asKnown.length, "plays with assist marked"),
    ],
  };
}

/* ------------------------------------------------------------ baserunning */

export function baserunReport(events: BaserunningEvent[]): IqSection {
  if (!events.length) return { title: "Baserunning", stats: null };
  const s = baserunningSummary(events);
  return {
    title: "Baserunning",
    stats: [
      { label: "Running plays logged", value: String(s.total), sample: null },
      { label: "Steal attempts", value: String(s.steals), sample: null },
      s.stealPct == null
        ? { label: "Steal success", value: NOT_ENTERED, sample: null }
        : { label: "Steal success", value: `${s.stealPct}%`, sample: sampleOf(s.knownResults, "steals with a result") },
      { label: "Steals missing a result", value: String(s.missingResults), sample: null },
    ],
  };
}

/* ---------------------------------------------------------- tap-in heat map */

export interface HeatCell { zone: number; pitches: number; swings: number; whiffs: number }
export interface TapInHeatMap { total: number; outOfZone: number; cells: HeatCell[]; earlyRead: boolean }

/** Counts only real tapped zones 1–9 (and out-of-zone taps). null = No data yet. */
export function tapInHeatMap(pitches: IqPitch[], perspective: "hitter" | "pitcher"): TapInHeatMap | null {
  const mine = pitches.filter((p) => p.perspective === perspective);
  const cells: HeatCell[] = Array.from({ length: 9 }, (_, i) => ({ zone: i + 1, pitches: 0, swings: 0, whiffs: 0 }));
  let outOfZone = 0;
  for (const p of mine) {
    const z = Number(p.location?.zone);
    const r = String(p.result ?? "");
    if (z >= 1 && z <= 9 && Number.isInteger(z)) {
      const c = cells[z - 1];
      c.pitches += 1;
      if (SWINGS.includes(r)) c.swings += 1;
      if (r === "swinging_strike") c.whiffs += 1;
    } else if (has(p.location?.outZone)) outOfZone += 1;
  }
  const total = cells.reduce((a, c) => a + c.pitches, 0) + outOfZone;
  if (total === 0) return null;
  return { total, outOfZone, cells, earlyRead: total < MIN_TREND_SAMPLE };
}

/* -------------------------------------------------------- matchup planner */

export interface MatchupRow {
  key: string;
  pitches: number;
  swing: IqStat;
  whiff: IqStat;
  earlyRead: boolean;
}

/** Hitter-side pitches grouped by pitcher hand + pitch type. Blank keys group as "Not entered". */
export function matchupPlanner(pitches: IqPitch[]): MatchupRow[] {
  const mine = pitches.filter((p) => p.perspective === "hitter" && has(p.result));
  const groups = new Map<string, IqPitch[]>();
  for (const p of mine) {
    const hand = has(p.pitcher_throws) ? `vs ${p.pitcher_throws}HP` : `Pitcher hand ${NOT_ENTERED.toLowerCase()}`;
    const type = has(p.pitch_type) ? String(p.pitch_type) : `pitch type ${NOT_ENTERED.toLowerCase()}`;
    const k = `${hand} · ${type}`;
    groups.set(k, [...(groups.get(k) ?? []), p]);
  }
  return [...groups.entries()]
    .map(([key, ps]) => {
      const swings = ps.filter((p) => SWINGS.includes(String(p.result)));
      const whiffs = swings.filter((p) => p.result === "swinging_strike").length;
      return {
        key,
        pitches: ps.length,
        swing: rateStat("Swing rate", swings.length, ps.length, "pitches"),
        whiff: rateStat("Miss rate (of swings)", whiffs, swings.length, "swings"),
        earlyRead: ps.length < MIN_TREND_SAMPLE,
      };
    })
    .sort((a, b) => b.pitches - a.pitches);
}
