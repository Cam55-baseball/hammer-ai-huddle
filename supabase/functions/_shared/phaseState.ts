// ONE SYSTEM, ONE PHASE (owner rule 2026-10-07). The single answer for
// "where is this player right now": season phase, sub-block, ramp-up,
// lighter week and growth. Every card, label, counter, gate and AI prompt
// reads this object; nothing else works a phase out.
// App mirror: src/lib/phaseState.ts (byte-identical below the imports).
import { resolveSeasonPhase, type SeasonSettingsLike } from "./seasonPhase.ts";
import { resolveWkPhase } from "./wkPhaseQuarter.ts";
import { growthMode, type HeightReading } from "./wic/growth/growthMode.ts";

export const PHASE_STATE_VERSION = "phase_state_v1";

export type SeasonName = "off_season" | "preseason" | "in_season" | "post_season";
export type SubBlock = "os_q1" | "os_q2" | "os_q3" | "os_q4" | "in_season" | "post_season";
export type LighterWeek = "none" | "planned" | "trend";

export interface PhaseState {
  version: string;
  date: string;
  season: SeasonName;
  season_label: string;
  sub_block: SubBlock;
  sub_block_label: string;
  ramp_up: boolean;
  lighter_week: LighterWeek;
  growth: boolean;
  days_in: number | null;
  days_left: number | null;
  source: "date_window" | "stored" | "manual" | "default";
}

export interface PhaseStateInput {
  settings: SeasonSettingsLike | null | undefined;
  date: string; // athlete's own calendar day
  heights?: readonly HeightReading[] | null;
  plannedDeload?: boolean;
  trendLighter?: boolean;
}

/** One vocabulary: these are the only season words shown anywhere. */
export const SEASON_LABEL: Record<SeasonName, string> = {
  off_season: "Off-Season",
  preseason: "Pre-Season",
  in_season: "In-Season",
  post_season: "Post-Season",
};

export function resolvePhaseState(i: PhaseStateInput): PhaseState {
  const s = resolveSeasonPhase(i.settings, i.date);
  const wk = resolveWkPhase(i.settings, new Date(`${i.date}T12:00:00Z`), i.date);
  const season = s.phase as SeasonName;
  const g = growthMode(i.heights ?? [], i.date);
  const lighter: LighterWeek = i.plannedDeload ? "planned" : i.trendLighter ? "trend" : "none";
  return {
    version: PHASE_STATE_VERSION,
    date: i.date,
    season,
    season_label: SEASON_LABEL[season],
    sub_block: wk.phase as SubBlock,
    sub_block_label: wk.displayName,
    ramp_up: season === "preseason" || wk.phase === "os_q4",
    lighter_week: lighter,
    growth: g.active,
    days_in: s.daysIntoPhase,
    days_left: s.daysUntilNextPhase,
    source: wk.source,
  };
}

/** Plain line for AI coach prompts — same words the screens use. */
export function phaseStatePrompt(p: PhaseState): string {
  return `Season: ${p.season_label}. Block: ${p.sub_block_label}.` +
    (p.ramp_up ? " Ramping up to play." : "") +
    (p.lighter_week !== "none" ? " Lighter week." : "") +
    (p.growth ? " Growing fast (growth mode)." : "");
}
