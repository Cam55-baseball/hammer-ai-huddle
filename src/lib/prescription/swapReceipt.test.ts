import { describe, expect, it } from "vitest";
import { requireUnmarkedSwap, restoreSwapInstructions, swapOrigin } from "./swapReceipt";

const rx = { movement_slug: "original", movement_name: "Original exercise", substituted_from_slug: null,
  sets: 4, reps: 5, duration_seconds: null, distance_feet: null, total_reps: 20,
  dosage_unit: "reps", tempo: "3010", load_pct: 70, why_payload: { cue: "Original instructions" } };
describe("Swap preserves the first prescription", () => {
  it("second and third swaps keep the first identity, exact dose and instructions", () => {
    const origin = swapOrigin(rx);
    const second = swapOrigin({ ...rx, movement_slug: "second", movement_name: "Second",
      substituted_from_slug: "original", why_payload: { cue: "Second instructions", athlete_substitution: origin } });
    const third = swapOrigin({ ...rx, movement_slug: "third", substituted_from_slug: "original",
      why_payload: { cue: "Third instructions", athlete_substitution: second } });
    expect(third).toEqual(origin);
    expect(third.from_dose).toEqual({ sets: 4, reps: 5, duration_seconds: null, distance_feet: null,
      total_reps: 20, dosage_unit: "reps", tempo: "3010", load_pct: 70 });
    expect(restoreSwapInstructions({ cue: "Third", athlete_substitution: third, other: 1 }, third))
      .toEqual({ cue: "Original instructions", other: 1 });
  });
  it("Undo preserves a missing or explicitly null original cue instead of borrowing catalog instructions", () => {
    const missing = swapOrigin({ ...rx, why_payload: {} });
    expect(restoreSwapInstructions({ cue: "Replacement" }, missing)).toEqual({});
    const empty = swapOrigin({ ...rx, why_payload: { cue: null } });
    expect(restoreSwapInstructions({ cue: "Replacement" }, empty)).toEqual({ cue: null });
  });
  it("refuses a legacy chained receipt that does not name the original", () => {
    const origin = swapOrigin(rx);
    expect(() => swapOrigin({ ...rx, substituted_from_slug: "original", why_payload: {
      athlete_substitution: { ...origin, from_slug: "second" } } })).toThrow();
  });
  it("refuses incomplete original instructions rather than inventing them", () => {
    const { from_cue, ...incomplete } = swapOrigin(rx);
    expect(from_cue).toBe("Original instructions");
    expect(() => swapOrigin({ ...rx, substituted_from_slug: "original", why_payload: { athlete_substitution: incomplete } })).toThrow();
  });
  it("never changes a completed, skipped or missed exercise", () => {
    for (const status of ["completed", "skipped", "missed"]) expect(() => requireUnmarkedSwap(status)).toThrow();
    expect(() => requireUnmarkedSwap("planned")).not.toThrow();
    expect(() => requireUnmarkedSwap("pending")).not.toThrow();
  });
  it("a later generator dose cannot be overwritten by an older first-swap receipt", () => {
    const origin = swapOrigin(rx);
    for (const patch of [{ sets: 3 }, { reps: 6 }, { total_reps: 24 }, { duration_seconds: 60 },
      { distance_feet: 90 }, { tempo: "2010" }, { load_pct: 60 }, { dosage_unit: "seconds" }]) {
      expect(() => swapOrigin({ ...rx, ...patch, substituted_from_slug: "original",
        why_payload: { athlete_substitution: origin } })).toThrow(/work changed/);
    }
  });
  it("first receipts require all eight saved fields, not catalog defaults or missing data", () => {
    expect(() => swapOrigin({ ...rx, sets: Number.NaN })).toThrow(/dose is incomplete/);
  });
});