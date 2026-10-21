import { webcrypto } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { requireMatchedSwapVisit, swapCatalogFingerprint } from "../../../supabase/functions/_shared/planSwap/visit";
const savedContext = { slot: "lift", phase: "os_q1", sequence_order: 1, sequence_role: "compound_lower",
  cns_cost: 2, cns_clamped: false, density_target_seconds: 180, intensity_mode: "intent", rir_low: 2, rir_high: 3,
  intent_tag: "strength", execution_note: null, per_side: true, open_ended: false, set_range_max: null,
  adaptation: null, asymmetry_rule: null, engine: "wic", generator_version: "saved", rationale: null,
  cue_ids: null, validator_report: null, why_v2: null,
  why_payload: { cue: "Original", rest_seconds: 180, power_primer: { rest_s: 180 } } };
afterEach(() => vi.unstubAllGlobals());

const rx = { ...savedContext, id: "rx", user_id: "athlete", plan_date: "2026-10-21",
  movement_slug: "source", movement_name: "Original", status: "planned", updated_at: "2026-10-21T16:00:00Z",
  sets: 3, reps: 10, total_reps: 30, dosage_unit: "reps", duration_seconds: null,
  distance_feet: null, load_pct: null, tempo: null, substituted_from_slug: null, substitution_reason: null };
const check = (fresh: unknown, expected: unknown = rx) => requireMatchedSwapVisit(expected, fresh, "athlete", "rx", "2026-10-21");

describe("server Swap visit binding", () => {
  it("accepts the exact self-owned unmarked 3 sets of 10 saved reps", () => {
    expect(() => check(structuredClone(rx))).not.toThrow();
  });
  it("refuses another player, date, row and marked work", () => {
    for (const patch of [{ user_id: "other" }, { plan_date: "2026-10-20" }, { id: "other" }, { status: "done" }]) {
      expect(() => check({ ...rx, ...patch })).toThrow();
    }
  });
  it("refuses changed dose, rest and first receipt even without a timestamp change", () => {
    for (const patch of [{ reps: 12 }, { movement_slug: "other" }, { substitution_reason: "other" },
      { why_payload: { ...rx.why_payload, rest_seconds: 30 } }, { sequence_order: 2 }]) {
      expect(() => check({ ...rx, ...patch })).toThrow();
    }
  });
  it("cannot accept omitted or malformed saved context", () => {
    const { load_pct, ...missing } = rx;
    expect(load_pct).toBeNull();
    expect(() => check(rx, missing)).toThrow();
    expect(() => check({ ...rx, updated_at: "invalid" })).toThrow();
  });
  it("pins source and family metadata while ignoring JSON and row ordering", async () => {
    vi.stubGlobal("crypto", webcrypto);
    const source = { slug: "source", primary_adaptation: "timing", equipment_requirements: ["machine"] };
    const a = { slug: "a", cns_cost: 1 }, b = { slug: "b", cns_cost: 2 };
    const hash = await swapCatalogFingerprint(source, [a, b]);
    expect(await swapCatalogFingerprint(source, [b, { cns_cost: 1, slug: "a" }])).toBe(hash);
    expect(await swapCatalogFingerprint({ ...source, primary_adaptation: "power" }, [a, b])).not.toBe(hash);
    expect(await swapCatalogFingerprint(source, [{ ...a, cns_cost: 3 }, b])).not.toBe(hash);
  });
});