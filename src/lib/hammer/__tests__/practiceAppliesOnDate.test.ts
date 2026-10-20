import { describe, it, expect } from "vitest";
import { practiceAppliesOnDate as f } from "../practiceAppliesOnDate";

// 2026-10-20 is a Tuesday (2)
describe("practiceAppliesOnDate", () => {
  it("exact date counts", () => expect(f({ scheduled_date: "2026-10-20" }, "2026-10-20")).toBe(true));
  it("weekly repeat on Tuesday after start counts", () =>
    expect(f({ scheduled_date: "2026-10-06", recurring_active: true, recurring_days: [2, 4] }, "2026-10-20")).toBe(true));
  it("repeat on other days does not count", () =>
    expect(f({ scheduled_date: "2026-10-06", recurring_active: true, recurring_days: [1, 3] }, "2026-10-20")).toBe(false));
  it("repeat not started yet does not count", () =>
    expect(f({ scheduled_date: "2026-10-27", recurring_active: true, recurring_days: [2] }, "2026-10-20")).toBe(false));
  it("inactive repeat does not count", () =>
    expect(f({ scheduled_date: "2026-10-06", recurring_active: false, recurring_days: [2] }, "2026-10-20")).toBe(false));
});
