import { describe, expect, it } from "vitest";
import { partitionCoachRows } from "@/lib/coachRx/planRows";

describe("canonical coach row partition", () => {
  it("retains every category exactly once with its original logging identity", () => {
    const categories = ["hitting", "pitching", "throwing", "fielding", "baserunning", "lift", "speed", "conditioning", "warmup", "mobility", "recovery", "vision"];
    const coach = categories.map((slot, i) => ({ id: `rx-${i}`, slot, why_payload: { coach_rx: `send-${i}` } }));
    const original = { id: "hammers", slot: "lift", why_payload: null };
    const result = partitionCoachRows([original, ...coach]);
    expect(result.hammers).toEqual([original]);
    expect(result.coach.map(row => row.slot)).toEqual(categories);
    result.coach.forEach((row, i) => expect(row).toBe(coach[i]));
  });
});