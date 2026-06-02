/**
 * RR-5 — narrative reference legality + emitter legality tests.
 *
 * Pure validators — no I/O.
 */
import { describe, it, expect } from "vitest";
import {
  validateNarrativeReference,
  assertNarrativeReferenceLegality,
} from "@/lib/runtime/relational/hammerMemory";

describe("validateNarrativeReference — RR-5 Hammer gate", () => {
  const baseDraft = {
    utterance: "You mentioned first bullpen on Jan 1.",
    citedEventIds: ["n1"],
    inferredConfidence: 0.5,
    safeguardingLockdown: false,
  };

  it("accepts cited, calm, low-confidence references", () => {
    expect(validateNarrativeReference(baseDraft).valid).toBe(true);
  });

  it("rejects fabricated recall (no cited events)", () => {
    const r = validateNarrativeReference({ ...baseDraft, citedEventIds: [] });
    expect(r.valid).toBe(false);
    expect(r.rejections).toContain("FABRICATED_NARRATIVE_RECALL");
  });

  it("rejects denylist tokens (destiny / diagnosis / identity-locking)", () => {
    for (const utterance of [
      "You always sabotage yourself.",
      "You are becoming mentally fragile.",
      "You will never recover.",
      "You seem depressed.",
    ]) {
      const r = validateNarrativeReference({ ...baseDraft, utterance });
      expect(r.valid).toBe(false);
      expect(r.rejections).toContain("NARRATIVE_DENYLIST_HIT");
    }
  });

  it("rejects inferred confidence above the 0.7 ceiling", () => {
    const r = validateNarrativeReference({ ...baseDraft, inferredConfidence: 0.95 });
    expect(r.valid).toBe(false);
    expect(r.rejections).toContain("NARRATIVE_CONFIDENCE_EXCEEDED");
  });

  it("rejects emission under safeguarding lockdown", () => {
    const r = validateNarrativeReference({ ...baseDraft, safeguardingLockdown: true });
    expect(r.valid).toBe(false);
    expect(r.rejections).toContain("NARRATIVE_UNDER_SAFEGUARDING");
  });

  it("assert throws constitutional error", () => {
    expect(() =>
      assertNarrativeReferenceLegality({ ...baseDraft, citedEventIds: [] }),
    ).toThrow(/NARRATIVE_REFERENCE_CONSTITUTIONALLY_ILLEGAL/);
  });
});
