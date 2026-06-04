/**
 * Hammer Wave 3 — C3 Onboarding Presence (tests)
 *
 * Coverage: 7 onboarding states · lawful silence · replay determinism ·
 * identity reuse · safeguarding precedence · forbidden-token source audit.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolveOnboardingPresence } from "../resolver";
import type { OnboardingStateKind } from "../types";

const STATES: OnboardingStateKind[] = [
  "first-login",
  "first-completed-action",
  "first-prescription",
  "first-week",
  "incomplete-onboarding",
  "partial-profile",
  "no-activity",
];

describe("resolveOnboardingPresence", () => {
  it("returns a frozen descriptor for every onboarding state", () => {
    for (const state of STATES) {
      const r = resolveOnboardingPresence({ state });
      expect(r.descriptor.state).toBe(state);
      expect(Object.isFrozen(r)).toBe(true);
      expect(Object.isFrozen(r.descriptor)).toBe(true);
      expect(r.descriptor.slots.entry.kind).toBe("entry");
      expect(r.descriptor.slots.context.kind).toBe("context");
      expect(r.descriptor.slots.next.kind).toBe("next");
      expect(r.descriptor.slots.exit.kind).toBe("exit");
    }
  });

  it("entry slot references identity authority by ref, never inline copy", () => {
    for (const state of STATES) {
      const r = resolveOnboardingPresence({ state });
      expect(r.descriptor.slots.entry.labelRef).toBe("organismStateLabel");
    }
  });

  it("safeguarding-active forces lawful silence on every slot", () => {
    for (const state of STATES) {
      const r = resolveOnboardingPresence({ state, safeguardingActive: true });
      expect(r.descriptor.slots.entry.verdict).toBe("lawful");
      expect(r.descriptor.slots.context.verdict).toBe("lawful");
      expect(r.descriptor.slots.next.verdict).toBe("lawful");
      expect(r.descriptor.slots.exit.verdict).toBe("lawful");
      expect(r.descriptor.slots.next.route).toBeNull();
      expect("silence" in r.descriptor.slots.exit.handoff).toBe(true);
    }
  });

  it("no-activity / incomplete-onboarding / partial-profile resolve to lawful silence", () => {
    const lawfulOnly: OnboardingStateKind[] = [
      "no-activity",
      "incomplete-onboarding",
      "partial-profile",
      "first-login",
    ];
    for (const state of lawfulOnly) {
      const r = resolveOnboardingPresence({ state });
      expect(r.descriptor.slots.next.verdict).toBe("lawful");
      expect(r.descriptor.slots.next.route).toBeNull();
    }
  });

  it("signal-present states surface an accidental verdict + lawful destination", () => {
    const signal: OnboardingStateKind[] = [
      "first-completed-action",
      "first-prescription",
      "first-week",
    ];
    for (const state of signal) {
      const r = resolveOnboardingPresence({
        state,
        lineageHandle: "ledger:evt:test",
      });
      expect(r.descriptor.slots.next.verdict).toBe("accidental");
      expect(r.descriptor.slots.next.route).not.toBeNull();
      expect("route" in r.descriptor.slots.exit.handoff).toBe(true);
    }
  });

  it("is replay-deterministic — identical input → byte-identical JSON", () => {
    for (const state of STATES) {
      const a = resolveOnboardingPresence({
        state,
        lineageHandle: "ledger:evt:fixed",
        contextSummaryRefs: ["proj:x:1"],
      });
      const b = resolveOnboardingPresence({
        state,
        lineageHandle: "ledger:evt:fixed",
        contextSummaryRefs: ["proj:x:1"],
      });
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    }
  });

  it("resolver source contains no forbidden tokens", () => {
    const src = readFileSync(
      new URL("../resolver.ts", import.meta.url),
      "utf8",
    );
    const forbidden = [
      /\bdiagnose\b/i,
      /\bprescribe\b/i,
      /\bauthorize\b/i,
      /\bcleared\b/i,
      /\bpredict\b/i,
      /Date\.now/,
      /Math\.random/,
    ];
    for (const re of forbidden) {
      expect(re.test(src)).toBe(false);
    }
  });
});
