import { describe, it, expect } from "vitest";
import { completion, missedDays, currentStreak, windowDays, correlate , loggingConsistency, adherenceLinks } from "./discipline";

const d = (date: string, prescribed: number, done: number) => ({ date, prescribed, done, logged: done > 0 });

describe("discipline", () => {
  it("completion is done over prescribed", () => {
    expect(completion([d("2026-10-01", 4, 2), d("2026-10-02", 4, 4)])).toBe(75);
    expect(completion([])).toBeNull();
  });
  it("missed day = prescribed but nothing done", () => {
    expect(missedDays([d("2026-10-01", 3, 0), d("2026-10-02", 0, 0), d("2026-10-03", 3, 1)])).toBe(1);
  });
  it("streak counts back from the latest full day", () => {
    expect(currentStreak([d("2026-10-01", 2, 0), d("2026-10-02", 2, 2), d("2026-10-03", 2, 2)])).toBe(2);
  });
  it("7-day window includes exactly 7 days", () => {
    const days = Array.from({ length: 10 }, (_, i) => d(`2026-10-${String(i + 1).padStart(2, "0")}`, 1, 1));
    expect(windowDays(days, "2026-10-10", 7)).toHaveLength(7);
  });
  it("fewer than 8 pairs says Not enough data", () => {
    expect(correlate([[1, 2], [2, 3]]).label).toBe("Not enough data");
  });
  it("8 rising pairs is a positive link, never cause", () => {
    const r = correlate(Array.from({ length: 8 }, (_, i) => [i, i * 2] as [number, number]));
    expect(r.kind === "result" && r.direction).toBe("positive");
    expect(r.label).toContain("does not show cause");
  });
});

describe("logging consistency and result links", () => {
  const day = (i: number, done: number) => ({ date: new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10), prescribed: 2, done, logged: done > 0 });
  it("logging consistency = days with a log / days with work set", () => {
    expect(loggingConsistency([day(0, 2), day(1, 0), day(2, 1), day(3, 0)])).toBe(50);
    expect(loggingConsistency([])).toBeNull();
  });
  it("fewer than 8 results → Not enough data", () => {
    const days = Array.from({ length: 60 }, (_, i) => day(i, 2));
    const obs = Array.from({ length: 7 }, (_, i) => ({ metric: "sprint_10", value: 1.8, date: day(30 + i, 0).date }));
    expect(adherenceLinks(days, obs)[0].result.label).toBe("Not enough data");
  });
  it("more work done before results that rise → positive link, never cause", () => {
    const days = Array.from({ length: 120 }, (_, i) => day(i, i < 40 ? 0 : i < 80 ? 1 : 2));
    const obs = Array.from({ length: 10 }, (_, i) => ({ metric: "jump", value: 20 + i, date: day(30 + i * 9, 0).date }));
    const r = adherenceLinks(days, obs)[0].result;
    expect(r.kind).toBe("result");
    if (r.kind === "result") { expect(r.direction).toBe("positive"); expect(r.label).toContain("does not show cause"); }
  });
});
