/**
 * Game data → video taxonomy tags.
 *
 * Analysis clips are not the only place the library should be able to help.
 * What actually happened in a game is real evidence, so game rows are turned
 * into the same tag keys the recommender already matches on. Nothing is
 * invented here: every key below exists in the taxonomy, and a row that does
 * not clearly imply a key contributes nothing rather than a guess.
 */
import type { SkillDomain } from "@/lib/videoRecommendationEngine";

export interface GameSignals {
  skillDomain: SkillDomain;
  movementPatterns: string[];
  resultTags: string[];
  contextTags: string[];
  correctionTags: string[];
  /** Plain-language "why" lines, one per evidence group. */
  evidence: string[];
}

export interface GameDefensePlayRow {
  position: string | null;
  play_type: string | null;
  result: string | null;
  error_flag: boolean | null;
  pop_time_sec: number | null;
}

export interface GamePitchRow {
  perspective: string;
  pitch_type: string | null;
  result: string | null;
}

export interface GameAtBatRow {
  result: string | null;
  contact_quality: string | null;
  count_balls: number | null;
  count_strikes: number | null;
  runners_on: string | null;
}

export interface GameBaserunRow {
  event_type: string;
  success: boolean | null;
}

const POSITION_FAMILY = (pos: string | null | undefined): "c" | "fb" | "mi" | "tb" | "of" | null => {
  const p = (pos || "").toUpperCase();
  if (p === "C") return "c";
  if (p === "1B") return "fb";
  if (p === "2B" || p === "SS") return "mi";
  if (p === "3B") return "tb";
  if (p === "LF" || p === "CF" || p === "RF" || p === "OF") return "of";
  return null;
};

/** A fielding miss implies a result key, and each result key implies work. */
const FIELDING_RESULT_CHAIN: Record<string, { movement: string[]; correction: string[] }> = {
  c_passed_ball: { movement: ["c_late_block_drop"], correction: ["c_block_angle_to_plate"] },
  c_missed_block_away: { movement: ["c_wide_secondary", "c_slow_block_recovery"], correction: ["c_beat_ball_with_hips"] },
  c_bottom_strike_lost: { movement: ["c_stabs_at_receiving"], correction: ["c_quiet_receiving"] },
  fb_missed_pick: { movement: ["fb_late_scoop_glove"], correction: ["fb_work_through_short_hop"] },
  fb_pulled_off_bag: { movement: ["fb_early_stretch"], correction: ["fb_stretch_after_read"] },
  mi_dp_turn_late: { movement: ["mi_late_pivot_at_bag"], correction: ["mi_feed_from_glove_side"] },
  mi_feed_offline: { movement: ["mi_feed_from_wrong_hip", "mi_flat_glove_approach"], correction: ["mi_field_through_the_ball", "mi_underhand_inside_range"] },
  tb_slow_roller_late_throw: { movement: ["tb_no_charge_slow_roller"], correction: ["tb_attack_slow_roller"] },
  tb_eaten_by_hop: { movement: ["tb_backs_up_in_between_hop"], correction: ["tb_work_through_the_hop"] },
  of_ball_over_head: { movement: ["of_first_step_drift_in", "of_late_drop_step"], correction: ["of_drop_step_on_read"] },
  of_late_to_cutoff: { movement: ["of_no_throwing_momentum"], correction: ["of_play_through_the_ball"] },
  of_misplayed_wall_ball: { movement: ["of_rounded_route"], correction: ["of_banana_route"] },
};

/** Generic fielding faults that apply whatever the spot on the field. */
const GENERIC_FIELDING = {
  movement: ["poor_footwork_angle", "late_exchange", "fd_no_pre_pitch_hop", "fd_head_lifts_early"],
  correction: ["first_step_quickness", "clean_glove_path", "quick_exchange", "reaction_drills"],
};

function resultKeyFor(family: string | null, play: string | null, result: string | null): string | null {
  if (!family) return null;
  const hay = `${play ?? ""} ${result ?? ""}`.toLowerCase();
  const candidates = Object.keys(FIELDING_RESULT_CHAIN).filter((k) => k.startsWith(`${family}_`));
  for (const key of candidates) {
    const words = key.slice(family.length + 1).split("_");
    if (words.filter((w) => w.length > 3 && hay.includes(w)).length >= 1) return key;
  }
  return null;
}

/** Fielding: errors and misplays in the field become fielding-layer tags. */
export function defensePlaysToSignals(rows: GameDefensePlayRow[]): GameSignals | null {
  const misses = rows.filter((r) => r.error_flag || /error|misplay|drop|passed|late|bobble/i.test(r.result ?? ""));
  if (misses.length === 0) return null;

  const movement = new Set<string>();
  const result = new Set<string>();
  const correction = new Set<string>();
  const context = new Set<string>();

  for (const row of misses) {
    const family = POSITION_FAMILY(row.position);
    const key = resultKeyFor(family, row.play_type, row.result);
    if (key) {
      result.add(key);
      for (const m of FIELDING_RESULT_CHAIN[key].movement) movement.add(m);
      for (const c of FIELDING_RESULT_CHAIN[key].correction) correction.add(c);
    }
    if (/bunt/i.test(row.play_type ?? "")) context.add("fd_bunt_defense");
    if (/slap/i.test(row.play_type ?? "")) context.add("fd_slap_defense");
    if (/wet|rain|turf/i.test(row.play_type ?? "")) context.add("fd_wet_or_turf");
  }

  // Repeat misses without a specific pattern still deserve the general work.
  if (result.size === 0 && misses.length >= 2) {
    for (const m of GENERIC_FIELDING.movement) movement.add(m);
    for (const c of GENERIC_FIELDING.correction) correction.add(c);
  }

  if (movement.size + result.size + correction.size === 0) return null;
  return {
    skillDomain: "fielding",
    movementPatterns: [...movement],
    resultTags: [...result],
    contextTags: [...context],
    correctionTags: [...correction],
    evidence: [`${misses.length} play${misses.length === 1 ? "" : "s"} in the field didn't go cleanly`],
  };
}

const PITCH_TYPE_CONTEXT: Record<string, string> = {
  fastball: "bb_fastball",
  four_seam: "bb_fastball",
  two_seam: "bb_fastball",
  sinker: "bb_fastball",
  curveball: "bb_breaking_ball",
  slider: "bb_breaking_ball",
  cutter: "bb_breaking_ball",
  changeup: "bb_changeup",
  riseball: "sb_riseball",
  rise: "sb_riseball",
  dropball: "sb_dropball",
  drop: "sb_dropball",
  screwball: "sb_screwball",
  screw: "sb_screwball",
};

const SOFTBALL_PITCH_CONTEXT: Record<string, string> = {
  fastball: "sb_fastball",
  curveball: "sb_curveball",
  changeup: "sb_changeup",
};

/** Pitching: what was thrown and how it finished. */
export function pitchesToSignals(rows: GamePitchRow[], sport: "baseball" | "softball"): GameSignals | null {
  const mine = rows.filter((r) => r.perspective === "pitching");
  if (mine.length === 0) return null;

  const context = new Set<string>();
  const result = new Set<string>();

  for (const row of mine) {
    const t = (row.pitch_type || "").toLowerCase().replace(/[\s-]/g, "_");
    const key = (sport === "softball" ? SOFTBALL_PITCH_CONTEXT[t] : undefined) ?? PITCH_TYPE_CONTEXT[t];
    if (key) context.add(key);
    const res = (row.result || "").toLowerCase();
    if (/wild|bounce|dirt/.test(res)) result.add("bb_bounced_pitch");
    if (/hung|hanger/.test(res)) result.add("bb_hung_breaking_ball");
    if (sport === "softball") {
      if (/hung|hanger/.test(res)) result.add("sb_screw_backs_up");
      if (/telegraph|read/.test(res)) result.add("sb_change_telegraphed");
    }
  }

  if (context.size + result.size === 0) return null;
  return {
    skillDomain: "pitching",
    movementPatterns: [],
    resultTags: [...result],
    contextTags: [...context],
    correctionTags: [],
    evidence: [`${mine.length} pitch${mine.length === 1 ? "" : "es"} logged this game`],
  };
}

/** Hitting: counts and contact quality from real at-bats. */
export function atBatsToSignals(rows: GameAtBatRow[]): GameSignals | null {
  if (rows.length === 0) return null;
  const context = new Set<string>();
  const result = new Set<string>();

  for (const r of rows) {
    const balls = r.count_balls ?? 0;
    const strikes = r.count_strikes ?? 0;
    if (strikes >= 2) context.add("two_strike");
    if (balls > strikes) context.add("ahead_in_the_count");
    if (r.runners_on && r.runners_on !== "empty" && /2|3/.test(r.runners_on)) context.add("risp");
    const cq = (r.contact_quality || "").toLowerCase();
    if (/end|cap|off_the_end/.test(cq)) result.add("end_cap_hit");
    if (/barrel|square|hard/.test(cq)) result.add("perfect_backspin_batted_ball");
  }

  if (context.size + result.size === 0) return null;
  return {
    skillDomain: "hitting",
    movementPatterns: [],
    resultTags: [...result],
    contextTags: [...context],
    correctionTags: [],
    evidence: [`${rows.length} at-bat${rows.length === 1 ? "" : "s"} logged this game`],
  };
}

/** Base running: getting thrown out points at the first move. */
export function baserunToSignals(rows: GameBaserunRow[]): GameSignals | null {
  const caught = rows.filter((r) => /steal|advance/i.test(r.event_type) && r.success === false);
  if (caught.length === 0) return null;
  return {
    skillDomain: "base_running",
    movementPatterns: [],
    resultTags: [],
    contextTags: [],
    correctionTags: ["first_step_quickness"],
    evidence: [`Thrown out ${caught.length} time${caught.length === 1 ? "" : "s"} on the bases`],
  };
}
