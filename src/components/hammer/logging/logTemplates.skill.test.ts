import { describe, expect, it } from "vitest";
import { resolveTemplate } from "./logTemplates";
import type { WkRx } from "@/hooks/useWkDailyPrescriptions";

const rx = (over: Partial<WkRx>): WkRx => ({
  id: "r1", movement_slug: "", movement_name: "", slot: "skill",
  sets: 3, reps: 5, total_reps: null, distance_feet: null,
  duration_seconds: null, dosage_unit: null, sequence_role: null, ...over,
} as unknown as WkRx);

describe("resolveTemplate — skill position logging (Round 3 F)", () => {
  it("catcher pop time logs ss.hh per throw", () => {
    const t = resolveTemplate(rx({ movement_slug: "catcher_pop_time" }));
    expect(t.id).toBe("catcher_pop");
    expect(t.fields[0]).toMatchObject({ key: "time", unit: "ss.hh" });
  });

  it("baserunning logs time at a distance plus reaction/jump", () => {
    const t = resolveTemplate(rx({ movement_slug: "home_to_first", distance_feet: 90 }));
    expect(t.id).toBe("baserunning_timed");
    expect(t.fields.map((f) => f.key)).toEqual(["distance", "time", "jump"]);
    expect(resolveTemplate(rx({ movement_slug: "steal_jump_2b" })).id).toBe("baserunning_timed");
  });

  it("fielding logs reps, clean plays and throws (arm total)", () => {
    const t = resolveTemplate(rx({ movement_slug: "infield_ground_ball" }));
    expect(t.id).toBe("fielding_reps");
    expect(t.fields.map((f) => f.key)).toEqual(["reps", "clean", "throws"]);
  });

  it("hitting keeps swings + quality contact + measured bat speed / exit velo", () => {
    const tee = resolveTemplate(rx({ slot: "bat_speed", movement_slug: "tee_work" }));
    expect(tee.fields.map((f) => f.key)).toEqual(["contacts", "bat_speed"]);
    const live = resolveTemplate(rx({ slot: "bat_speed", movement_slug: "front_toss_round" }));
    expect(live.fields.map((f) => f.key)).toEqual(["contacts", "exit_velo", "bat_speed"]);
  });

  it("pitching keeps pitch count, strikes and velo", () => {
    const pen = resolveTemplate(rx({ movement_slug: "bullpen", dosage_unit: "throws" }));
    expect(pen.id).toBe("bullpen_pitching");
    expect(pen.fields.map((f) => f.key)).toContain("pitches");
    expect(pen.fields.map((f) => f.key)).toContain("strikes");
    expect(pen.fields.map((f) => f.key)).toContain("peak_velo");
    const outing = resolveTemplate(rx({ movement_slug: "outing_start" }));
    expect(outing.id).toBe("pitching_outing");
  });

  it("ordinary lifts are unaffected by the new rules", () => {
    expect(resolveTemplate(rx({ slot: "lift", movement_slug: "bb_back_squat" })).id).toBe("barbell_lift");
    expect(resolveTemplate(rx({ slot: "speed", movement_slug: "60_yd_sprint" })).id).toBe("sprint_timed");
  });

  it.each([
    { movement_slug: "isometric_hold", slot: "lift", dosage_unit: "seconds" },
    { movement_slug: "farmer_carry", slot: "lift" },
    { movement_slug: "sled_push", slot: "speed" },
    { movement_slug: "60_yd_sprint", slot: "speed" },
    { movement_slug: "home_to_first", slot: "speed" },
    { movement_slug: "catcher_pop_time", slot: "cross_sport" },
    { movement_slug: "breathwork", slot: "cross_sport" },
  ] satisfies Partial<WkRx>[])("$movement_slug accepts hundredths for every timed field", prescription => {
    const template = resolveTemplate(rx(prescription));
    const times = template.fields.filter(field => field.kind === "time");
    expect(times.length).toBeGreaterThan(0);
    for (const field of times) expect(field.step).toBe(0.01);
  });
});
