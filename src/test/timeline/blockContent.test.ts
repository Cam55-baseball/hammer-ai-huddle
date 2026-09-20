import { describe, expect, it } from "vitest";
import {
  BLOCK_CONTENT,
  QUALITY_GATE_CUE,
  maxJumpTier,
  needsQualityGate,
} from "../../../supabase/functions/_shared/wic/schedule/timeline/blockContent.ts";
import {
  DOSE_MATRIX,
  resolveDose,
} from "../../../supabase/functions/_shared/wic/dosage/doctrine.ts";
import {
  METHOD_ENVELOPES,
  isHeavyEligible,
  methodEnvelope,
} from "../../../supabase/functions/_shared/wic/dosage/methods.ts";

const advanced = {
  ageYears: 18,
  trainingAgeYears: 7,
  growthMode: false,
  painFlagLast14Days: false,
};

describe("block content — §7.2", () => {
  it("never allows tier 2 in B1", () => {
    expect(BLOCK_CONTENT.B1.jumpTiers).toEqual([1]);
    const got = maxJumpTier({
      block: "B1",
      phase: "os_q1",
      ...advanced,
      t1SessionsLast8Weeks: 20,
      t2SessionsLast10Weeks: 20,
    });
    expect(got.maxTier).toBe(1);
  });

  it("keeps double eccentric out of B1, B3 and B4", () => {
    expect(BLOCK_CONTENT.B1.out).toContain("double_eccentric");
    expect(BLOCK_CONTENT.B3.out).toContain("double_eccentric");
    expect(BLOCK_CONTENT.B4.out).toContain("double_eccentric");
    expect(BLOCK_CONTENT.B2.heavyMethod).toBe("double_eccentric");
  });

  it("gives B4 the four contrast pairs and B5 the isometric opener", () => {
    expect(BLOCK_CONTENT.B4.contrastPairs).toHaveLength(4);
    expect(BLOCK_CONTENT.B4.heavyMethodAlt).toBe("banded_velocity");
    expect(BLOCK_CONTENT.B5.heavyMethod).toBe("overcoming_isometric");
  });

  it("uses the three sled tools and nothing else", () => {
    const tools = new Set(Object.values(BLOCK_CONTENT).flatMap((b) => b.sledTools));
    expect([...tools].sort()).toEqual(["backward_drag", "heavy_push", "resisted_acceleration"]);
  });
});

describe("jump tiers — §7.3", () => {
  it("never reaches tier 3 before B4", () => {
    for (const block of ["B1", "B2", "B3"] as const) {
      const got = maxJumpTier({
        block,
        phase: "os_q2",
        ...advanced,
        t1SessionsLast8Weeks: 20,
        t2SessionsLast10Weeks: 20,
      });
      expect(got.maxTier).toBeLessThan(3);
    }
    const b4 = maxJumpTier({
      block: "B4",
      phase: "os_q3",
      ...advanced,
      t1SessionsLast8Weeks: 20,
      t2SessionsLast10Weeks: 20,
    });
    expect(b4.maxTier).toBe(3);
  });

  it("never gives an unearned tier", () => {
    const noT1 = maxJumpTier({
      block: "B4",
      phase: "os_q3",
      ...advanced,
      t1SessionsLast8Weeks: 2,
      t2SessionsLast10Weeks: 0,
    });
    expect(noT1.maxTier).toBe(1);

    const noT2 = maxJumpTier({
      block: "B4",
      phase: "os_q3",
      ...advanced,
      t1SessionsLast8Weeks: 10,
      t2SessionsLast10Weeks: 2,
    });
    expect(noT2.maxTier).toBe(2);
  });

  it("holds a 15-year-old and Growth Mode and the season at tier 1 or 2", () => {
    const fifteen = maxJumpTier({
      block: "B4",
      phase: "os_q3",
      ageYears: 15,
      trainingAgeYears: 7,
      growthMode: false,
      painFlagLast14Days: false,
      t1SessionsLast8Weeks: 20,
      t2SessionsLast10Weeks: 20,
    });
    expect(fifteen.maxTier).toBe(2);

    const growth = maxJumpTier({
      block: "B4",
      phase: "os_q3",
      ...advanced,
      growthMode: true,
      t1SessionsLast8Weeks: 20,
      t2SessionsLast10Weeks: 20,
    });
    expect(growth.maxTier).toBe(1);

    for (const phase of ["in_season", "post_season"]) {
      const inSeason = maxJumpTier({
        block: "B4",
        phase,
        ...advanced,
        t1SessionsLast8Weeks: 20,
        t2SessionsLast10Weeks: 20,
      });
      expect(inSeason.maxTier).toBe(1);
    }
  });

  it("blocks tier 3 after a pain flag", () => {
    const got = maxJumpTier({
      block: "B4",
      phase: "os_q3",
      ...advanced,
      painFlagLast14Days: true,
      t1SessionsLast8Weeks: 20,
      t2SessionsLast10Weeks: 20,
    });
    expect(got.maxTier).toBe(2);
  });

  it("carries the quality gate cue on tier 2, tier 3 and max sprints", () => {
    expect(needsQualityGate({ jumpTier: 2 })).toBe(true);
    expect(needsQualityGate({ jumpTier: 3 })).toBe(true);
    expect(needsQualityGate({ maxSprint: true })).toBe(true);
    expect(needsQualityGate({ jumpTier: 1 })).toBe(false);
    expect(QUALITY_GATE_CUE).toMatch(/Stop the set/);
  });
});

describe("method envelopes — §8.1/§8.3", () => {
  it("only opens for 16+, advanced, no growth mode, no pain", () => {
    expect(isHeavyEligible({ ageYears: 18, trainingAgeYears: 7 })).toBe(true);
    expect(isHeavyEligible({ ageYears: 15, trainingAgeYears: 9 })).toBe(false);
    expect(isHeavyEligible({ ageYears: 18, trainingAgeYears: 2 })).toBe(false);
    expect(isHeavyEligible({ ageYears: 18, trainingAgeYears: 7, growthMode: true })).toBe(false);
    expect(isHeavyEligible({ ageYears: 18, trainingAgeYears: 7, painFlag: true })).toBe(false);
  });

  it("matches the owner's ceilings", () => {
    expect(METHOD_ENVELOPES.heavy_triples.offseason).toMatchObject({ sets: [3, 3], reps: [3, 3] });
    expect(METHOD_ENVELOPES.heavy_triples.in_season).toMatchObject({ sets: [2, 3], reps: [3, 3] });
    expect(METHOD_ENVELOPES.double_eccentric.offseason).toMatchObject({ sets: [2, 3], reps: [4, 5] });
    expect(METHOD_ENVELOPES.banded_velocity.offseason).toMatchObject({ sets: [3, 4], reps: [3, 5] });
    expect(METHOD_ENVELOPES.banded_velocity.in_season).toMatchObject({ sets: [2, 3], reps: [3, 3] });
    expect(METHOD_ENVELOPES.overcoming_isometric.offseason).toMatchObject({ sets: [2, 4], reps: [3, 5] });
  });

  it("never lets eccentric overload into the season (law L0.3)", () => {
    // No envelope for the season means the method is simply unavailable — it
    // must never fall back to the offseason envelope.
    expect(methodEnvelope("double_eccentric", "in_season")).toBeNull();
    expect(methodEnvelope("double_eccentric", "offseason")).not.toBeNull();
    const before = resolveDose({
      phase: "in_season", role: "compound_lower", category: "compound", trainingAgeYears: 8,
    });
    const after = resolveDose({
      phase: "in_season", role: "compound_lower", category: "compound", trainingAgeYears: 8,
      method: "double_eccentric", methodContext: "in_season",
    });
    expect(after.method).toBeNull();
    expect({ sets: after.sets, reps: after.reps }).toEqual({ sets: before.sets, reps: before.reps });
  });



  it("never lets a card show a percentage as the instruction", () => {
    const e = methodEnvelope("heavy_triples", "offseason")!;
    expect(e.loadWords).not.toMatch(/%/);
  });

  it("leaves Foundation doses exactly as they are today", () => {
    for (const phase of Object.keys(DOSE_MATRIX)) {
      for (const week of [1, 2, 3, 4]) {
        for (const years of [0, 2, 4, 8, 12]) {
          const foundation = resolveDose({
            phase,
            role: "compound_lower",
            trainingAgeYears: years,
            weekInBlock: week,
          });
          expect([foundation.sets, foundation.reps]).toEqual([foundation.sets, foundation.reps]);
          expect(foundation.method ?? null).toBeNull();
        }
      }
    }
  });

  it("only changes the main compound, never accessories", () => {
    const acc = resolveDose({
      phase: "os_q1",
      role: "upper_push",
      trainingAgeYears: 8,
      method: "heavy_triples",
    });
    const accPlain = resolveDose({ phase: "os_q1", role: "upper_push", trainingAgeYears: 8 });
    expect(acc.sets).toBe(accPlain.sets);
    expect(acc.reps).toBe(accPlain.reps);
  });

  it("puts a heavy-eligible B1 compound on 3x3", () => {
    const d = resolveDose({
      phase: "os_q1",
      role: "compound_lower",
      trainingAgeYears: 8,
      weekInBlock: 2,
      method: "heavy_triples",
      methodContext: "offseason",
    });
    expect([d.sets, d.reps]).toEqual([3, 3]);
  });
});
