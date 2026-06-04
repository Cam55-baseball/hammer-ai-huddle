/**
 * Hammer Wave 3 — C5 First Setback Guidance (tests)
 *
 * Coverage: 6 setback states · missingness visibility · safeguarding
 * precedence · replay determinism · forbidden-token source audit.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolveSetbackGuidance } from "../resolver";
import type { SetbackStateKind } from "../types";

const STATES: SetbackStateKind[] = [
  "missed-day",
  "missed-week",
  "interrupted-prescription",
  "incomplete-logging",
  "recovery-interruption",
  "unavailable-signal",
];

describe("resolveSetbackGuidance", () => {
  it("returns a frozen descriptor with missingness visible for every state", () => {
    for (const state of STATES) {
      const r = resolveSetbackGuidance({
        state,
        unknownSignalRefs: ["proj:hrv:missing", "proj:sleep:missing"],
      });
      expect(r.descriptor.missingnessVisible).toBe(true);
      expect(r.descriptor.unknownSignalRefs.length).toBe(2);
      expect(Object.isFrozen(r)).toBe(true);
      expect(Object.isFrozen(r.descriptor)).toBe(true);
    }
  });

  it("safeguarding-active forces lawful silence on every slot", () => {
    for (const state of STATES) {
      const r = resolveSetbackGuidance({ state, safeguardingActive: true });
      expect(r.descriptor.slots.entry.verdict).toBe("lawful");
      expect(r.descriptor.slots.context.verdict).toBe("lawful");
      expect(r.descriptor.slots.next.verdict).toBe("lawful");
      expect(r.descriptor.slots.exit.verdict).toBe("lawful");
      expect("silence" in r.descriptor.slots.exit.handoff).toBe(true);
    }
  });

  it("recovery-interruption stays lawful silent under RR-6 missingness", () => {
    const r = resolveSetbackGuidance({ state: "recovery-interruption" });
    expect(r.descriptor.slots.entry.verdict).toBe("lawful");
    expect(r.descriptor.slots.next.verdict).toBe("lawful");
    expect(r.descriptor.slots.next.route).toBeNull();
  });

  it("unavailable-signal stays lawful silent (no signal to surface)", () => {
    const r = resolveSetbackGuidance({ state: "unavailable-signal" });
    expect(r.descriptor.slots.entry.verdict).toBe("lawful");
    expect(r.descriptor.slots.exit.verdict).toBe("lawful");
  });

  it("missed-day / missed-week / interrupted-prescription surface accidental + lawful route", () => {
    const signal: SetbackStateKind[] = [
      "missed-day",
      "missed-week",
      "interrupted-prescription",
    ];
    for (const state of signal) {
      const r = resolveSetbackGuidance({
        state,
        lineageHandle: "ledger:evt:setback",
      });
      expect(r.descriptor.slots.next.verdict).toBe("accidental");
      expect(r.descriptor.slots.next.route).not.toBeNull();
      expect("route" in r.descriptor.slots.exit.handoff).toBe(true);
    }
  });

  it("is replay-deterministic — identical input → byte-identical JSON", () => {
    for (const state of STATES) {
      const a = resolveSetbackGuidance({
        state,
        lineageHandle: "ledger:evt:fixed",
        knownSignalRefs: ["proj:a"],
        unknownSignalRefs: ["proj:b"],
      });
      const b = resolveSetbackGuidance({
        state,
        lineageHandle: "ledger:evt:fixed",
        knownSignalRefs: ["proj:a"],
        unknownSignalRefs: ["proj:b"],
      });
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    }
  });

  it("resolver source contains no forbidden tokens", () => {
    const src = readFileSync(
      "src/lib/runtime/setback/resolver.ts",
      "utf8",
    );
    const forbidden = [
      /\bdiagnose\b/i,
      /\bprescribe\b/i,
      /\bauthorize\b/i,
      /\bcleared\b/i,
      /\bpredict\b/i,
      /\bguarantee\b/i,
      /will recover/i,
      /Date\.now/,
      /Math\.random/,
    ];
    for (const re of forbidden) {
      expect(re.test(src)).toBe(false);
    }
  });
});
