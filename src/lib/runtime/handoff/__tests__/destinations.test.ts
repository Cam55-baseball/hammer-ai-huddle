/**
 * Wave 2 — C6 acceptance tests.
 * - Exhaustive lawful-destination set (exactly 7).
 * - Descriptor shape { route, reasonKey, lineageHandle }.
 * - Safeguarding precedence on /runtime/rtp, /bounce-back-bay, /safety.
 * - Forbidden-phrase source grep.
 * - Replay determinism (byte-identical across shuffled + repeat invocations).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  LAWFUL_DESTINATIONS,
  type HandoffInput,
  type LawfulDestination,
} from "@/lib/runtime/handoff/types";
import { resolveHandoff } from "@/lib/runtime/handoff/destinations";

const SAFETY_BEARING: ReadonlyArray<LawfulDestination> = [
  "/runtime/rtp",
  "/bounce-back-bay",
  "/safety",
];

function input(over: Partial<HandoffInput> = {}): HandoffInput {
  return {
    candidate: "/practice",
    reasonKey: "practice.window_active",
    lineageHandle: "ledger:evt:0001",
    zone: { kind: "unpopulated-surface-with-signal" },
    ...over,
  };
}

describe("LAWFUL_DESTINATIONS", () => {
  it("contains exactly the 7 Wave 2 lawful routes", () => {
    expect(LAWFUL_DESTINATIONS).toEqual([
      "/relational",
      "/practice",
      "/training-block",
      "/safety",
      "/runtime/rtp",
      "/bounce-back-bay",
      "/accept-parent-invite",
    ]);
    expect(new Set(LAWFUL_DESTINATIONS).size).toBe(7);
  });
});

describe("resolveHandoff descriptor shape", () => {
  it("returns { route, reasonKey, lineageHandle } on accidental silence", () => {
    const out = resolveHandoff(input());
    expect(out).toEqual({
      route: "/practice",
      reasonKey: "practice.window_active",
      lineageHandle: "ledger:evt:0001",
    });
  });

  it("returns lawful silence when the zone is constitutionally silent", () => {
    expect(
      resolveHandoff(input({ zone: { kind: "missing-data-dominant" } })),
    ).toEqual({ silence: "lawful" });
  });
});

describe("safeguarding precedence", () => {
  it.each(SAFETY_BEARING)(
    "always returns lawful silence for %s when safeguardingActive=true",
    (route) => {
      const out = resolveHandoff(
        input({
          candidate: route,
          reasonKey:
            route === "/runtime/rtp"
              ? "rtp.lawful_trigger"
              : route === "/bounce-back-bay"
                ? "recovery.signal_present"
                : "safety.athlete_initiated",
          zone: {
            kind: "unpopulated-surface-with-signal",
            safeguardingActive: true,
          },
        }),
      );
      expect(out).toEqual({ silence: "lawful" });
    },
  );

  it("safeguardingActive overrides every lawful destination", () => {
    for (const route of LAWFUL_DESTINATIONS) {
      const out = resolveHandoff(
        input({
          candidate: route,
          zone: {
            kind: "unpopulated-surface-with-signal",
            safeguardingActive: true,
          },
        }),
      );
      expect(out).toEqual({ silence: "lawful" });
    }
  });
});

describe("forbidden-phrase source audit", () => {
  it("destinations.ts contains zero forbidden tokens in executable code", () => {
    const src = readFileSync(
      resolve(__dirname, "../destinations.ts"),
      "utf8",
    );
    // Strip block comments so the doctrine header (which legitimately names
    // the forbidden tokens to enforce their absence) is not counted.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "");
    for (const token of ["diagnose", "prescribe", "authorize", "cleared", "predict"]) {
      expect(code.toLowerCase()).not.toContain(token);
    }
  });

  it("destinations.ts contains no Date.now / Math.random / fetch / emit", () => {
    const src = readFileSync(
      resolve(__dirname, "../destinations.ts"),
      "utf8",
    );
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/Date\.now/);
    expect(code).not.toMatch(/Math\.random/);
    expect(code).not.toMatch(/\bfetch\(/);
    expect(code).not.toMatch(/\bemit[A-Z]/);
  });
});

describe("replay determinism", () => {
  it("byte-identical output across two invocations", () => {
    const a = resolveHandoff(input());
    const b = resolveHandoff(input());
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("byte-identical across shuffled destination iteration", () => {
    const forward = LAWFUL_DESTINATIONS.map((route) =>
      resolveHandoff(input({ candidate: route })),
    );
    const reverse = [...LAWFUL_DESTINATIONS]
      .reverse()
      .map((route) => resolveHandoff(input({ candidate: route })));
    for (const route of LAWFUL_DESTINATIONS) {
      const f = forward[LAWFUL_DESTINATIONS.indexOf(route)];
      const r = reverse[[...LAWFUL_DESTINATIONS].reverse().indexOf(route)];
      expect(JSON.stringify(f)).toBe(JSON.stringify(r));
    }
  });
});
