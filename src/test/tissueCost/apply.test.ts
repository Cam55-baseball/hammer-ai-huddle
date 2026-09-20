import { describe, expect, it } from "vitest";
import {
  applyDecision,
  blockedClassesFor,
  capForClass,
  phaseTemplateClassFor,
  weekdayName,
} from "../../../supabase/functions/_shared/wic/schedule/tissueCost/apply";

const base = {
  allowedClass: "H" as const,
  timing: "after_skill_work" as const,
  nextHeavyDate: "2026-09-24",
  reasons: ["Tanks are fresh."],
  fallbackUsed: false,
  blockCnsCap: 4,
  isGameDay: false,
  planDate: "2026-09-21",
};

describe("TCS apply — cap can only come down", () => {
  it("class H keeps the block cap", () => {
    expect(capForClass("H", 4)).toBe(4);
  });
  it("M and L only lower it, never below 1", () => {
    expect(capForClass("M", 4)).toBe(3);
    expect(capForClass("L", 4)).toBe(2);
    expect(capForClass("L", 2)).toBe(1);
    expect(capForClass("none", 1)).toBe(1);
  });
  it("never returns a cap above the block cap", () => {
    for (const cls of ["H", "M", "L", "none"] as const) {
      for (const cap of [1, 2, 3, 4, 5]) {
        expect(applyDecision({ ...base, allowedClass: cls, blockCnsCap: cap }).cnsCap)
          .toBeLessThanOrEqual(cap);
      }
    }
  });
});

describe("TCS apply — movement classes", () => {
  it("H allows everything, M blocks heavy, L blocks compounds too", () => {
    expect(blockedClassesFor("H")).toEqual([]);
    expect(blockedClassesFor("M")).toEqual(["supra_maximal", "maximal"]);
    expect(blockedClassesFor("L")).toContain("compound");
    expect(blockedClassesFor("M")).toContain("maximal");
    expect(blockedClassesFor("none")).toContain("moderate");
    expect(blockedClassesFor("none")).not.toContain("arm_care");
  });
});

describe("TCS apply — timing", () => {
  it("stamps post-game on a game day, whatever the decision said", () => {
    const r = applyDecision({ ...base, isGameDay: true, timing: "after_skill_work" });
    expect(r.timing).toBe("post_game");
    expect(r.timingNote).toBe("Do this after the game");
  });
  it("otherwise sits after skill work", () => {
    expect(applyDecision(base).timingNote).toBe("Do this after your skill work");
  });
});

describe("TCS apply — none day", () => {
  it("drops the lift and becomes recovery only, with a reason", () => {
    const r = applyDecision({ ...base, allowedClass: "none", reasons: [] });
    expect(r.removeLift).toBe(true);
    expect(r.recoveryOnly).toBe(true);
    expect(r.reasons.length).toBeGreaterThan(0);
  });
});

describe("TCS apply — next heavy chip", () => {
  it("names the weekday", () => {
    expect(weekdayName("2026-09-24")).toBe("Thursday");
    expect(applyDecision(base).nextHeavyChip).toBe("Next heavy day: Thursday");
  });
  it("is empty when today already is the heavy day", () => {
    expect(applyDecision({ ...base, nextHeavyDate: base.planDate }).nextHeavyChip).toBeNull();
  });
  it("is empty when there is no heavy day in the horizon", () => {
    expect(applyDecision({ ...base, nextHeavyDate: null }).nextHeavyChip).toBeNull();
  });
});

describe("TCS apply — phase template ceiling", () => {
  it("maps the blocks the way the offseason arc prescribes", () => {
    expect(phaseTemplateClassFor("os_q1")).toBe("H");
    expect(phaseTemplateClassFor("os_q2")).toBe("H");
    expect(phaseTemplateClassFor("os_q3")).toBe("H");
    expect(phaseTemplateClassFor("os_q4")).toBe("H");
    expect(phaseTemplateClassFor("in_season")).toBe("M");
    expect(phaseTemplateClassFor("post_season")).toBe("L");
    expect(phaseTemplateClassFor("nonsense")).toBe("M");
  });
});

describe("TCS apply — reasons", () => {
  it("shows at most two", () => {
    const r = applyDecision({ ...base, reasons: ["a", "b", "c"] });
    expect(r.reasons).toEqual(["a", "b"]);
  });
});
