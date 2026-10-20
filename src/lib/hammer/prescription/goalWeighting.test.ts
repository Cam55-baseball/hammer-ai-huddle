import { describe, expect, it } from "vitest";
import { weightSkills } from "./goalWeighting";

const SKILLS = [
  { skill: "hitting", minMin: 15, maxMin: 40 },
  { skill: "defense", minMin: 10, maxMin: 30 },
  { skill: "baserunning", minMin: 10, maxMin: 20 },
];

describe("goal weighting", () => {
  it("different goal orders give a different first slot and weekly spread", () => {
    const week = (goals: string[]) => {
      const tot: Record<string, number> = {};
      for (let d = 0; d < 7 * 8; d++) {
        const r = weightSkills(SKILLS, goals, 60);
        for (const [k, v] of Object.entries(r.minutes)) tot[k] = (tot[k] ?? 0) + v;
      }
      return tot;
    };
    const a = weightSkills(SKILLS, ["hitting", "defense"], 60);
    const b = weightSkills(SKILLS, ["defense", "hitting"], 60);
    expect(a.order[0]).toBe("hitting");
    expect(b.order[0]).toBe("defense");
    expect(week(["hitting", "defense"]).hitting).toBeGreaterThan(week(["defense", "hitting"]).hitting);
    expect(week(["defense", "hitting"]).defense).toBeGreaterThan(week(["hitting", "defense"]).defense);
    expect(a.because.hitting).toBe("Because: hitting is your #1 goal.");
  });
  it("every skill keeps its minimum and never passes its maximum, any goals, any time budget", () => {
    for (const goals of [["hitting"], ["defense", "baserunning"], ["baserunning", "hitting", "defense"], []]) {
      for (const total of [20, 35, 60, 90, 200]) {
        const r = weightSkills(SKILLS, goals, total);
        for (const s of SKILLS) {
          expect(r.minutes[s.skill]).toBeGreaterThanOrEqual(s.minMin);
          expect(r.minutes[s.skill]).toBeLessThanOrEqual(s.maxMin);
        }
        if (total >= 35) expect(Object.values(r.minutes).reduce((x, y) => x + y, 0)).toBeLessThanOrEqual(Math.max(total, 35));
      }
    }
  });
  it("a goal for a skill not legal today adds nothing (rules first)", () => {
    const r = weightSkills(SKILLS.filter((s) => s.skill !== "hitting"), ["hitting"], 60);
    expect(r.order).not.toContain("hitting");
    expect(r.because).toEqual({});
  });
});
