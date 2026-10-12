import { describe, expect, it } from "vitest";
import { armEntryLine, mergedPitchDays, pitchDayLine, throwTypeLabel, weeklyPitchTotal, weeklyThrowTotal, type CoachLoad } from "./load";

const base: CoachLoad = { arm_entries: [], pitch_logs: [], game_pitches: [], from: "2026-10-06" };

describe("mergedPitchDays", () => {
  it("adds game and practice pitches on the same date", () => {
    const load: CoachLoad = {
      ...base,
      pitch_logs: [{ plan_date: "2026-10-10", pitches: 22 }],
      game_pitches: [{ game_date: "2026-10-10", pitches: 40 }],
    };
    const days = mergedPitchDays(load);
    expect(days).toHaveLength(1);
    expect(days[0]).toMatchObject({ date: "2026-10-10", pitches: 62, game: 40, practice: 22 });
  });

  it("sorts newest first and skips empty dates", () => {
    const load: CoachLoad = {
      ...base,
      pitch_logs: [{ plan_date: "2026-10-08", pitches: 10 }, { plan_date: "", pitches: 5 }],
      game_pitches: [{ game_date: "2026-10-11", pitches: 30 }],
    };
    expect(mergedPitchDays(load).map((d) => d.date)).toEqual(["2026-10-11", "2026-10-08"]);
  });
});

describe("totals", () => {
  it("weeklyPitchTotal sums merged days", () => {
    const load: CoachLoad = {
      ...base,
      pitch_logs: [{ plan_date: "2026-10-10", pitches: 22 }],
      game_pitches: [{ game_date: "2026-10-10", pitches: 40 }, { game_date: "2026-10-11", pitches: 15 }],
    };
    expect(weeklyPitchTotal(load)).toBe(77);
  });

  it("weeklyThrowTotal counts only done entries", () => {
    const load: CoachLoad = {
      ...base,
      arm_entries: [
        { entry_date: "2026-10-10", throw_type: "long_toss", count: 30, status: "done" },
        { entry_date: "2026-10-10", throw_type: "catch_play", count: 20, status: "skipped" },
      ],
    };
    expect(weeklyThrowTotal(load)).toBe(30);
  });
});

describe("labels", () => {
  it("armEntryLine labels done and skipped entries", () => {
    expect(armEntryLine({ entry_date: "2026-10-10", throw_type: "long_toss", count: 30, status: "done" })).toBe("Long toss — 30 throws");
    expect(armEntryLine({ entry_date: "2026-10-10", throw_type: "bullpen", count: 0, status: "skipped" })).toBe("Bullpen — skipped");
  });

  it("throwTypeLabel falls back to a readable name", () => {
    expect(throwTypeLabel("crow_hop")).toBe("crow hop");
  });

  it("pitchDayLine splits game and practice", () => {
    expect(pitchDayLine({ date: "2026-10-10", pitches: 62, game: 40, practice: 22 })).toBe("62 pitches (40 in a game, 22 in practice)");
    expect(pitchDayLine({ date: "2026-10-10", pitches: 40, game: 40, practice: 0 })).toBe("40 pitches (40 in a game)");
  });
});
