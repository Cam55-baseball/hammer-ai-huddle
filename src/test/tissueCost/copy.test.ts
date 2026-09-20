// Step 5 §4 — athlete- and staff-facing copy. Every reason template must read
// plain and professional: no slang, no banned words.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  ALL_REASON_TEMPLATES,
  ON_RAMP_TEXT,
} from "../../../supabase/functions/_shared/wic/schedule/tissueCost/reasons.ts";
import { FALLBACK_REASON } from "../../../supabase/functions/_shared/wic/schedule/tissueCost/v11/guard.ts";
import { SIGNAL_COPY } from "../../../supabase/functions/_shared/wic/schedule/tissueCost/v11/silentSignals.ts";

// v1.1 §4 language law + Step 5 §4.
const BANNED = [
  /\bcauses?\b/i,
  /\bbecause of\b/i,
  /\bprevents?\b/i,
  /\binjury\b/i,
  /\binjuries\b/i,
];

const SLANG = [
  /full send/i,
  /send it/i,
  /\bgassed\b/i,
  /\bbeast\b/i,
  /\bcrush it\b/i,
  /\bsmash\b/i,
  /\bgrind\b/i,
  /\bgonna\b/i,
  /\bwanna\b/i,
  /\bdude\b/i,
  /\bbro\b/i,
  /\blit\b/i,
  /\bsick\b/i,
  /\bfire\b/i,
  /\byeet\b/i,
  /!{2,}/,
];

const ALL: string[] = [
  ...ALL_REASON_TEMPLATES,
  FALLBACK_REASON,
  ...Object.values(SIGNAL_COPY).map(String),
];

describe("TCS reason copy", () => {
  it("has no banned words", () => {
    for (const line of ALL) {
      for (const re of BANNED) {
        expect({ line, banned: re.source, hit: re.test(line) }).toEqual({
          line,
          banned: re.source,
          hit: false,
        });
      }
    }
  });

  it("has no slang", () => {
    for (const line of ALL) {
      for (const re of SLANG) {
        expect({ line, slang: re.source, hit: re.test(line) }).toEqual({
          line,
          slang: re.source,
          hit: false,
        });
      }
    }
  });

  it("uses the replacement rested line, not the old one", () => {
    expect(ALL).toContain("You're rested — heavy day is on.");
    expect(ALL.join(" ")).not.toMatch(/full send/i);
  });

  it("includes the on-ramp line", () => {
    expect(ON_RAMP_TEXT).toBe("Easing back in after time off.");
  });

  it("the source file contains no other athlete-facing string that breaks the rules", () => {
    const src = readFileSync(
      "supabase/functions/_shared/wic/schedule/tissueCost/reasons.ts",
      "utf8",
    );
    const literals = [...src.matchAll(/"([^"\\]{12,})"/g)].map((m) => m[1]);
    for (const line of literals) {
      for (const re of [...BANNED, ...SLANG]) {
        expect({ line, rule: re.source, hit: re.test(line) }).toEqual({
          line,
          rule: re.source,
          hit: false,
        });
      }
    }
  });
});
