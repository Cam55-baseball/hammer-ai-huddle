/**
 * Hammer Wave 4 — C4 Parent Voice (tests)
 *
 * Coverage: 7 parent states · identity reuse · safeguarding precedence ·
 * parent supremacy · missingness visibility · replay determinism ·
 * onboarding/setback delegation · forbidden-token source audit.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolveParentVoice } from "../resolver";
import { resolveOnboardingPresence } from "@/lib/runtime/onboarding/resolver";
import { resolveSetbackGuidance } from "@/lib/runtime/setback/resolver";
import type { ParentStateKind } from "../types";

const STATES: ParentStateKind[] = [
  "invited-not-accepted",
  "accepted-no-athlete-activity",
  "accepted-active-athlete",
  "accepted-missingness-state",
  "accepted-recovery-state",
  "accepted-onboarding-state",
  "accepted-setback-state",
];

function inputFor(state: ParentStateKind) {
  if (state === "accepted-onboarding-state") {
    return { state, onboarding: { state: "first-login" as const } };
  }
  if (state === "accepted-setback-state") {
    return { state, setback: { state: "missed-day" as const } };
  }
  return { state };
}

describe("resolveParentVoice", () => {
  it("returns a frozen descriptor for every parent state", () => {
    for (const state of STATES) {
      const r = resolveParentVoice(inputFor(state));
      expect(r.descriptor.state).toBe(state);
      expect(Object.isFrozen(r)).toBe(true);
      expect(Object.isFrozen(r.descriptor)).toBe(true);
      expect(r.descriptor.missingnessVisible).toBe(true);
      expect(r.descriptor.allowedVerbs).toEqual([
        "explain",
        "summarize",
        "guide",
        "route",
      ]);
    }
  });

  it("entry slot references identity authority by ref, never inline copy", () => {
    for (const state of STATES) {
      const r = resolveParentVoice(inputFor(state));
      expect(r.descriptor.slots.entry.labelRef).toBe("organismStateLabel");
    }
  });

  it("safeguarding-active forces lawful silence on every slot, every state", () => {
    for (const state of STATES) {
      const base = inputFor(state);
      const r = resolveParentVoice({ ...base, safeguardingActive: true });
      expect(r.descriptor.slots.entry.verdict).toBe("lawful");
      expect(r.descriptor.slots.context.verdict).toBe("lawful");
      expect(r.descriptor.slots.next.verdict).toBe("lawful");
      expect(r.descriptor.slots.exit.verdict).toBe("lawful");
      expect(r.descriptor.slots.next.route).toBeNull();
      expect("silence" in r.descriptor.slots.exit.handoff).toBe(true);
    }
  });

  it("recovery state never routes (RR-6: no diagnosis, no RTP implication)", () => {
    const r = resolveParentVoice({ state: "accepted-recovery-state" });
    expect(r.descriptor.slots.next.route).toBeNull();
    expect("silence" in r.descriptor.slots.exit.handoff).toBe(true);
  });

  it("invited-not-accepted resolves to lawful silence", () => {
    const r = resolveParentVoice({ state: "invited-not-accepted" });
    expect(r.descriptor.slots.entry.verdict).toBe("lawful");
    expect(r.descriptor.slots.next.route).toBeNull();
  });

  it("missingness visibility preserved across all states", () => {
    for (const state of STATES) {
      const r = resolveParentVoice({
        ...inputFor(state),
        unknownSignalRefs: ["proj:unknown:1"],
      });
      expect(r.descriptor.missingnessVisible).toBe(true);
      if (state !== "accepted-setback-state") {
        expect(r.descriptor.unknownSignalRefs).toEqual(["proj:unknown:1"]);
      }
    }
  });

  it("parent supremacy: descriptor shape carries no authority/RTP/diagnosis fields", () => {
    const r = resolveParentVoice({ state: "accepted-active-athlete" });
    const keys = Object.keys(r.descriptor);
    for (const forbidden of [
      "authority",
      "rtp",
      "diagnosis",
      "athleteIntent",
      "organismTruth",
      "rehabilitationState",
      "hardStop",
    ]) {
      expect(keys).not.toContain(forbidden);
    }
  });

  it("delegates onboarding state to onboarding resolver (slot equivalence)", () => {
    const r = resolveParentVoice({
      state: "accepted-onboarding-state",
      onboarding: { state: "first-week", lineageHandle: "ledger:evt:x" },
    });
    const direct = resolveOnboardingPresence({
      state: "first-week",
      lineageHandle: "ledger:evt:x",
    });
    expect(JSON.stringify(r.descriptor.slots)).toBe(
      JSON.stringify(direct.descriptor.slots),
    );
  });

  it("delegates setback state to setback resolver (slot equivalence)", () => {
    const r = resolveParentVoice({
      state: "accepted-setback-state",
      setback: { state: "recovery-interruption" },
    });
    const direct = resolveSetbackGuidance({ state: "recovery-interruption" });
    expect(JSON.stringify(r.descriptor.slots)).toBe(
      JSON.stringify(direct.descriptor.slots),
    );
  });

  it("is replay-deterministic — identical input → byte-identical JSON", () => {
    for (const state of STATES) {
      const a = resolveParentVoice({
        ...inputFor(state),
        lineageHandle: "ledger:evt:fixed",
        knownSignalRefs: ["proj:x:1"],
        unknownSignalRefs: ["proj:y:1"],
      });
      const b = resolveParentVoice({
        ...inputFor(state),
        lineageHandle: "ledger:evt:fixed",
        knownSignalRefs: ["proj:x:1"],
        unknownSignalRefs: ["proj:y:1"],
      });
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    }
  });

  it("resolver source contains no forbidden tokens", () => {
    const src = readFileSync(
      "src/lib/runtime/parent/resolver.ts",
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
      /\bfeels\b/i,
      /\bwants\b/i,
      /\bdeserves\b/i,
      /should feel/i,
      /\bexpects\b/i,
      /Date\.now/,
      /Math\.random/,
    ];
    for (const re of forbidden) {
      expect(re.test(src)).toBe(false);
    }
  });
});
