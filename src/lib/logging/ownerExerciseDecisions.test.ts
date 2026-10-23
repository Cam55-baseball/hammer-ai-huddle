import { describe, expect, it } from "vitest";
import { measureTypeFor, fieldsForMeasure, displayDistance, storeDistance } from "./measureType";
import { inlineLogSpec } from "@/components/hammer/logging/InlinePrescriptionLog";
import { resolveTemplate } from "@/components/hammer/logging/logTemplates";
import { buildExerciseLogRow } from "./writeExerciseLog";
import type { WkRx } from "@/hooks/useWkDailyPrescriptions";

describe("owner October 23 all-B measurement decisions", () => {
  it.each([
    ["walking_lunge", "reps_per_leg", "reps"],
    ["lift_rfess_pallof", "press_reps", "reps"],
    ["lift_banded_lateral_squat_walk", "steps_each_way", "steps"],
    ["lift_elephant_walk", "steps", "steps"],
    ["lift_farmer_toe_walk", "carry_distance", "distance"],
  ])("%s preserves its chosen quantity on both log paths", (slug, measure, key) => {
    const rx = { movement_slug: slug, slot: "lift", sets: 2, reps: 8, dosage_unit: "reps", distance_feet: 45 } as WkRx;
    expect(measureTypeFor({ slug, dosage_unit: "seconds" })).toBe(measure);
    expect(fieldsForMeasure(measureTypeFor({ slug })).map(f => f.key)).toEqual([key]);
    expect(inlineLogSpec(rx).fields.map(f => f.key)).toEqual([key]);
    expect(inlineLogSpec(rx).rows).toBe(2);
    expect(resolveTemplate(rx).fields.map(f => f.key)).toEqual([key]);
    const timeDose = { ...rx, reps: 30, dosage_unit: "seconds", distance_feet: null };
    expect(inlineLogSpec(timeDose).fields[0].prefill).toBeNull();
    expect(resolveTemplate(timeDose).fields[0].prefillFromRx?.(timeDose)).toBeNull();
  });
  it("15 yards enters and reloads as 15 yards while canonical distance stays 45 feet", () => {
    expect(storeDistance("15", "yd")).toBe("45");
    expect(displayDistance("45", "yd")).toBe("15");
    expect(storeDistance("", "yd")).toBe("");
    const row = buildExerciseLogRow("test", { prescription_id: "carry", plan_date: "2026-10-23", movement_slug: "lift_farmer_toe_walk", rounds: [{ distance: Number(storeDistance("15", "yd")) }] });
    expect(row.distance_feet_completed).toBe(45);
    expect(displayDistance(String(row.metrics.rounds[0].distance), "yd")).toBe("15");
  });
});