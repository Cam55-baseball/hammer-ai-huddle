/**
 * Game Performance READER — the deterministic aggregation layer.
 *
 * Every number surfaced from the game ledger comes from a SQL view in the
 * database (`gp_v_*`), never from an LLM and never from a default value.
 *
 * Three rules this file exists to enforce:
 *   1. Every derived number carries its own sample size (`n`).
 *   2. Below `MIN_N` the caller must render "not enough data yet" and
 *      nothing else — see `hasEnough()`.
 *   3. Missing inputs stay missing. No interpolation, no constants, no
 *      filling gaps. A rate over zero attempts is `null`, not 0.
 *
 * NOTE ON NAMING: this module reads the GAME LEDGER (`gp_*`). It has nothing
 * to do with `game_plan_days` / GamePlanCard, which is the daily TRAINING
 * plan. See docs/games/naming.md.
 */
import { supabase } from "@/integrations/supabase/client";

/** Minimum reps before any rate or average may be shown to a user. */
export const MIN_N = 10;

/** Minimum reps before a raw timing/measurement average may be shown. */
export const MIN_MEASURE_N = 5;

export function hasEnough(n: number | null | undefined, min: number = MIN_N): boolean {
  return typeof n === "number" && n >= min;
}

/** Safe rate. Returns null (missing) rather than 0 when there is no denominator. */
export function rate(num: number | null | undefined, den: number | null | undefined): number | null {
  if (num == null || den == null || den <= 0) return null;
  return num / den;
}

/** Batting-average style formatting (.318). Null renders as an em dash upstream. */
export function fmtAvg(v: number | null): string | null {
  if (v == null) return null;
  return v.toFixed(3).replace(/^0/, "");
}

export function fmtPct(v: number | null, digits = 0): string | null {
  if (v == null) return null;
  return `${(v * 100).toFixed(digits)}%`;
}

export function fmtNum(v: number | null | undefined, digits = 2): string | null {
  if (v == null) return null;
  return Number(v).toFixed(digits);
}

// ---------------------------------------------------------------------------
// View names — one place, so a rename can never drift.
// ---------------------------------------------------------------------------
export const GP_VIEWS = {
  atBatFacts: "gp_v_at_bat_facts",
  pitchFacts: "gp_v_pitch_facts",
  byPitchType: "gp_v_hitting_by_pitch_type",
  byCount: "gp_v_hitting_by_count",
  byZone: "gp_v_hitting_by_zone",
  byPitcherHand: "gp_v_hitting_by_pitcher_hand",
  byVeloBand: "gp_v_hitting_by_velo_band",
  contactQuality: "gp_v_contact_quality",
  risp: "gp_v_hitting_risp",
  homeToFirst: "gp_v_home_to_first",
  plateDiscipline: "gp_v_plate_discipline",
  defenseByPosition: "gp_v_defense_by_position",
  baserunning: "gp_v_baserunning",
} as const;

export type GpView = (typeof GP_VIEWS)[keyof typeof GP_VIEWS];

/** A hitting split row as returned by the `gp_v_hitting_by_*` views. */
export interface HittingSplitRow {
  user_id: string;
  sport: string | null;
  split_value: string;
  n: number;
  at_bats: number | null;
  hits: number | null;
  total_bases: number | null;
  strikeouts: number | null;
  hard_contact: number | null;
  avg_exit_velo?: number | null;
  exit_velo_n?: number | null;
  rbi?: number | null;
}

export interface PlateDisciplineRow {
  user_id: string;
  sport: string | null;
  perspective: string | null;
  n: number;
  swings: number;
  whiffs: number;
  out_of_zone_pitches: number;
  chases: number;
  in_zone_pitches: number;
  in_zone_swings: number;
}

export interface DefenseRow {
  user_id: string;
  sport: string | null;
  split_value: string;
  n: number;
  errors: number;
  putouts: number;
  assists: number;
  avg_pop_time_sec: number | null;
  pop_time_n: number;
  avg_arm_velo: number | null;
  arm_velo_n: number;
}

export interface BaserunRow {
  user_id: string;
  sport: string | null;
  split_value: string;
  n: number;
  successes: number;
  avg_run_time_sec: number | null;
  run_time_n: number;
}

export interface HomeToFirstRow {
  user_id: string;
  sport: string | null;
  n: number;
  avg_sec: number | null;
  best_sec: number | null;
  worst_sec: number | null;
}

/** Generic view fetch, always scoped to the caller (RLS also enforces it). */
export async function fetchView<T>(
  view: GpView,
  userId: string,
  sport?: string | null,
): Promise<T[]> {
  let q = (supabase as any).from(view).select("*").eq("user_id", userId);
  if (sport) q = q.eq("sport", sport);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as T[];
}

/** Real game-rep counts straight from the ledger. Used for game/practice ratio. */
export async function fetchGameRepCounts(userId: string): Promise<{
  at_bats: number;
  pitches: number;
  defense_plays: number;
  baserun_events: number;
  total_reps: number;
  games: number;
} | null> {
  const { data, error } = await (supabase as any).rpc("gp_game_rep_counts", {
    _user_id: userId,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    at_bats: Number(row.at_bats ?? 0),
    pitches: Number(row.pitches ?? 0),
    defense_plays: Number(row.defense_plays ?? 0),
    baserun_events: Number(row.baserun_events ?? 0),
    total_reps: Number(row.total_reps ?? 0),
    games: Number(row.games ?? 0),
  };
}
