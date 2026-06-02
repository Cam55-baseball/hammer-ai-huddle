/**
 * RR-6 Wave 1 — injury reference legality + three-way arbitration.
 */
import { describe, it, expect } from "vitest";
import {
  validateInjuryReference,
  arbitrateMemoryCallback,
} from "@/lib/runtime/relational/hammerMemory";

const okDraft = {
  utterance: "Recovery has been part of your recent routine.",
  citedEventIds: ["ir_ref_1"],
  inferredConfidence: 0.5,
  safeguardingLockdown: false,
};

describe("validateInjuryReference", () => {
  it("accepts a clean observational utterance", () => {
    expect(validateInjuryReference(okDraft).valid).toBe(true);
  });

  it("rejects diagnostic / prognostic denylist tokens", () => {
    const v = validateInjuryReference({
      ...okDraft,
      utterance: "You are fully healed and safe to return.",
    });
    expect(v.valid).toBe(false);
    expect(v.rejections).toContain("INJURY_DENYLIST_HIT");
  });

  it("rejects empty citations (fabrication)", () => {
    expect(
      validateInjuryReference({ ...okDraft, citedEventIds: [] }).rejections,
    ).toContain("FABRICATED_INJURY_RECALL");
  });

  it("rejects confidence above 0.7 ceiling", () => {
    expect(
      validateInjuryReference({ ...okDraft, inferredConfidence: 0.85 })
        .rejections,
    ).toContain("INJURY_CONFIDENCE_EXCEEDED");
  });

  it("rejects when safeguarding lockdown is active", () => {
    expect(
      validateInjuryReference({ ...okDraft, safeguardingLockdown: true })
        .rejections,
    ).toContain("INJURY_UNDER_SAFEGUARDING");
  });
});

describe("arbitrateMemoryCallback — RR-5 / RR-8 / RR-6 three-way", () => {
  const n = {
    event_id: "n1",
    occurred_at: "2026-06-10T10:00:00Z",
    topic_tag: "a",
    kind: "memory_anchor",
  };
  const l = {
    event_id: "l1",
    occurred_at: "2026-06-10T11:00:00Z",
    topic_tag: "b",
    category: "travel_load",
  };
  const i = {
    event_id: "i1",
    occurred_at: "2026-06-10T12:00:00Z",
    topic_tag: "c",
    phase: "recovery_checkpoint",
  };

  it("safeguarding suppresses all three", () => {
    expect(
      arbitrateMemoryCallback({
        narrative: n,
        lifeContext: l,
        injury: i,
        safeguardingLockdown: true,
      }).kind,
    ).toBe("none");
  });

  it("newest occurred_at wins across all three", () => {
    const out = arbitrateMemoryCallback({
      narrative: n,
      lifeContext: l,
      injury: i,
      safeguardingLockdown: false,
    });
    expect(out.kind).toBe("injury_continuity");
  });

  it("life-context wins over older injury", () => {
    const out = arbitrateMemoryCallback({
      narrative: null,
      lifeContext: { ...l, occurred_at: "2026-06-10T13:00:00Z" },
      injury: i,
      safeguardingLockdown: false,
    });
    expect(out.kind).toBe("life_context");
  });

  it("fixed kind ordering for absolute ties (narrative < life_context < injury)", () => {
    const t = "2026-06-10T10:00:00Z";
    const out = arbitrateMemoryCallback({
      narrative: { ...n, occurred_at: t, topic_tag: "x" },
      lifeContext: { ...l, occurred_at: t, topic_tag: "x" },
      injury: { ...i, occurred_at: t, topic_tag: "x" },
      safeguardingLockdown: false,
    });
    expect(out.kind).toBe("narrative");
  });

  it("none when no candidates present", () => {
    expect(
      arbitrateMemoryCallback({
        narrative: null,
        lifeContext: null,
        injury: null,
        safeguardingLockdown: false,
      }).kind,
    ).toBe("none");
  });
});
