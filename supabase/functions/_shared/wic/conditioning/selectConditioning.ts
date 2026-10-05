// Stage 1 — conditioning selection (owner-authorised 2026-10-05).
//
// The conditioning session types now choose the work instead of only labelling
// it afterwards. Pure and deterministic: every input is a recorded fact
// (season phase, game dates, starting-pitcher flags, position, logged sessions,
// check-in reductions, the recovery governor). When a fact is missing the
// selector falls back to the pre-Stage-1 pair and says so.
//
// Shape rules: conditioning keeps its one card and never exceeds the two
// movements it always had. It can only shrink (to one) when the day calls for
// less. Short repeated efforts with full rest are the backbone — never
// endurance work. On/off switches (game day, post-season, suppressed days,
// "take it easy") stay with the caller and are untouched.

import type { ConditioningTemplateId } from "./templates.ts";

export type ConditioningPhase = "offseason" | "preseason" | "in_season" | "post_season";

export interface ConditioningSelectionInput {
  sport: "baseball" | "softball";
  position: string | null;
  /** Null when the season could not be resolved from the athlete's own settings. */
  phase: ConditioningPhase | null;
  /** Tournament marked on the plan date that is not itself a game day. */
  isTournamentDay: boolean;
  /** Hours to the next scheduled game; null when nothing is scheduled ahead. */
  hoursToNearestGame: number | null;
  /** A game the athlete started as pitcher was recorded on the previous day. */
  pitcherStartedYesterday: boolean;
  /** Logged sessions exist in the last 28 days but none in the last 7. */
  returningAfterGap: boolean;
  /** Check-in / governor reasons that ask for less today (e.g. "sleep", "soreness", "governor"). */
  dialDownReasons: readonly string[];
  /** Athlete pitches. */
  isPitcher?: boolean;
  /** A start is scheduled (or confirmed planned) for the day after the plan date. */
  pitcherStartsTomorrow?: boolean;
  /** Reliever marked available today or tomorrow. */
  relieverAvailableSoon?: boolean;
  /** Travel marked on the plan date. */
  isTravelDay?: boolean;
  /** Where the outing facts came from — "schedule" (pitcher schedule), "game_flag" (starting-pitcher tick on a game), or "none". */
  outingSource?: "schedule" | "game_flag" | "none";
}

export type ConditioningPath =
  | "return_to_conditioning"
  | "pitcher_after_start"
  | "pitcher_day_before_start"
  | "reliever_ready"
  | "travel_day"
  | "tournament"
  | "game_within_48h"
  | "offseason"
  | "preseason"
  | "in_season"
  | "fallback_no_phase";

export interface ConditioningSelection {
  path: ConditioningPath;
  templateId: ConditioningTemplateId;
  /** Ordered slugs, at most two. */
  slugs: string[];
  /** Plain coach-language reason shown to the athlete. No numbers. */
  why: string;
  /** True when the pre-Stage-1 behaviour was used because data was missing. */
  fallback: boolean;
  dialedDown: boolean;
}

export function positionDrillSlug(position: string | null): string {
  const pos = (position ?? "").toLowerCase();
  if (pos.includes("catch")) return "catcher_up_downs";
  if (pos.includes("pitch")) return "pitcher_field_and_cover";
  if (pos.includes("of") || pos.includes("outfield")) return "of_read_and_go";
  if (pos === "ss" || pos === "2b" || pos.includes("mid") || pos.includes("infield")) return "mif_turn_and_fire";
  if (pos.includes("if")) return "if_lateral_repeat";
  return "bases_1st_3rd";
}
export const inningRestart = (s: "baseball" | "softball") => (s === "baseball" ? "inning_restart_sim_bb" : "inning_restart_sim_sb");
export const repeatSprint = (s: "baseball" | "softball") => (s === "baseball" ? "repeat_90ft_bb" : "repeat_43ft_sb");

// Catalog categories (wk_movement_catalog.conditioning_category). The existing
// conditioning certifier requires at least one aerobic_base movement and at
// most one alactic_power movement, and a failed certifier sends the athlete to
// the safe session — so every selection keeps to that.
export const ALACTIC = new Set(["if_lateral_repeat", "inning_restart_sim_bb", "inning_restart_sim_sb", "repeat_43ft_sb", "repeat_90ft_bb"]);
const aerobicPositionDrill = (slug: string) => (ALACTIC.has(slug) ? "bases_1st_3rd" : slug);

const DIAL_DOWN_LINE = "Your check-in says go easier today, so the hard sprint is swapped for an easy flush.";
const RECENT_LOAD_LINE = "You've had a busy few days, so the hard sprint is swapped for an easy flush.";
const GENERIC_DIAL_LINE = "Today is a lighter day, so the hard sprint is swapped for an easy flush.";
const CHECK_IN_REASONS = new Set(["sleep", "cns", "soreness", "day_intent", "silent_signals"]);
function dialLine(reasons: readonly string[]): string {
  if (reasons.some((r) => CHECK_IN_REASONS.has(r))) return DIAL_DOWN_LINE;
  if (reasons.includes("recent_load")) return RECENT_LOAD_LINE;
  return GENERIC_DIAL_LINE;
}
/** Easy work that replaces a hard sprint on a dial-down day, so the count holds. */
export const DIAL_DOWN_SWAP = "rc_easy_flush";
const NO_SCHEDULE_LINE = "Add your pitching days so this can line up with your outings.";

export function selectConditioning(input: ConditioningSelectionInput): ConditioningSelection {
  const pos = aerobicPositionDrill(positionDrillSlug(input.position));
  const base = (path: ConditioningPath, templateId: ConditioningTemplateId, slugs: string[], why: string, fallback = false): ConditioningSelection => {
    const dial = input.dialDownReasons.length > 0 && slugs.some((x) => ALACTIC.has(x));
    return {
      path, templateId,
      // Dialing down swaps the hard sprint for an easy flush — same count.
      slugs: dial ? slugs.map((x) => (ALACTIC.has(x) ? DIAL_DOWN_SWAP : x)).filter((x, i, a) => a.indexOf(x) === i) : slugs,
      why: [why, dial && slugs.some((x) => ALACTIC.has(x)) ? dialLine(input.dialDownReasons) : null].filter(Boolean).join(" "),
      fallback, dialedDown: dial,
    };
  };

  if (input.returningAfterGap) {
    return base("return_to_conditioning", "cond.return_to_conditioning", [pos],
      "You've had some time off, so conditioning starts easy. Build back up over the coming days, with hard sprints later.");
  }
  const sb = input.sport === "softball";
  if (input.isPitcher && input.pitcherStartedYesterday) {
    return base("pitcher_after_start", "cond.recovery_flush", ["rc_easy_flush", "rc_long_reach_walk"],
      "You pitched yesterday, so today is an easy flush to get you ready for the next one.");
  }
  if (input.isTravelDay) {
    return base("travel_day", "cond.recovery_flush", ["rc_travel_reset", "rc_breathing_reset"],
      "You're travelling, so today is easy movement to stay loose.");
  }
  if (input.isPitcher && input.pitcherStartsTomorrow) {
    return base("pitcher_day_before_start", "cond.pitcher_conditioning",
      sb ? ["sp_drive_bounds_sb", "sp_stride_stick_sb"] : ["pc_ankle_pogos_bb", "pc_buildup_strides_bb"],
      "You pitch tomorrow, so today primes you to feel springy, not tired.");
  }
  if (input.isPitcher && input.relieverAvailableSoon) {
    return base("reliever_ready", "cond.pitcher_conditioning",
      sb ? ["rp_ready_series_sb", "sp_arm_circle_rhythm_sb"] : ["rp_ready_series_bb", "pc_pretension_hold_bb"],
      "You could get the call, so this keeps you ready without spending anything.");
  }
  if (input.isPitcher && input.outingSource === "none") {
    const r = selectConditioning({ ...input, isPitcher: false });
    return { ...r, why: `${r.why} ${NO_SCHEDULE_LINE}` };
  }
  if (input.isTournamentDay) {
    return base("tournament", "cond.tournament_day", [pos],
      "Tournament on, so conditioning stays light to save your legs for games.");
  }
  if (input.hoursToNearestGame != null && input.hoursToNearestGame > 0 && input.hoursToNearestGame <= 48) {
    const when = input.hoursToNearestGame <= 30 ? "Game tomorrow" : "Game in two days";
    return base("game_within_48h", "cond.baseball_game_day", [pos],
      `${when}, so today stays short and easy.`);
  }
  switch (input.phase) {
    case "offseason":
      return base("offseason", "cond.repeated_sprint", [repeatSprint(input.sport), "bases_home_2nd"],
        "Off-season: build your engine with hard sprints and full rest between them.");
    case "preseason":
      return base("preseason", "cond.practice_day", [inningRestart(input.sport), pos],
        "Getting ready for games, so conditioning copies game effort: short bursts, then rest.");
    case "in_season":
      return base("in_season", "cond.repeated_sprint", [repeatSprint(input.sport), pos],
        "In season with no game in the next two days: short, sharp sprints with full rest.");
    default:
      return base("fallback_no_phase", "cond.off_day", [inningRestart(input.sport), pos],
        "Standard conditioning for now. Add your season dates so this can match where you are in the year.", true);
  }
}

/** Phase mapping from the generator's resolved WK phase. Null = unknown. */
export function conditioningPhaseFrom(wkPhase: string | null | undefined, source: string | null | undefined): ConditioningPhase | null {
  if (!wkPhase || source === "default") return null;
  if (wkPhase === "in_season") return "in_season";
  if (wkPhase === "post_season") return "post_season";
  if (wkPhase === "os_q4") return "preseason";
  if (wkPhase.startsWith("os_")) return "offseason";
  return null;
}

/** "Returning after time off" from logged sessions only. No logs = no evidence = false. */
export function isReturningAfterGap(logDates: readonly string[], planDate: string): boolean {
  const day = (d: string) => new Date(`${d}T00:00:00Z`).getTime();
  const p = day(planDate);
  const ages = logDates.map((d) => Math.round((p - day(d)) / 86400000)).filter((a) => a > 0 && a <= 28);
  if (ages.length === 0) return false;
  return ages.every((a) => a > 7);
}
