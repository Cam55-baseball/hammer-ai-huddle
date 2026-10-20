import { describe, expect, it } from "vitest";
import { testingDaysToday } from "./testingDayNotice";

const row = (o: Partial<Parameters<typeof testingDaysToday>[0][0]> = {}) => ({
  id: "a", scheduled_for: "2026-10-20", status: "scheduled", tests: ["60-yard sprint"], ...o,
});

describe("testingDaysToday", () => {
  it("shows a scheduled testing day on its exact date", () => {
    expect(testingDaysToday([row()], "2026-10-20").map((r) => r.id)).toEqual(["a"]);
  });
  it("hides other dates", () => {
    expect(testingDaysToday([row({ scheduled_for: "2026-10-21" })], "2026-10-20")).toEqual([]);
    expect(testingDaysToday([row({ scheduled_for: "2026-10-19" })], "2026-10-20")).toEqual([]);
  });
  it("hides recorded, skipped or rescheduled days", () => {
    for (const status of ["recorded", "skipped", "rescheduled"]) {
      expect(testingDaysToday([row({ status })], "2026-10-20")).toEqual([]);
    }
  });
  it("hides a day with no named tests and rejects a bad date", () => {
    expect(testingDaysToday([row({ tests: [" "] })], "2026-10-20")).toEqual([]);
    expect(testingDaysToday([row()], "10/20/2026")).toEqual([]);
  });
});
