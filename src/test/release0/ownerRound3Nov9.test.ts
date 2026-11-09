/**
 * Owner decisions Nov 9 (round 3):
 *  1. the four old six-week results connect to the ledger (opinions never converted);
 *  2. impossible typed numbers are blocked on every entry screen, using the ONE dictionary;
 *  3. recovery: missing = unknown, 4 or below (of 10) = poor.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { canonicalize, metricDef, sixWeekAlias, ALIASES } from "../../../supabase/functions/_shared/ledger/metricDictionary";
import { judgeMeasurement, type DictRow } from "../../../supabase/functions/_shared/ledger/saveRules";
import { isImpossibleEntry, IMPOSSIBLE_NUMBER_MESSAGE } from "@/lib/ledger/entryCheck";
import { THROWING_METRICS, defaultUnitFor as throwUnit } from "@/lib/throwing/reps";
import { defaultUnitFor as catchUnit } from "@/lib/catching/reps";
import { BASERUNNING_SPLIT_EVENTS, defaultUnitFor as runUnit } from "@/lib/baserunning/splits";
import { COMBINE_EVENTS } from "@/lib/combine/events";
import { BATTERY } from "@/lib/progress/testBattery";
import { isPoorRecovery, POOR_RECOVERY_MAX } from "@/lib/readiness/recoveryScale";

describe("1. the four old six-week results", () => {
  it("velocity on a THROWING test is position throw velocity; on a PITCHING test, pitch velocity", () => {
    expect(canonicalize(sixWeekAlias("velocity", "throwing"), 75)?.key).toBe("position_throw_velo_mph");
    expect(canonicalize(sixWeekAlias("velocity", "pitching"), 75)?.key).toBe("pitch_velo_mph");
  });
  it("velocity on any other test stays unknown (never guessed)", () => {
    expect(canonicalize(sixWeekAlias("velocity", "hitting"), 75)).toBeNull();
    expect(canonicalize(sixWeekAlias("velocity", null), 75)).toBeNull();
  });
  it("other six-week keys are unchanged by the test type", () => {
    expect(sixWeekAlias("exit_velocity", "throwing")).toBe("six_week.exit_velocity");
    expect(sixWeekAlias("sl_broad_jump_left", "speed")).toBe("six_week.sl_broad_jump");
  });
  it("arm health, command and accuracy stay 0–10 opinions, never converted", () => {
    for (const [legacy, key, v] of [["arm_health", "arm_feel_self_0_10", 5], ["command_score", "command_self_0_10", 3], ["accuracy_score", "accuracy_self_0_10", 6]] as const) {
      const c = canonicalize(`six_week.${legacy}`, v);
      expect(c?.key).toBe(key);
      expect(c?.value).toBe(v);
      const d = metricDef(key)!;
      expect(d.opinion).toBe(true);
      expect(d.neverGraded).toBe(true);
      expect(d.gtDevice).toBeNull();
      expect([d.physMin, d.physMax]).toEqual([0, 10]);
    }
    expect(metricDef("arm_feel_self_0_10")!.privacy).toBe("health");
  });
  it("the old 3/10 command is never read as a strike %", () => {
    expect(canonicalize("six_week.command_score", 3)?.key).not.toBe("strike_pct_20");
    expect(canonicalize("six_week.accuracy_score", 6)?.key).not.toBe("throw_target_pct_10");
  });
  it("the measurable versions exist with the owner's definitions", () => {
    const trom = metricDef("shoulder_trom_deficit_deg")!;
    expect([trom.physMin, trom.physMax, trom.gtTolerance, trom.higherIsBetter, trom.neverGraded]).toEqual([-30, 60, 5, false, true]);
    expect(trom.gtDevice).toBe("Goniometer");
    const strike = metricDef("strike_pct_20")!;
    expect([strike.unit, strike.physMin, strike.physMax, strike.sport]).toEqual(["pct", 0, 100, "both"]);
    const target = metricDef("throw_target_pct_10")!;
    expect([target.unit, target.physMin, target.physMax, target.sport]).toEqual(["pct", 0, 100, "both"]);
  });
  it("none of them is added to the six-week form", () => {
    const form = readFileSync("src/lib/assessment/positionBattery.ts", "utf8");
    for (const k of ["strike_pct_20", "throw_target_pct_10", "arm_feel_self_0_10", "shoulder_trom_deficit_deg"]) expect(form).not.toContain(k);
  });
  it("every alias points at a real dictionary key", () => {
    for (const a of ALIASES) expect(metricDef(a.key), a.alias).not.toBeNull();
  });
});

describe("2. impossible typed numbers are blocked (one dictionary, with units)", () => {
  it("uses the owner's exact message", () => {
    expect(IMPOSSIBLE_NUMBER_MESSAGE).toBe("That number doesn't look right — double-check it.");
  });
  it("blank or non-numbers are not judged here", () => {
    expect(isImpossibleEntry("body.weight_lbs", "")).toBe(false);
    expect(isImpossibleEntry("body.weight_lbs", null)).toBe(false);
    expect(isImpossibleEntry("no.such.metric", 99999)).toBe(false);
  });
  it("check-in weight (morning, pre-lift, night)", () => {
    expect(isImpossibleEntry("checkin.weight_lbs", "1734")).toBe(true);
    expect(isImpossibleEntry("checkin.weight_lbs", "176")).toBe(false);
  });
  it("weight log and body fat", () => {
    expect(isImpossibleEntry("body.weight_lbs", "1734")).toBe(true);
    expect(isImpossibleEntry("body.weight_lbs", "180")).toBe(false);
    expect(isImpossibleEntry("body.body_fat_percent", "95")).toBe(true);
    expect(isImpossibleEntry("body.body_fat_percent", "14")).toBe(false);
  });
  it("six-week tests convert inches before checking", () => {
    expect(isImpossibleEntry(sixWeekAlias("sl_broad_jump_left", "speed"), "0.04")).toBe(true);
    expect(isImpossibleEntry(sixWeekAlias("sl_broad_jump_left", "speed"), "48")).toBe(false);
    expect(isImpossibleEntry(sixWeekAlias("velocity", "throwing"), "300")).toBe(true);
  });
  it("game logs: pitch velocity, home to first, hang time, play time", () => {
    expect(isImpossibleEntry("game.pitch_velo", "150")).toBe(true);
    expect(isImpossibleEntry("game.pitch_velo", "82")).toBe(false);
    expect(isImpossibleEntry("game.home_to_first", "1.2")).toBe(true);
    expect(isImpossibleEntry("game.home_to_first", "4.3")).toBe(false);
    expect(isImpossibleEntry("game.hang_time", "60")).toBe(true);
    expect(isImpossibleEntry("game.play_time", "-1")).toBe(true);
  });
  it("practice logs: every throwing, catching and baserunning name resolves and is checked", () => {
    for (const m of THROWING_METRICS) expect(canonicalize(`throwing.${m}`, 1, throwUnit(m)), m).not.toBeNull();
    for (const m of ["pop_time_sec", "throw_velo_mph", "exchange_time_sec"] as const) expect(canonicalize(`catching.${m}`, 1, catchUnit(m)), m).not.toBeNull();
    for (const e of BASERUNNING_SPLIT_EVENTS) expect(canonicalize(`baserunning.${e}`, 1, runUnit(e)), e).not.toBeNull();
    expect(isImpossibleEntry("throwing.throw_velo_mph", "200", "mph")).toBe(true);
    expect(isImpossibleEntry("catching.pop_time_sec", "0.2", "sec")).toBe(true);
    expect(isImpossibleEntry("catching.pop_time_sec", "2.0", "sec")).toBe(false);
    expect(isImpossibleEntry("baserunning.sixty_yard_dash", "2", "sec")).toBe(true);
  });
  it("combine entries and the self-test card", () => {
    for (const e of COMBINE_EVENTS) expect(canonicalize(`combine.${e}`, 1), e).not.toBeNull();
    for (const t of BATTERY) expect(canonicalize(t.key, 1, t.unit), t.key).not.toBeNull();
    expect(isImpossibleEntry("combine.sixty_yard_dash" in {} ? "" : "combine.thirty_yard_dash", "1")).toBe(true);
    expect(isImpossibleEntry("test.broad_jump_in", "500", "in")).toBe(true);
    expect(isImpossibleEntry("test.broad_jump_in", "90", "in")).toBe(false);
  });
  it("Validation Lab device readings use the canonical key", () => {
    expect(isImpossibleEntry("cmj_height_cm", "300")).toBe(true);
    expect(isImpossibleEntry("cmj_height_cm", "45")).toBe(false);
  });
  it("ledger-save stays the backup: an impossible typed number is rejected", () => {
    const def: DictRow = { metric_key: "body_weight_lb", unit: "lb", physical_min: 40, physical_max: 500, required_fps: null, in_app_only: false, privacy_class: "training" };
    const ctx = { platform: "web" as const, movementConsentOn: false, movementConsentActive: false, attestOn: false, attested: false };
    expect(judgeMeasurement(def, { metric_key: "body_weight_lb", value: 1734, source_kind: "manual" }, ctx)).toMatchObject({ ok: false, reason: "physically_impossible" });
    expect(judgeMeasurement(def, { metric_key: "body_weight_lb", value: 180, source_kind: "manual" }, ctx)).toMatchObject({ ok: true });
  });
});

describe("3. recovery leftovers", () => {
  it("4 or below of 10 is poor; 5 is not", () => {
    expect(POOR_RECOVERY_MAX).toBe(4);
    expect(isPoorRecovery(4)).toBe(true);
    expect(isPoorRecovery(3)).toBe(true);
    expect(isPoorRecovery(5)).toBe(false);
  });
  it("a missing answer is unknown, never a default", () => {
    expect(isPoorRecovery(null)).toBeNull();
    expect(isPoorRecovery(undefined)).toBeNull();
  });
  it("the recovery hooks no longer default a missing answer to 3 or use the old 1–5 cutoff", () => {
    for (const f of ["src/hooks/useUnifiedDataSync.ts", "src/hooks/useWorkoutRecommendations.ts"]) {
      const src = readFileSync(f, "utf8");
      expect(src).not.toMatch(/perceived_recovery\s*(\|\||\?\?)\s*3/);
      expect(src).not.toMatch(/perceivedRecovery[^\n]*<=\s*2/);
      expect(src).toContain("POOR_RECOVERY_MAX");
    }
    const edge = readFileSync("supabase/functions/recommend-workout/index.ts", "utf8");
    expect(edge).not.toMatch(/perceivedRecovery[^\n]*<=\s*2/);
    expect(edge).not.toMatch(/perceivedRecovery[^\n]*\/5/);
  });
});
