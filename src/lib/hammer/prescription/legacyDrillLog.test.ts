import { describe, expect, it } from "vitest";
import { legacyDrillLogSpec } from "./legacyDrillLog";

describe("legacy drill visible log rows", () => {
  it("prefills every prescribed conditioning repetition and converts yards to feet", () => {
    expect(legacyDrillLogSpec("conditioning", "Tempo runs", "2 reps × 30 yd")).toEqual({
      rows: 2, completion: false, fields: [
        { key: "distance", label: "Distance", unit: "ft", prefill: 90 },
        { key: "time", label: "Time", unit: "s", prefill: null },
      ],
    });
  });

  it("uses throws only for throwing work", () => {
    expect(legacyDrillLogSpec("throwing", "Catch play", "2 x 12 throws")).toEqual({
      rows: 2, completion: false, fields: [{ key: "throws", label: "Throws", prefill: 12 }],
    });
  });

  it("times warm-up and recovery work in seconds, never decimal minutes", () => {
    expect(legacyDrillLogSpec("warmup", "Tissue prep", "5 minutes total")).toEqual({
      rows: 1, completion: true, fields: [{ key: "time", label: "Time", unit: "s", prefill: 300 }],
    });
  });

  it("keeps a one-by-one drill visible", () => {
    expect(legacyDrillLogSpec("defense", "Bunt read", "1 x 1 rep")).toEqual({
      rows: 1, completion: false, fields: [{ key: "reps", label: "Reps", prefill: 1 }],
    });
  });
});