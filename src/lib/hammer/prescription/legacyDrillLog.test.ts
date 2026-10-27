import { describe, expect, it } from "vitest";
import { legacyDrillLogSpec } from "./legacyDrillLog";

describe("legacy drill visible log rows", () => {
  it("preserves declared warm-up repetitions, contacts and per-leg counts", () => {
    expect(legacyDrillLogSpec("warmup", "Hip switches", "8 per side").fields).toEqual([{ key: "reps", label: "Reps per side", prefill: 8 }]);
    expect(legacyDrillLogSpec("warmup", "Pogo", "3 x 12 contacts").fields).toEqual([{ key: "reps", label: "Contacts", prefill: 12 }]);
    expect(legacyDrillLogSpec("warmup", "Lateral walk", "2 x 10 steps each way").fields).toEqual([{ key: "reps", label: "Steps each way", prefill: 10 }]);
  });
  it("never uses rest duration as a hitting activity target", () => {
    expect(legacyDrillLogSpec("hitting", "Tee swings", "2 x 12 swings; rest 45 seconds")).toMatchObject({ rows: 2, fields: [{ key: "reps", prefill: 12 }] });
  });
  it("preserves all declared duration rounds and hundredths", () => {
    expect(legacyDrillLogSpec("warmup", "Hold", "3 rounds of 1.47 seconds")).toMatchObject({ rows: 3, fields: [{ key: "time", prefill: 1.47 }] });
  });
  it("keeps a catcher's stated pop-time target instead of converting it into throws", () => {
    expect(legacyDrillLogSpec("defense", "Pop-time to 2B", "3 x 1 rep; target ≤ 1.9s")).toMatchObject({ rows: 3, fields: [{ key: "time", unit: "ss.hh", prefill: 1.9 }] });
  });
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
  it("throwing-card band prep records reps rather than inventing arm throws", () => {
    expect(legacyDrillLogSpec("throwing", "Band series — ER / IR / scap pulls / retractions", "ER 2x12, IR 2x12, scap pulls 2x12, retractions 2x10")).toEqual({ rows: 2, completion: false, fields: [
      { key: "reps_0", label: "er reps", prefill: 12 }, { key: "reps_1", label: "ir reps", prefill: 12 }, { key: "reps_2", label: "scap pulls reps", prefill: 12 }, { key: "reps_3", label: "retractions reps", prefill: 10 },
    ] });
    expect(legacyDrillLogSpec("pitching", "Band activation series", "2x10").fields[0].key).toBe("reps");
  });
  it("softball activation preserves each direction and every separate rep target", () => {
    expect(legacyDrillLogSpec("pitching", "Windmill-specific band prep — circle path activation", "hip-to-release path 2x10 each direction, ER 2x12, IR 2x12, lat pull-through 2x10")).toMatchObject({ rows: 2, fields: [
      { key: "reps_0", label: "hip-to-release path · each direction reps", prefill: 10 }, { key: "reps_1", prefill: 12 }, { key: "reps_2", prefill: 12 }, { key: "reps_3", prefill: 10 },
    ] });
  });
  it("uses the saved recovery dose, not the catalog's usual two sets", () => {
    expect(legacyDrillLogSpec("throwing", "Band series", "ER 1x12, IR 1x12, retractions 1x10")).toMatchObject({ rows: 1, fields: [{ prefill: 12 }, { prefill: 12 }, { prefill: 10 }] });
  });

  it("times warm-up and recovery work in seconds, never decimal minutes", () => {
    expect(legacyDrillLogSpec("warmup", "Tissue prep", "5 minutes total")).toEqual({
      rows: 1, completion: true, fields: [{ key: "time", label: "Time", unit: "s", prefill: 300 }],
    });
  });
  it('logs the actual abbreviated recovery targets in seconds', () => {
    expect(legacyDrillLogSpec('recovery', 'Evening breathing', '10 min').fields).toEqual([{ key: 'time', label: 'Time', unit: 's', prefill: 600 }]);
    expect(legacyDrillLogSpec('recovery', 'Mobility + foam roll', '15 min full body').fields).toEqual([{ key: 'time', label: 'Time', unit: 's', prefill: 900 }]);
  });

  it("keeps a one-by-one drill visible", () => {
    expect(legacyDrillLogSpec("defense", "Bunt read", "1 x 1 rep")).toEqual({
      rows: 1, completion: false, fields: [{ key: "reps", label: "Reps", prefill: 1 }],
    });
  });
});