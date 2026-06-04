/**
 * Wave 1 — C1 acceptance tests.
 * Asserts single-identity invariant, label shape, forbidden-term absence,
 * and byte-stable replay-determinism.
 */
import { describe, it, expect } from "vitest";
import { HAMMER_IDENTITY, getHammerIdentity } from "@/lib/hammer/identity";

const FORBIDDEN_USER_VISIBLE = [
  "Hammer State",
  "Hammer Readiness",
  "Hammer Score",
];

describe("Hammer identity resolver (C1)", () => {
  it("exposes exactly one canonical identity", () => {
    expect(getHammerIdentity()).toBe(HAMMER_IDENTITY);
    expect(getHammerIdentity()).toBe(getHammerIdentity());
  });

  it("has the canonical label shape", () => {
    const id = getHammerIdentity();
    expect(id.id).toBe("hammer");
    expect(id.voiceLabel).toBe("Hammer");
    expect(id.organismStateLabel).toBe("Organism State");
    expect(typeof id.brandLabel).toBe("string");
    expect(id.brandLabel.length).toBeGreaterThan(0);
    expect(typeof id.tagline).toBe("string");
  });

  it("contains zero forbidden user-visible terms in any returned label", () => {
    const id = getHammerIdentity();
    const labels = [id.voiceLabel, id.brandLabel, id.organismStateLabel, id.tagline];
    for (const label of labels) {
      for (const term of FORBIDDEN_USER_VISIBLE) {
        expect(label).not.toContain(term);
      }
    }
  });

  it("is frozen (no mutation possible)", () => {
    expect(Object.isFrozen(HAMMER_IDENTITY)).toBe(true);
  });

  it("returns byte-identical output across two cold invocations (replay determinism)", () => {
    const a = JSON.stringify(getHammerIdentity());
    const b = JSON.stringify(getHammerIdentity());
    expect(a).toBe(b);
  });
});
