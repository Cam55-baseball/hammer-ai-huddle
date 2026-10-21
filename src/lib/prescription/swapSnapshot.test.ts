import { describe, expect, it } from "vitest";
import { requireSwapSavedContext, unchangedSwapContext, type SwapSavedContext } from "./swapSnapshot";

export const savedContext: SwapSavedContext = { slot: "lift", phase: "os_q1", sequence_order: 1, sequence_role: "compound_lower",
  cns_cost: 2, cns_clamped: false, density_target_seconds: 180, intensity_mode: "intent", rir_low: 2, rir_high: 3,
  intent_tag: "strength", execution_note: null, per_side: true, open_ended: false, set_range_max: null,
  adaptation: null, asymmetry_rule: null, engine: "wic", generator_version: "saved", rationale: null,
  cue_ids: null, validator_report: null, why_v2: null,
  why_payload: { cue: "Original", rest_seconds: 180, power_primer: { rest_s: 180 } } };
describe("complete unchanged Swap context", () => {
  it("retains the 180-second rest and primer rest while permitting only cue and receipt changes", () => {
    expect(unchangedSwapContext(savedContext, { ...savedContext, why_payload: {
      power_primer: { rest_s: 180 }, rest_seconds: 180, cue: "Replacement", athlete_substitution: { from_slug: "original" } } })).toBe(true);
    for (const why_payload of [{ ...savedContext.why_payload, rest_seconds: 30 },
      { ...savedContext.why_payload, power_primer: { rest_s: 60 } }]) {
      expect(unchangedSwapContext(savedContext, { ...savedContext, why_payload })).toBe(false);
    }
  });
  it("rejects changed intensity, safety cost, placement, side and execution context", () => {
    for (const patch of [{ density_target_seconds: 30 }, { intensity_mode: "max" }, { cns_cost: 3 },
      { rir_low: 1 }, { phase: "in_season" }, { slot: "speed" }, { sequence_order: 2 }, { per_side: false },
      { execution_note: "Go harder" }, { why_v2: { rule: "different" } }]) {
      expect(unchangedSwapContext(savedContext, { ...savedContext, ...patch })).toBe(false);
    }
  });
  it("missing columns, undefined JSON and NaN cannot masquerade as unchanged nulls", () => {
    const { rir_low, ...missing } = savedContext;
    expect(rir_low).toBe(2);
    for (const incomplete of [missing, { ...savedContext, density_target_seconds: Number.NaN },
      { ...savedContext, why_payload: { rest_seconds: undefined } }]) {
      expect(() => requireSwapSavedContext(incomplete as SwapSavedContext)).toThrow(/incomplete/);
    }
  });
});