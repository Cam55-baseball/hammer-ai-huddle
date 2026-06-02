/**
 * RR-8 — validateLifeContextReference safety tests.
 */
import { describe, it, expect } from "vitest";
import { validateLifeContextReference } from "@/lib/runtime/relational/hammerMemory";

const okDraft = {
  utterance: "Looks like travel has been heavy lately.",
  citedEventIds: ["evt_1"],
  inferredConfidence: 0.5,
  safeguardingLockdown: false,
};

describe("validateLifeContextReference", () => {
  it("accepts a clean observational utterance", () => {
    expect(validateLifeContextReference(okDraft).valid).toBe(true);
  });

  it("rejects denylist tokens (diagnostic / profiling)", () => {
    const v = validateLifeContextReference({
      ...okDraft,
      utterance: "You seem burnout this week.",
    });
    expect(v.valid).toBe(false);
    expect(v.rejections).toContain("LIFE_CONTEXT_DENYLIST_HIT");
  });

  it("rejects empty citations (fabrication)", () => {
    const v = validateLifeContextReference({ ...okDraft, citedEventIds: [] });
    expect(v.rejections).toContain("FABRICATED_LIFE_CONTEXT_RECALL");
  });

  it("rejects confidence above 0.7 ceiling", () => {
    const v = validateLifeContextReference({ ...okDraft, inferredConfidence: 0.85 });
    expect(v.rejections).toContain("LIFE_CONTEXT_CONFIDENCE_EXCEEDED");
  });

  it("rejects when safeguarding lockdown is active", () => {
    const v = validateLifeContextReference({ ...okDraft, safeguardingLockdown: true });
    expect(v.rejections).toContain("LIFE_CONTEXT_UNDER_SAFEGUARDING");
  });
});
