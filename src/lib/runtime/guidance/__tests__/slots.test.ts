/**
 * Wave 2 — C2 acceptance tests.
 * - 8-zone matrix × 4 slots.
 * - Identity-reuse assertion (label resolved via getHammerIdentity()).
 * - Purity source-grep (no Date.now / Math.random / fetch / emit).
 * - Replay determinism.
 * - Safeguarding precedence end-to-end.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveGuidanceSlots } from "@/lib/runtime/guidance/slots";
import type { GuidanceSlotsInput } from "@/lib/runtime/guidance/types";
import { getHammerIdentity } from "@/lib/hammer/identity";
import type { SilenceZoneKind } from "@/lib/runtime/silence/types";

const ALL_ZONES: ReadonlyArray<SilenceZoneKind> = [
  "safeguarding-active",
  "athlete-revoked-narrative",
  "missing-data-dominant",
  "unpopulated-surface-with-signal",
  "unpopulated-surface-no-signal",
  "awaiting-input",
  "post-action-cooldown",
  "route-not-yet-rendered",
];

function input(kind: SilenceZoneKind, over: Partial<GuidanceSlotsInput> = {}): GuidanceSlotsInput {
  return {
    entryZone: { kind },
    contextZone: { kind },
    contextSummaryRefs: ["proj:prescription.daily.rendered:0001"],
    nextZone: { kind },
    nextAction: {
      route: "/practice",
      ctaLabelRef: "next.cta.practice",
      moduleHint: "practice",
    },
    exitZone: { kind },
    exitHandoff: {
      candidate: "/practice",
      reasonKey: "practice.window_active",
      lineageHandle: "ledger:evt:0001",
      zone: { kind },
    },
    ...over,
  };
}

describe("resolveGuidanceSlots — 8 × 4 matrix", () => {
  it("returns all four slot kinds for every zone", () => {
    for (const kind of ALL_ZONES) {
      const out = resolveGuidanceSlots(input(kind));
      expect(out.entry.kind).toBe("entry");
      expect(out.context.kind).toBe("context");
      expect(out.next.kind).toBe("next");
      expect(out.exit.kind).toBe("exit");
    }
  });

  it("emits no context refs and no next route when verdict is lawful", () => {
    for (const kind of ALL_ZONES) {
      const out = resolveGuidanceSlots(input(kind));
      if (out.next.verdict === "lawful") {
        expect(out.next.route).toBeNull();
        expect(out.next.ctaLabelRef).toBeNull();
      }
      if (out.context.verdict === "lawful") {
        expect(out.context.summaryRefs).toEqual([]);
      }
    }
  });

  it("Entry slot always references identity.organismStateLabel", () => {
    for (const kind of ALL_ZONES) {
      const out = resolveGuidanceSlots(input(kind));
      expect(out.entry.labelRef).toBe("organismStateLabel");
    }
    expect(getHammerIdentity().organismStateLabel).toBe("Organism State");
  });
});

describe("safeguarding precedence end-to-end", () => {
  it("forces lawful silence on every slot when safeguardingActive=true", () => {
    for (const kind of ALL_ZONES) {
      const out = resolveGuidanceSlots(
        input(kind, {
          entryZone: { kind, safeguardingActive: true },
          contextZone: { kind, safeguardingActive: true },
          nextZone: { kind, safeguardingActive: true },
          exitZone: { kind, safeguardingActive: true },
          exitHandoff: {
            candidate: "/runtime/rtp",
            reasonKey: "rtp.lawful_trigger",
            lineageHandle: "ledger:evt:0001",
            zone: { kind, safeguardingActive: true },
          },
        }),
      );
      expect(out.entry.verdict).toBe("lawful");
      expect(out.context.verdict).toBe("lawful");
      expect(out.next.verdict).toBe("lawful");
      expect(out.exit.verdict).toBe("lawful");
      expect(out.exit.handoff).toEqual({ silence: "lawful" });
    }
  });
});

describe("purity source audit", () => {
  it("slots.ts contains no Date.now / Math.random / fetch / emit / supabase", () => {
    const src = readFileSync(resolve(__dirname, "../slots.ts"), "utf8");
    expect(src).not.toMatch(/Date\.now/);
    expect(src).not.toMatch(/Math\.random/);
    expect(src).not.toMatch(/\bfetch\(/);
    expect(src).not.toMatch(/\bemit[A-Z]/);
    expect(src).not.toMatch(/supabase/i);
  });
});

describe("replay determinism", () => {
  it("byte-identical across two invocations", () => {
    const a = resolveGuidanceSlots(input("unpopulated-surface-with-signal"));
    const b = resolveGuidanceSlots(input("unpopulated-surface-with-signal"));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("byte-identical across reversed zone iteration", () => {
    const forward = ALL_ZONES.map((k) => resolveGuidanceSlots(input(k)));
    const reverse = [...ALL_ZONES]
      .reverse()
      .map((k) => resolveGuidanceSlots(input(k)));
    for (const kind of ALL_ZONES) {
      const f = forward[ALL_ZONES.indexOf(kind)];
      const r = reverse[[...ALL_ZONES].reverse().indexOf(kind)];
      expect(JSON.stringify(f)).toBe(JSON.stringify(r));
    }
  });
});
