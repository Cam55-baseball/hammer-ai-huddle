import { describe, it, expect } from "vitest";
import { todayStatus, weekCompletion, topAlert, headCoach, type Glance } from "./glance";

const g = (o: Partial<Glance>): Glance => ({ today_planned: 0, today_done: 0, week_planned: 0, week_done: 0, top_alert: null, latest_test: null, head_coach: null, ...o });

describe("coach summary glance", () => {
  it("7-day completion is done over planned", () => {
    expect(weekCompletion(g({ week_planned: 8, week_done: 6 }))).toBe("75% (6 of 8 cards)");
  });
  it("no plan never shows 0%", () => {
    expect(weekCompletion(g({}))).toBe("Nothing planned in the last 7 days");
    expect(todayStatus(g({}))).toBe("No plan for today");
  });
  it("no alert and no head coach say so", () => {
    expect(topAlert(g({}), (s) => s)).toBe("No open alerts");
    expect(headCoach(g({}))).toBe("Not chosen yet");
  });
});
