import { expect, it } from "vitest";
import { legacyDrillLogSpec } from "./legacyDrillLog";
it("shoulder circles never request reps per leg", () => {
  expect(legacyDrillLogSpec("warmup", "Shoulder circles", "10 per side").fields[0]).toMatchObject({ key: "reps", label: "Reps per arm", prefill: 10 });
});
it("separates explicit legs, sides, arms and directions without changing counts", () => {
  for (const [dose, label] of [["10 per leg", "Reps per leg"], ["10 per side", "Reps per side"], ["10 per arm", "Reps per arm"], ["10 reps each direction", "Reps each direction"]]) {
    expect(legacyDrillLogSpec("warmup", "Controlled movement", dose).fields[0]).toMatchObject({ label, prefill: 10 });
  }
});