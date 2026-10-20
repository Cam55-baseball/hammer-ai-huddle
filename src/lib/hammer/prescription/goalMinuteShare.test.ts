import { describe, it, expect } from "vitest";
import { goalMinuteShare, TOP_GOAL_BOOST, SECOND_GOAL_BOOST } from "./goalMinuteShare";

const rows = [
  { category: "hitting", baseMin: 120, minMin: 60 },
  { category: "throwing", baseMin: 100, minMin: 50 },
  { category: "fielding", baseMin: 80, minMin: 40 },
  { category: "power", baseMin: 60, minMin: 40 },
  { category: "speed", baseMin: 40, minMin: 30 },
];
const ORDER = ["hitting", "throwing", "fielding", "power", "speed"];

describe("goal minute-share (owner: top +25%, second +10%, funded from lower categories, floors win)", () => {
  it("boosts the top category about 25% and the second about 10%", () => {
    const out = goalMinuteShare(rows, ORDER);
    expect(out.hitting).toBe(150); // 120 + 30
    expect(out.throwing).toBe(110); // 100 + 10
  });

  it("funds the boost from lower categories, never below their minimums", () => {
    const out = goalMinuteShare(rows, ORDER);
    for (const row of rows) expect(out[row.category]!).toBeGreaterThanOrEqual(row.minMin);
    // Total weekly minutes are conserved (whole-minute rounding may drift by a minute).
    const before = rows.reduce((s, r) => s + r.baseMin, 0);
    const after = Object.values(out).reduce((s, n) => s + n, 0);
    expect(Math.abs(after - before)).toBeLessThanOrEqual(rows.length);
  });

  it("shrinks the boost when lower categories cannot fund it without breaking floors", () => {
    const tight = [
      { category: "hitting", baseMin: 100, minMin: 50 },
      { category: "throwing", baseMin: 60, minMin: 55 },
      { category: "fielding", baseMin: 40, minMin: 40 },
    ];
    const out = goalMinuteShare(tight, ["hitting", "throwing", "fielding"]);
    // Only 5 spare minutes exist (throwing, down to its floor), so hitting gets +5, not +25.
    expect(out.hitting).toBe(105);
    expect(out.throwing).toBe(55);
    expect(out.fielding).toBe(40);
  });

  it("unranked or unknown goals change nothing", () => {
    expect(goalMinuteShare(rows, [])).toEqual({ hitting: 120, throwing: 100, fielding: 80, power: 60, speed: 40 });
    expect(goalMinuteShare(rows, ["unknown"])).toEqual({ hitting: 120, throwing: 100, fielding: 80, power: 60, speed: 40 });
  });

  it("a single ranked goal boosts only that category", () => {
    const out = goalMinuteShare(rows, ["fielding"]);
    expect(out.fielding).toBe(100); // 80 + 20
    expect(out.hitting).toBeLessThan(120);
  });

  it("never fabricates minutes from missing or negative bases", () => {
    const odd = [
      { category: "hitting", baseMin: Number.NaN, minMin: 0 },
      { category: "throwing", baseMin: -10, minMin: 0 },
    ];
    const out = goalMinuteShare(odd, ["hitting", "throwing"]);
    expect(out.hitting).toBe(0);
    expect(out.throwing).toBe(0);
  });

  it("boost constants match the owner's words", () => {
    expect(TOP_GOAL_BOOST).toBe(0.25);
    expect(SECOND_GOAL_BOOST).toBe(0.10);
  });
});
