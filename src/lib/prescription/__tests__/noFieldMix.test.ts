import { describe, expect, it } from "vitest";
import { chooseNoFieldMix, type NoFieldInputs } from "../../../../supabase/functions/_shared/planSwap/noFieldMix";

const input: NoFieldInputs = { spaceYards: 15, hill: true, sled: false, band: false, treadmill: false, readiness: "ready", cnsLoad: 2, phase: "os_q1", goal: "acceleration", injuries: [], ageYears: 19, totalReps: 7 };
describe("deterministic no-field mix", () => {
  it("combines two speed items with exactly the original total reps", () => {
    const result = chooseNoFieldMix(input);
    expect(result.items.map(item => [item.slug, item.reps])).toEqual([["swap_short_acceleration", 4], ["swap_hill_acceleration", 3]]);
    expect(result.items.every(item => item.category === "speed" && item.intent === "acceleration")).toBe(true);
  });
  it("uses 1 minute per 10 yards for 10-15 yard accelerations", () => {
    expect(chooseNoFieldMix(input).items[0].restSeconds).toBe(120);
    expect(chooseNoFieldMix({ ...input, spaceYards: 10 }).items[0].restSeconds).toBe(60);
  });
  it("never relabels acceleration or tempo as max velocity", () => {
    expect(chooseNoFieldMix({ ...input, goal: "max_velocity" }).items).toEqual([]);
  });
  it("blocks speed work for stop, unknown readiness or heavy CNS load", () => {
    expect(chooseNoFieldMix({ ...input, readiness: "stop" }).items).toEqual([]);
    expect(chooseNoFieldMix({ ...input, readiness: null }).items).toEqual([]);
    expect(chooseNoFieldMix({ ...input, cnsLoad: 7 }).items).toEqual([]);
  });
  it("does not assume safe space or dismiss injury flags", () => {
    expect(chooseNoFieldMix({ ...input, spaceYards: null }).items).toEqual([]);
    expect(chooseNoFieldMix({ ...input, injuries: ["hamstring"] }).items).toEqual([]);
  });
  it("uses the available resisted option and never creates zero-rep items", () => {
    expect(chooseNoFieldMix({ ...input, hill: false, band: true }).items[1].slug).toBe("swap_band_acceleration");
    expect(chooseNoFieldMix({ ...input, totalReps: 1 }).items.map(item => item.reps)).toEqual([1]);
  });
});