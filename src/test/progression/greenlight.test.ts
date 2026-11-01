import { describe, expect, it } from "vitest";
import {
  weekColor, greenlightLevel, applyGreenlight, areaWeeks, colorsFor, GREENLIGHT_STEP, GREENLIGHT_AREAS,
  type DayCheckIn, type WeekColor,
} from "../../../supabase/functions/_shared/wic/progression/greenlight";
import { weeklyThrowTarget, MAX_WEEKLY_JUMP } from "../../../supabase/functions/_shared/wic/phases/positionThrowTargets";

const wk = "2026-10-05"; // Monday
const days = (n: number, readiness: number, pain = false): DayCheckIn[] =>
  Array.from({ length: n }, (_, i) => ({ date: `2026-10-0${5 + i}`, readiness, pain }));

describe("greenlight week colors (owner Nov 1 round 4)", () => {
  it("green = ≥85% done and 5 of 7 ready, no-pain days", () => {
    expect(weekColor({ weekStart: wk, prescribed: 20, completed: 17 }, days(5, 0.8))).toBe("green");
  });
  it("84% done is not green (mixed)", () => {
    expect(weekColor({ weekStart: wk, prescribed: 100, completed: 84 }, days(7, 0.8))).toBe("mixed");
  });
  it("only 4 positive days is mixed", () => {
    expect(weekColor({ weekStart: wk, prescribed: 10, completed: 10 }, days(4, 0.8))).toBe("mixed");
  });
  it("any pain flag is red", () => {
    expect(weekColor({ weekStart: wk, prescribed: 10, completed: 10 }, [...days(6, 0.8), { date: "2026-10-11", readiness: 0.9, pain: true }])).toBe("red");
  });
  it("under 60% done is red", () => {
    expect(weekColor({ weekStart: wk, prescribed: 10, completed: 5 }, days(7, 0.8))).toBe("red");
  });
  it("3 low-readiness days is red", () => {
    expect(weekColor({ weekStart: wk, prescribed: 10, completed: 10 }, [...days(4, 0.8), ...[9, 10, 11].map((d) => ({ date: `2026-10-${d < 10 ? "0" + d : d}`, readiness: 0.2, pain: false }))])).toBe("red");
  });
  it("no prescribed work = none", () => {
    expect(weekColor({ weekStart: wk, prescribed: 0, completed: 0 }, days(7, 0.8))).toBe("none");
  });
});

describe("greenlight levels", () => {
  it("adults step up after 1 green week", () => {
    const r = greenlightLevel("hitting", ["green"], 22);
    expect([r.level, r.change]).toEqual([1, 1]);
    expect(r.because).toMatch(/^Because:/);
  });
  it("youth need 3 green weeks in a row", () => {
    expect(greenlightLevel("hitting", ["green", "green"], 15).level).toBe(0);
    expect(greenlightLevel("hitting", ["green", "green", "green"], 15).level).toBe(1);
    expect(greenlightLevel("hitting", ["green", "mixed", "green", "green"], 15).level).toBe(0);
    expect(greenlightLevel("hitting", ["green", "none", "green", "green"], 15).level).toBe(0);
  });
  it("18 is youth, 19 is adult", () => {
    expect(greenlightLevel("speed", ["green"], 18).level).toBe(0);
    expect(greenlightLevel("speed", ["green"], 19).level).toBe(1);
  });
  it("mixed holds; red steps back one level, never below the start", () => {
    expect(greenlightLevel("defense", ["green", "green", "mixed"], 25).level).toBe(2);
    const r = greenlightLevel("defense", ["green", "green", "red"], 25);
    expect([r.level, r.change]).toEqual([1, -1]);
    expect(greenlightLevel("defense", ["red", "red"], 25).level).toBe(0);
  });
  it("every outcome has a plain Because line", () => {
    for (const c of [[], ["green"], ["mixed"], ["red"], ["none"], ["green", "red"]] as WeekColor[][])
      expect(greenlightLevel("throwing", c, 20).because).toMatch(/^Because: /);
  });
  it("steps are small: 5–8% or one rung", () => {
    for (const a of GREENLIGHT_AREAS) {
      const s = GREENLIGHT_STEP[a];
      if (s.kind === "pct") { expect(s.pct).toBeGreaterThanOrEqual(0.05); expect(s.pct).toBeLessThanOrEqual(0.08); }
      expect(applyGreenlight(a, 100, 1, 100, 0.3)).toBeLessThanOrEqual(s.kind === "rung" ? 101 : 108);
    }
  });
  it("a single week never passes the weekly build cap", () => {
    expect(applyGreenlight("hitting", 100, 10, 100, 0.05)).toBe(105);
  });
});

describe("history → weeks", () => {
  it("counts per area, finished weeks only", () => {
    const rx = [
      { id: "a", plan_date: "2026-10-06", slot: "hitting" },
      { id: "b", plan_date: "2026-10-07", slot: "hitting" },
      { id: "c", plan_date: "2026-10-13", slot: "hitting" }, // this week — excluded
    ];
    const w = areaWeeks("2026-10-14", rx, new Set(["a"]));
    expect(w.hitting).toEqual([{ weekStart: "2026-10-05", prescribed: 2, completed: 1 }]);
    expect(colorsFor(w.hitting, [], "2026-10-14")).toEqual(["red"]);
  });
});

describe("throw targets use the greenlight, not a fixed 10% build", () => {
  const base = { group: "outfield" as const, sport: "baseball" as const, age: 22, lastWeekRaw: 300, inSeason: false };
  it("no judged week holds", () => {
    expect(weeklyThrowTarget(base).weekly).toBe(300);
  });
  it("green steps up 5%", () => {
    expect(weeklyThrowTarget({ ...base, greenlight: greenlightLevel("throwing", ["green"], 22) }).weekly).toBe(315);
  });
  it("red steps back", () => {
    expect(weeklyThrowTarget({ ...base, greenlight: greenlightLevel("throwing", ["green", "red"], 22) }).weekly).toBeLessThan(300);
  });
  it("never past the weekly jump cap or full-go top", () => {
    const w = weeklyThrowTarget({ ...base, lastWeekRaw: 470, greenlight: greenlightLevel("throwing", ["green"], 22) });
    expect(w.weekly).toBeLessThanOrEqual(Math.min(480, Math.floor(470 * (1 + MAX_WEEKLY_JUMP))));
  });
});

describe("16-week simulation: never rushes", () => {
  it("adult all-green steps at most one level a week; youth one per 3 weeks", () => {
    const colors: WeekColor[] = Array(16).fill("green");
    for (let n = 1; n <= 16; n++) {
      expect(greenlightLevel("speed", colors.slice(0, n), 30).level).toBe(n);
      expect(greenlightLevel("speed", colors.slice(0, n), 14).level).toBe(Math.floor(n / 3));
    }
  });
});
