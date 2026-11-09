/**
 * Owner decisions Nov 9 (Release 0 follow-ups), three legacy bug fixes:
 *  (a) the plan builder reads body weight from weight_entries.weight_lbs (newest entry_date);
 *  (b) the readiness view reads Perceived Recovery on its real 1–10 scale;
 *  (c) physically impossible values are unknown, never used.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { latestWeightLb } from "../../../supabase/functions/_shared/wic/athleteContext";
import { canonicalize, physicallyPossible } from "../../../supabase/functions/_shared/ledger/metricDictionary";
import { calculateReadinessScore, RECOVERY_SCALE_MAX } from "@/components/elite-workout/readiness/ReadinessFromVault";

const checkin = (perceived_recovery: number | null) => ({
  sleep_quality: null, physical_readiness: null, perceived_recovery, pain_location: null, pain_scales: null,
  entry_date: "2026-11-09", created_at: "2026-11-09T12:00:00Z",
});

describe("(a) plan-builder body weight", () => {
  it("uses the newest weight_entries.weight_lbs over the profile weight", () => {
    expect(latestWeightLb({ weight_lbs: 182.5 }, { weight: "170" })).toBe(182.5);
  });
  it("falls back to the profile weight when there is no weight entry", () => {
    expect(latestWeightLb(null, { weight: "175 lbs" })).toBe(175);
  });
  it("an impossible entry is unknown, so the profile weight is used instead", () => {
    expect(latestWeightLb({ weight_lbs: 1734 }, { weight: "176" })).toBe(176);
  });
  it("no usable weight anywhere stays unknown (never a default)", () => {
    expect(Number.isNaN(latestWeightLb({ weight_lbs: 1734 }, {}))).toBe(true);
    expect(Number.isNaN(latestWeightLb(null, null))).toBe(true);
  });
  it("the weight read sorts by entry_date (weight_entries has no recorded_at column)", () => {
    const src = readFileSync("supabase/functions/wk-generate-daily/index.ts", "utf8");
    const line = src.split("\n").find((l) => l.includes('from("weight_entries")')) ?? "";
    expect(line).toContain('order("entry_date"');
    expect(line).not.toContain("recorded_at");
  });
});

describe("(b) readiness view recovery scale", () => {
  it("recovery is out of 10", () => expect(RECOVERY_SCALE_MAX).toBe(10));
  it("a 5 of 10 recovery scores 50, not 100", () => expect(calculateReadinessScore(checkin(5))).toBe(50));
  it("a 10 of 10 recovery scores 100", () => expect(calculateReadinessScore(checkin(10))).toBe(100));
});

describe("(c) impossible values are unknown", () => {
  const judge = (alias: string, v: number) => {
    const c = canonicalize(alias, v);
    return c ? physicallyPossible(c.key, c.value) : null;
  };
  it("the six parked values fail the physics check", () => {
    expect(judge("checkin.weight_lbs", 1734)).toBe(false);
    expect(judge("body.weight_lbs", 1734)).toBe(false);
    for (const v of [0.01, 0.04]) expect(judge("sl_broad_jump", v)).toBe(false);
    for (const v of [0.04, 0.26]) expect(judge("sl_lateral_broad_jump", v)).toBe(false);
  });
  it("normal values still pass", () => {
    expect(judge("body.weight_lbs", 180)).toBe(true);
    expect(judge("sl_broad_jump", 48)).toBe(true);
  });
  it("the ledger read path skips values that failed the physics check", () => {
    const sql = readFileSync("drizzle/migrations/0217_park_implausible_measurements.sql", "utf8");
    expect(sql).toMatch(/FUNCTION public\.ledger_project_row[\s\S]*AND o\.physics_ok IS NOT FALSE/);
  });
});
