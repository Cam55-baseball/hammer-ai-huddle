import { describe, it, expect } from "vitest";
import { inferSituationState } from "../situationState";

describe("inferSituationState", () => {
  it("reads runners on first and second with no outs", () => {
    const s = inferSituationState("bunt-defense-r12-no-outs", "Sac bunt with R1+R2, no outs");
    expect(s.runners).toEqual(["1B", "2B"]);
    expect(s.outs).toBe(0);
    expect(s.explicit).toBe(true);
  });

  it("reads the first-and-third package", () => {
    const s = inferSituationState("first-third-r1-steals-r3-holds", "1st/3rd R1 steals R3 holds");
    expect(s.runners).toEqual(["1B", "3B"]);
  });

  it("reads bases loaded", () => {
    const s = inferSituationState("pitch-call-3-2-count-bases-loaded", "Pitch call, 3-2, bases loaded");
    expect(s.runners).toEqual(["1B", "2B", "3B"]);
  });

  it("keeps the bases empty when the situation says no runners", () => {
    const s = inferSituationState("drag-bunt-lhh-r0", "LHH drag bunt, no runners");
    expect(s.runners).toEqual([]);
    expect(s.outs).toBe(0);
  });

  it("puts a runner on third for a squeeze and crashes at one out", () => {
    const s = inferSituationState("suicide-squeeze-r3-1-out", "Suicide squeeze, R3, 1 out");
    expect(s.runners).toContain("3B");
    expect(s.outs).toBe(1);
  });

  it("teaches 'less than two outs' at one out", () => {
    const s = inferSituationState("drop-ball-strategy", "Drop ball with R3 < 2 outs");
    expect(s.runners).toContain("3B");
    expect(s.outs).toBe(1);
  });

  it("holds a runner on first for a pickoff look", () => {
    const s = inferSituationState("pickoff-1b-rhp-spin", "Pickoff to 1B, RHP spin move");
    expect(s.runners).toEqual(["1B"]);
  });

  it("is deterministic", () => {
    const a = inferSituationState("safety-squeeze-r3-2-outs", "Safety squeeze, R3, 2 outs");
    const b = inferSituationState("safety-squeeze-r3-2-outs", "Safety squeeze, R3, 2 outs");
    expect(a).toEqual(b);
  });
});
