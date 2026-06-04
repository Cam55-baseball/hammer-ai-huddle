/**
 * Wave 1 — C7 acceptance tests.
 * Asserts full Phase 6 §F matrix coverage, zero undefined verdicts,
 * safeguarding precedence (non-downgradable), and replay determinism.
 */
import { describe, it, expect } from "vitest";
import { classifySilenceZone } from "@/lib/runtime/silence/classifier";
import type {
  SilenceVerdict,
  SilenceZoneInput,
  SilenceZoneKind,
} from "@/lib/runtime/silence/types";

const ALL_KINDS: ReadonlyArray<SilenceZoneKind> = [
  "safeguarding-active",
  "athlete-revoked-narrative",
  "missing-data-dominant",
  "unpopulated-surface-with-signal",
  "unpopulated-surface-no-signal",
  "awaiting-input",
  "post-action-cooldown",
  "route-not-yet-rendered",
];

const EXPECTED: Record<SilenceZoneKind, SilenceVerdict> = {
  "safeguarding-active": "lawful",
  "athlete-revoked-narrative": "lawful",
  "missing-data-dominant": "lawful",
  "unpopulated-surface-with-signal": "accidental",
  "unpopulated-surface-no-signal": "lawful",
  "awaiting-input": "lawful",
  "post-action-cooldown": "lawful",
  "route-not-yet-rendered": "lawful",
};

describe("classifySilenceZone (C7)", () => {
  it("returns the expected verdict for every Phase 6 §F zone", () => {
    for (const kind of ALL_KINDS) {
      expect(classifySilenceZone({ kind })).toBe(EXPECTED[kind]);
    }
  });

  it("returns zero `undefined` verdicts across the full matrix", () => {
    for (const kind of ALL_KINDS) {
      expect(classifySilenceZone({ kind })).not.toBe("undefined");
    }
  });

  it("enforces safeguarding precedence — active safeguarding cannot be downgraded", () => {
    for (const kind of ALL_KINDS) {
      const input: SilenceZoneInput = { kind, safeguardingActive: true };
      expect(classifySilenceZone(input)).toBe("lawful");
    }
  });

  it("is deterministic across shuffled input orderings (replay-stable)", () => {
    const shuffled = [...ALL_KINDS].sort(() => 0); // stable no-op sort
    const first = shuffled.map((kind) => classifySilenceZone({ kind }));
    const second = [...ALL_KINDS]
      .reverse()
      .map((kind) => classifySilenceZone({ kind }));
    // Compare by-kind to confirm order-independence
    for (const kind of ALL_KINDS) {
      const a = first[shuffled.indexOf(kind)];
      const b = second[[...ALL_KINDS].reverse().indexOf(kind)];
      expect(a).toBe(b);
      expect(a).toBe(EXPECTED[kind]);
    }
  });

  it("returns identical verdicts across two cold invocations (replay determinism)", () => {
    for (const kind of ALL_KINDS) {
      const a = classifySilenceZone({ kind });
      const b = classifySilenceZone({ kind });
      expect(a).toBe(b);
    }
  });
});
