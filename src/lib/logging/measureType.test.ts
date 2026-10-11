import { describe, expect, it } from "vitest";
import catalog from "@/test/fixtures/wkCatalogRules.json";
import { fieldsForMeasure, measureTypeFor, type MeasureType } from "./measureType";
import { inlineLogSpec } from "@/components/hammer/logging/InlinePrescriptionLog";
import type { WkRx } from "@/hooks/useWkDailyPrescriptions";

const VALID: MeasureType[] = [
  "weight_reps", "reps", "hold_seconds", "duration", "sprint_time",
  "jump_distance", "jump_height", "throws", "velocity", "bat_speed",
  "exit_velocity", "swing_count", "checkoff",
];

describe("measureTypeFor — every library exercise resolves", () => {
  it("resolves a valid measure type for every catalog slug (build fails otherwise)", () => {
    const unresolved: string[] = [];
    for (const row of catalog as { slug: string }[]) {
      const t = measureTypeFor({ slug: row.slug });
      if (!VALID.includes(t)) unresolved.push(row.slug);
      // Every type must render at least one entry field.
      if (fieldsForMeasure(t).length === 0) unresolved.push(`${row.slug}:no-fields`);
    }
    expect(unresolved).toEqual([]);
  });

  it("broad jump logs distance, never seconds", () => {
    expect(measureTypeFor({ slug: "broad_jump" })).toBe("jump_distance");
    expect(measureTypeFor({ slug: "standing_long_jump" })).toBe("jump_distance");
  });

  it("vertical jump logs height in inches", () => {
    expect(measureTypeFor({ slug: "vertical_jump" })).toBe("jump_height");
  });

  it("dry throws log a throw count (reps), never seconds", () => {
    expect(measureTypeFor({ slug: "dry_throws" })).toBe("throws");
    expect(measureTypeFor({ slug: "plyo_ball_throw" })).toBe("throws");
  });

  it("sprints log time at a distance", () => {
    expect(measureTypeFor({ slug: "30_yd_sprint" })).toBe("sprint_time");
    expect(measureTypeFor({ slug: "sprint_work" })).toBe("sprint_time");
  });

  it("check-off tasks resolve to checkoff", () => {
    expect(measureTypeFor({ slug: "hydrate_and_plan" })).toBe("checkoff");
    expect(measureTypeFor({ slug: "note_soreness_in_vault" })).toBe("checkoff");
  });
});

describe("inlineLogSpec — entry rows match the measure type", () => {
  const rx = (over: Partial<WkRx>): WkRx => ({
    id: "r1", movement_slug: "", movement_name: "", slot: "speed",
    sets: 3, reps: 1, total_reps: null, distance_feet: null,
    duration_seconds: null, dosage_unit: null, ...over,
  } as unknown as WkRx);

  it("broad jump renders jump-distance fields, not reps or seconds", () => {
    const spec = inlineLogSpec(rx({ movement_slug: "broad_jump", movement_name: "Broad Jump + Stick" }));
    expect(spec.fields.map((f) => f.key)).toEqual(["distance"]);
    expect(spec.fields[0].unit).toBe("ft + in");
  });

  it("vertical jump renders a height field in inches", () => {
    const spec = inlineLogSpec(rx({ movement_slug: "vertical_jump", movement_name: "Vertical Jump" }));
    expect(spec.fields.map((f) => f.key)).toEqual(["height"]);
    expect(spec.fields[0].unit).toBe("in");
  });

  it("other jumps still log counted reps", () => {
    const spec = inlineLogSpec(rx({ movement_slug: "pogo_hop", movement_name: "Pogo Hops", reps: 10 }));
    expect(spec.fields.map((f) => f.key)).toEqual(["reps"]);
  });

  it("dry throws render a throw count", () => {
    const spec = inlineLogSpec(rx({ movement_slug: "dry_throws", movement_name: "Dry Throws", sets: 2, reps: 5, total_reps: 10 }));
    expect(spec.fields.map((f) => f.key)).toEqual(["throws"]);
    expect(spec.rows).toBe(2);
  });
});
