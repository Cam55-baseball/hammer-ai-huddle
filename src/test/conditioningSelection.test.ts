/**
 * Stage 1 — conditioning selection (owner-authorised 2026-10-05).
 * Every path, every fallback, and the shape guarantees: at most two movements,
 * never more than the pre-Stage-1 pair, no numbers in athlete copy.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  ALACTIC,
  selectConditioning, conditioningPhaseFrom, isReturningAfterGap,
  type ConditioningSelectionInput,
} from "../../supabase/functions/_shared/wic/conditioning/selectConditioning";
import { CONDITIONING_TEMPLATES } from "../../supabase/functions/_shared/wic/conditioning/templates";

const base: ConditioningSelectionInput = {
  sport: "baseball", position: "SS", phase: "offseason", isTournamentDay: false,
  hoursToNearestGame: null, pitcherStartedYesterday: false, returningAfterGap: false, dialDownReasons: [],
};
const sel = (o: Partial<ConditioningSelectionInput>) => selectConditioning({ ...base, ...o });
const CATALOG = new Set([
  "bases_1st_3rd", "bases_home_2nd", "catcher_up_downs", "mif_turn_and_fire", "of_read_and_go",
  "pitcher_field_and_cover", "if_lateral_repeat", "inning_restart_sim_bb", "inning_restart_sim_sb",
  "repeat_43ft_sb", "repeat_90ft_bb", "rc_easy_flush", "rc_long_reach_walk", "rc_travel_reset", "rc_breathing_reset",
  "pc_ankle_pogos_bb", "pc_buildup_strides_bb", "pc_pretension_hold_bb", "rp_ready_series_bb",
  "sp_drive_bounds_sb", "sp_stride_stick_sb", "sp_arm_circle_rhythm_sb", "rp_ready_series_sb",
]);

describe("conditioning selection paths", () => {
  it("off-season: repeated sprints + bases run", () => {
    const s = sel({});
    expect(s.path).toBe("offseason");
    expect(s.templateId).toBe("cond.repeated_sprint");
    expect(s.slugs).toEqual(["repeat_90ft_bb", "bases_home_2nd"]);
  });
  it("softball uses softball distances", () => {
    expect(sel({ sport: "softball" }).slugs[0]).toBe("repeat_43ft_sb");
    expect(sel({ sport: "softball", phase: "preseason" }).slugs[0]).toBe("inning_restart_sim_sb");
  });
  it("preseason: practice-day game-effort work", () => {
    const s = sel({ phase: "preseason" });
    expect(s.templateId).toBe("cond.practice_day");
    expect(s.slugs).toEqual(["inning_restart_sim_bb", "mif_turn_and_fire"]);
  });
  it("in season, no game close: short sprints + position drill", () => {
    const s = sel({ phase: "in_season", hoursToNearestGame: 96 });
    expect(s.path).toBe("in_season");
    expect(s.slugs).toEqual(["repeat_90ft_bb", "mif_turn_and_fire"]);
  });
  it("game tomorrow: one short drill", () => {
    const s = sel({ phase: "in_season", hoursToNearestGame: 20 });
    expect(s.path).toBe("game_within_48h");
    expect(s.slugs).toEqual(["mif_turn_and_fire"]);
    expect(s.why).toMatch(/^Game tomorrow/);
  });
  it("game in two days: still short", () => {
    const s = sel({ phase: "offseason", hoursToNearestGame: 44 });
    expect(s.path).toBe("game_within_48h");
    expect(s.why).toMatch(/^Game in two days/);
  });
  it("game beyond 48h does not trigger the short day", () => {
    expect(sel({ hoursToNearestGame: 49 }).path).toBe("offseason");
  });
  it("pitcher the day after an outing gets the recovery flush", () => {
    const s = sel({ position: "Pitcher", isPitcher: true, outingSource: "schedule", phase: "in_season", pitcherStartedYesterday: true, hoursToNearestGame: 20 });
    expect(s.path).toBe("pitcher_after_start");
    expect(s.templateId).toBe("cond.recovery_flush");
    expect(s.slugs).toEqual(["rc_easy_flush", "rc_long_reach_walk"]);
  });
  it("tournament day (not a game day) stays light", () => {
    const s = sel({ isTournamentDay: true });
    expect(s.path).toBe("tournament");
    expect(s.templateId).toBe("cond.tournament_day");
    expect(s.slugs).toHaveLength(1);
  });
  it("returning after time off outranks everything", () => {
    const s = sel({ returningAfterGap: true, isTournamentDay: true, pitcherStartedYesterday: true });
    expect(s.path).toBe("return_to_conditioning");
    expect(s.templateId).toBe("cond.return_to_conditioning");
    expect(s.slugs).toHaveLength(1);
  });
});

describe("check-ins and the recovery governor dial it down", () => {
  for (const r of ["sleep", "cns", "soreness", "governor"]) {
    it(`${r} → hard sprint swapped for an easy flush, count held`, () => {
      const s = sel({ dialDownReasons: [r] });
      expect(s.slugs).toHaveLength(2);
      expect(s.dialedDown).toBe(true);
      expect(s.why).toMatch(r === "governor" ? /lighter day/ : /go easier today/);
      expect(s.slugs).toEqual(["rc_easy_flush", "bases_home_2nd"]);
    });
  }
  it("single-movement days are not marked dialed down twice", () => {
    expect(sel({ hoursToNearestGame: 20, dialDownReasons: ["sleep"] }).dialedDown).toBe(false);
  });
});

describe("fallbacks", () => {
  it("unknown season → pre-Stage-1 pair, flagged and explained", () => {
    const s = sel({ phase: null });
    expect(s.fallback).toBe(true);
    expect(s.slugs).toEqual(["inning_restart_sim_bb", "mif_turn_and_fire"]);
    expect(s.why).toMatch(/season dates/);
  });
  it("default-sourced phase is treated as unknown", () => {
    expect(conditioningPhaseFrom("os_q1", "default")).toBeNull();
    expect(conditioningPhaseFrom("os_q2", "date_window")).toBe("offseason");
    expect(conditioningPhaseFrom("os_q4", "stored")).toBe("preseason");
    expect(conditioningPhaseFrom("in_season", "manual")).toBe("in_season");
  });
  it("missing position uses the existing default drill", () => {
    expect(sel({ position: null, phase: "preseason" }).slugs[1]).toBe("bases_1st_3rd");
  });
  it("no logs = no evidence of a gap", () => {
    expect(isReturningAfterGap([], "2026-10-05")).toBe(false);
    expect(isReturningAfterGap(["2026-09-20"], "2026-10-05")).toBe(true);
    expect(isReturningAfterGap(["2026-09-20", "2026-10-02"], "2026-10-05")).toBe(false);
  });
});

describe("shape and voice guarantees", () => {
  const all: Partial<ConditioningSelectionInput>[] = [
    {}, { phase: "preseason" }, { phase: "in_season" }, { phase: null }, { hoursToNearestGame: 10 },
    { isTournamentDay: true }, { pitcherStartedYesterday: true, position: "P" }, { returningAfterGap: true },
    { dialDownReasons: ["sleep"] }, { sport: "softball", position: "C" }, { position: "OF" },
    { position: "IF", phase: "in_season" }, { position: "IF", hoursToNearestGame: 10 },
    { phase: "in_season", dialDownReasons: ["governor"] }, { phase: "preseason", dialDownReasons: ["soreness"] },
  ];
  it("never more than two movements, every slug exists, every template exists, no digits in copy", () => {
    for (const o of all) {
      const s = sel(o);
      expect(s.slugs.length).toBeGreaterThan(0);
      expect(s.slugs.length).toBeLessThanOrEqual(2);
      for (const slug of s.slugs) expect(CATALOG.has(slug)).toBe(true);
      expect(CONDITIONING_TEMPLATES[s.templateId]).toBeTruthy();
      expect(s.why).not.toMatch(/\d/);
      expect(s.why).not.toMatch(/load|volume|ramp|ceiling|governor|aerobic/i);
      // Certifier contract: >=1 non-sprint (aerobic) movement, <=1 sprint movement.
      expect(s.slugs.filter((x) => !ALACTIC.has(x)).length).toBeGreaterThanOrEqual(1);
      expect(s.slugs.filter((x) => ALACTIC.has(x)).length).toBeLessThanOrEqual(1);
    }
  });
  it("on/off switches are untouched in the generator", () => {
    const src = readFileSync("supabase/functions/wk-generate-daily/index.ts", "utf8");
    expect(src).toContain("if (!isGameDay && !isPostSeason && !conditioningSuppressed && !timelineToday.hold) {");
    expect((src.match(/push\("conditioning"/g) ?? []).length).toBe(1);
  });
});
