import { describe, it, expect } from "vitest";
import {
  seriesDirection,
  trainingCompletionTrend,
  efficiencyTrend,
  gameResultsTrend,
  pairReading,
  buildPairReadings,
} from "./growthTrends";

describe("seriesDirection", () => {
  it("is unknown with fewer than 2 points", () => {
    expect(seriesDirection([])).toBe("unknown");
    expect(seriesDirection([0.5])).toBe("unknown");
  });
  it("detects up, down and flat", () => {
    expect(seriesDirection([0.2, 0.3, 0.8, 0.9])).toBe("up");
    expect(seriesDirection([0.9, 0.8, 0.3, 0.2])).toBe("down");
    expect(seriesDirection([0.5, 0.5, 0.5, 0.5])).toBe("flat");
  });
});

describe("trainingCompletionTrend", () => {
  it("skips weeks with nothing planned", () => {
    const t = trainingCompletionTrend([
      { week_start: "2026-09-01", planned: 0, done: 0 },
      { week_start: "2026-09-08", planned: 5, done: 1 },
      { week_start: "2026-09-15", planned: 5, done: 5 },
    ]);
    expect(t.points).toBe(2);
    expect(t.direction).toBe("up");
  });
});

describe("efficiencyTrend", () => {
  it("ignores reports without a score", () => {
    const t = efficiencyTrend([
      { id: "1", date: "2026-09-01", module: "pitching", efficiency_score: null },
      { id: "2", date: "2026-09-08", module: "pitching", efficiency_score: 60 },
      { id: "3", date: "2026-09-15", module: "pitching", efficiency_score: 80 },
    ]);
    expect(t.points).toBe(2);
    expect(t.direction).toBe("up");
  });
});

describe("gameResultsTrend", () => {
  it("uses wins/losses only when both scores exist", () => {
    const t = gameResultsTrend([
      { id: "1", game_date: "2026-09-01", opponent: "A", my_score: null, opp_score: null, pitch_count: 40, verified: false },
      { id: "2", game_date: "2026-09-08", opponent: "B", my_score: 1, opp_score: 5, pitch_count: 40, verified: true },
      { id: "3", game_date: "2026-09-15", opponent: "C", my_score: 6, opp_score: 2, pitch_count: 40, verified: true },
    ]);
    expect(t.points).toBe(2);
    expect(t.direction).toBe("up");
  });
});

describe("pairReading", () => {
  const up = { label: "Training", direction: "up" as const, points: 4, summary: "" };
  const down = { label: "Game results", direction: "down" as const, points: 3, summary: "" };
  const unknown = { label: "Video analysis", direction: "unknown" as const, points: 1, summary: "" };

  it("labels same-direction pairs 'these move together' and never claims cause", () => {
    const r = pairReading(up, { ...up, label: "Game results" });
    expect(r.reading).toBe("these move together");
    expect(r.detail).toContain("does not show one caused the other");
  });
  it("labels opposite directions without claiming cause", () => {
    const r = pairReading(up, down);
    expect(r.reading).toBe("these move in opposite directions");
    expect(r.detail).toContain("does not show one caused the other");
  });
  it("says not enough data yet when a series is unknown", () => {
    expect(pairReading(up, unknown).reading).toBe("not enough data yet");
  });
});

describe("buildPairReadings", () => {
  it("returns three pair readings", () => {
    const r = buildPairReadings([], [], []);
    expect(r.pairs).toHaveLength(3);
    expect(r.pairs.every((p) => p.reading === "not enough data yet")).toBe(true);
  });
});
