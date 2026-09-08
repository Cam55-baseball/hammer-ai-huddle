/**
 * The edge function cannot import from `src/`, so the fault families are
 * mirrored in `_shared/wic/faultLedger/priority.ts`. A mirror that drifts is
 * worse than no mirror: the app would explain one thing and the plan would do
 * another. This test fails the build the moment the two disagree.
 */
import { describe, it, expect } from "vitest";
import { FAULT_FAMILIES } from "@/lib/wic/faultLedger/families";
import {
  ROOT_PATTERN_FAMILY,
  FAMILY_LADDER_SLUGS,
} from "../../supabase/functions/_shared/wic/faultLedger/priority";

describe("fault ledger priority mirror", () => {
  it("maps every root pattern to the same family as the app", () => {
    const expected: Record<string, string> = {};
    for (const f of FAULT_FAMILIES) {
      for (const rp of f.rootPatterns) expected[rp] = f.id;
    }
    expect(ROOT_PATTERN_FAMILY).toEqual(expected);
  });

  it("offers the same movements per family as the app", () => {
    const expected: Record<string, string[]> = {};
    for (const f of FAULT_FAMILIES) {
      expected[f.id] = f.ladder.map((rung) => rung.slug);
    }
    expect(
      Object.fromEntries(
        Object.entries(FAMILY_LADDER_SLUGS).map(([k, v]) => [k, [...v]]),
      ),
    ).toEqual(expected);
  });
});
