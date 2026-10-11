import { describe, expect, it } from "vitest";
import catalog from "@/test/fixtures/wkCatalogRules.json";
import { jumpMeasure, measureTypeFor } from "./measureType";
import { inlineLogSpec } from "@/components/hammer/logging/InlinePrescriptionLog";
import type { WkRx } from "@/hooks/useWkDailyPrescriptions";

const rx = (over: Partial<WkRx>): WkRx => ({
  id: "r", movement_slug: "", movement_name: "", slot: "warmup", sets: 2, reps: 1,
  total_reps: null, distance_feet: null, duration_seconds: 20, dosage_unit: "seconds", ...over,
} as unknown as WkRx);

describe("owner rule: a jump never logs time", () => {
  it("the warm-up broad jump primer logs distance, even with a seconds dose", () => {
    const spec = inlineLogSpec(rx({ movement_slug: "wu_broad_jump_prep", movement_name: "Broad jump — 60% intent primer" }));
    expect(spec.fields.map((f) => f.key)).toEqual(["distance"]);
    expect(measureTypeFor({ slug: "wu_broad_jump_prep", dosage_unit: "seconds" })).toBe("jump_distance");
  });

  it.each([
    ["gap_lateral_bound_stick", "jump_distance"],
    ["sp_singleleg_bound_same", "jump_distance"],
    ["sp_singleleg_bound_alt", "jump_distance"],
    ["sp_skater_bound_dist", "jump_distance"],
    ["straight_leg_bound", "jump_distance"],
    ["triple_broad_jump", "jump_distance"],
    ["seated_broad_jump", "jump_distance"],
    ["gap_vertical_jump_reach_bw", "jump_height"],
    ["seated_vertical_jump", "jump_height"],
  ])("%s logs %s", (slug, type) => {
    expect(jumpMeasure(slug)).toBe(type);
    for (const slot of ["warmup", "speed", "conditioning", "supplemental"]) {
      const keys = inlineLogSpec(rx({ movement_slug: slug, slot } as Partial<WkRx>)).fields.map((f) => f.key);
      expect(keys).not.toContain("time");
    }
  });

  it("no catalog jump resolves to a time field in any slot or unit", () => {
    const bad: string[] = [];
    for (const row of catalog as { slug: string }[]) {
      if (!jumpMeasure(row.slug)) continue;
      for (const unit of ["seconds", "minutes", "reps", "feet"]) {
        const keys = inlineLogSpec(rx({ movement_slug: row.slug, dosage_unit: unit })).fields.map((f) => f.key);
        if (keys.includes("time")) bad.push(`${row.slug}:${unit}`);
        const t = measureTypeFor({ slug: row.slug, dosage_unit: unit });
        if (t === "duration" || t === "hold_seconds" || t === "sprint_time") bad.push(`${row.slug}:${unit}:${t}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
