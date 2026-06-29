import { describe, it, expect } from "vitest";
import { scoreSkillLevers, normalizeCategoryGoalsV2 } from "./categoryGoals";

const baseSamePayload = {
  version: 2,
  updatedAt: new Date().toISOString(),
  baseball: {
    position: {
      hitting: [
        { id: "bat_speed", rank: "primary", side: "L" },
        { id: "barrel_control", rank: "secondary", side: "R" },
      ],
    },
  },
};

describe("scoreSkillLevers — side scoping", () => {
  it("default call (no side) sums all picks regardless of side tag", () => {
    const all = scoreSkillLevers(baseSamePayload);
    expect(all.hitting_bat_speed).toBeGreaterThan(0);
    expect(all.hitting_contact).toBeGreaterThan(0);
  });

  it("filters out picks tagged for the opposite side when side='L'", () => {
    const left = scoreSkillLevers(baseSamePayload, { side: "L" });
    // bat_speed (L, primary) contributes; barrel_control (R) is excluded.
    expect(left.hitting_bat_speed).toBeGreaterThan(0);
    expect(left.hitting_contact ?? 0).toBe(0);
  });

  it("untagged / 'both' picks contribute on every side", () => {
    const payload = {
      version: 2,
      updatedAt: new Date().toISOString(),
      baseball: {
        position: {
          hitting: [
            { id: "bat_speed", rank: "primary" }, // no side
            { id: "barrel_control", rank: "secondary", side: "both" },
          ],
        },
      },
    };
    const left = scoreSkillLevers(payload, { side: "L" });
    const right = scoreSkillLevers(payload, { side: "R" });
    expect(left.hitting_bat_speed).toBeGreaterThan(0);
    expect(right.hitting_bat_speed).toBeGreaterThan(0);
    expect(left.hitting_contact).toBeGreaterThan(0);
    expect(right.hitting_contact).toBeGreaterThan(0);
  });

  it("normalize preserves legal side values and drops garbage", () => {
    const n = normalizeCategoryGoalsV2({
      version: 2,
      updatedAt: new Date().toISOString(),
      baseball: {
        position: {
          hitting: [
            { id: "bat_speed", rank: "primary", side: "L" },
            { id: "barrel_control", rank: "secondary", side: "diagonal" },
          ],
        },
      },
    });
    const picks = n!.baseball!.position!.hitting!;
    expect(picks[0].side).toBe("L");
    expect(picks[1].side).toBeUndefined();
  });
});
