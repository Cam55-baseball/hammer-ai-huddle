import { describe, expect, it } from "vitest";
import { alertLine, headline, lastActiveLine, testsLine, todayLine, weekLine, type FacilityBoardRow } from "./facilityBoard";

const base: FacilityBoardRow = {
  athlete_id: "a", name: "Sam", team_id: null, team_name: null, coach_id: null, coach_name: null,
  today_planned: 0, today_done: 0, week_planned: 0, week_done: 0, missed_days: 0,
  latest_test: null, top_alert: null, last_active: null,
};

describe("facility board headline", () => {
  it("missed days come first", () => {
    expect(headline({ ...base, missed_days: 2 }, "2026-10-12")).toBe("Missed 2 days");
    expect(headline({ ...base, missed_days: 1 }, "2026-10-12")).toBe("Missed 1 day");
  });
  it("test due within 7 days is flagged", () => {
    const r = { ...base, latest_test: { test_type: "10-yard dash", test_date: "2026-09-01", next_entry_date: "2026-10-15" } };
    expect(headline(r, "2026-10-12")).toBe("Test due in 3 days: 10-yard dash");
    expect(headline({ ...base, latest_test: { ...r.latest_test!, next_entry_date: "2026-10-12" } }, "2026-10-12")).toBe("Test due today: 10-yard dash");
  });
  it("old test dates are not flagged", () => {
    const r = { ...base, latest_test: { test_type: "10-yard dash", test_date: "2026-09-01", next_entry_date: "2026-10-01" } };
    expect(headline(r, "2026-10-12")).toBe("All good ✓");
  });
  it("open alert shows when nothing more urgent", () => {
    expect(headline({ ...base, top_alert: { metric_key: "dash", kind: "slip", at: "x" } }, "2026-10-12")).toBe("Open alert");
  });
  it("today's plan done beats all good", () => {
    expect(headline({ ...base, today_planned: 3, today_done: 3 }, "2026-10-12")).toBe("Today's plan done ✓");
  });
});

describe("facility board lines", () => {
  it("today line is honest about empty plans", () => {
    expect(todayLine(base)).toBe("No plan for today");
    expect(todayLine({ ...base, today_planned: 4, today_done: 1 })).toBe("1 of 4 cards done today");
  });
  it("week line shows percent and count", () => {
    expect(weekLine(base)).toBe("Nothing planned in the last 7 days");
    expect(weekLine({ ...base, week_planned: 8, week_done: 6 })).toBe("75% (6 of 8 cards) done in the last 7 days");
  });
  it("last activity and tests say so when empty", () => {
    expect(lastActiveLine(base)).toBe("No activity yet");
    expect(testsLine(base)).toBe("No tests yet");
    expect(alertLine(base)).toBe("No open alerts");
  });
});
