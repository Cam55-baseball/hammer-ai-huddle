import { describe, it, expect } from "vitest";
import { judgeRestMove, restDateFor, restDowFor, type RestChoice } from "../../../supabase/functions/_shared/wic/schedule/restDay";

// Week of Mon 2026-11-02 … Sun 2026-11-08. "Today" = Monday so every day is pickable.
const today = "2026-11-02";
const days = ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08"];
const dowOf = (d: string) => new Date(`${d}T12:00:00Z`).getUTCDay();

function save(choices: RestChoice[], target: string, scope: "week" | "indefinite", at: string): RestChoice[] {
  const v = judgeRestMove({ today, target, scope, choices });
  if (!v.ok) throw new Error(v.reason);
  return [...choices, { rest_dow: dowOf(target), scope, week_start: v.weekStart, created_at: at }];
}

describe("rest day picker maps every weekday (owner Nov 4 #5)", () => {
  for (const target of days.slice(0, 6)) {
    it(`Only this week → ${target}`, () => {
      const c = save([], target, "week", "2026-11-02T10:00:00Z");
      expect(restDateFor(today, c)).toBe(target);
      expect(restDowFor("2026-11-09", c)).toBe(0); // next week back to Sunday
    });
    it(`Indefinitely → ${target}`, () => {
      const c = save([], target, "indefinite", "2026-11-02T10:00:00Z");
      expect(restDateFor(today, c)).toBe(target);
      expect(restDowFor("2026-11-16", c)).toBe(dowOf(target));
    });
  }
  it("a later Indefinitely pick replaces an earlier Only-this-week pick (the owner's case)", () => {
    let c = save([], "2026-11-06", "week", "2026-11-03T14:31:00Z"); // Friday this week
    c = save(c, "2026-11-08", "indefinite", "2026-11-03T15:51:00Z"); // back to Sunday
    expect(restDateFor(today, c)).toBe("2026-11-08");
  });
  it("a later Only-this-week pick still beats an earlier Indefinitely pick", () => {
    let c = save([], "2026-11-04", "indefinite", "2026-11-02T10:00:00Z");
    c = save(c, "2026-11-07", "week", "2026-11-02T11:00:00Z");
    expect(restDateFor(today, c)).toBe("2026-11-07");
    expect(restDowFor("2026-11-09", c)).toBe(3);
  });
});
