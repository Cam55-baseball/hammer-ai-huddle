import { describe, expect, it } from "vitest";
import { commandStruggle, commandExtraDays, MOUND_COMMAND_MAX_PER_WEEK, MOUND_MINIMUM_PER_WEEK } from "../../../../../supabase/functions/_shared/wic/pitching/roleCycle";

const starterWeek = [
  { date: "d1", day: "long_toss" as const }, { date: "d2", day: "bullpen" as const }, { date: "d3", day: "shortbox" as const },
  { date: "d4", day: "pre_start" as const }, { date: "d5", day: "start" as const }, { date: "d6", day: "day_after" as const }, { date: "d7", day: "rest" as const },
];

describe("owner Oct 31 mound/circle minimum and command days", () => {
  it("minimum is 3 and command maximum is 5", () => { expect(MOUND_MINIMUM_PER_WEEK).toBe(3); expect(MOUND_COMMAND_MAX_PER_WEEK).toBe(5); });
  it("struggle comes only from data", () => {
    expect(commandStruggle(null).struggling).toBe(false);
    expect(commandStruggle({ walkRate: null, walkMax: 0.1 }).struggling).toBe(false);
    expect(commandStruggle({ walkRate: 0.08, walkMax: 0.1 }).struggling).toBe(false);
    expect(commandStruggle({ walkRate: 0.15, walkMax: 0.1 }).struggling).toBe(true);
    expect(commandStruggle({ stats: [{ key: "first_pitch_strike_pct", status: "Building" }] }).struggling).toBe(true);
    expect(commandStruggle({ stats: [{ key: "two_ball_pct", status: "Need more data" }] }).struggling).toBe(false);
    expect(commandStruggle({ analysisFindings: ["pitching_command_miss"] }).struggling).toBe(true);
    expect(commandStruggle({ goalIds: ["command"] }).struggling).toBe(true);
  });
  it("game outings count toward the days", () => {
    expect(commandExtraDays({ sport: "baseball", week: starterWeek, struggling: false }).baseline).toBe(4);
  });
  it("adds light days only up to 5, never on rest or recovery", () => {
    const r = commandExtraDays({ sport: "baseball", week: starterWeek, struggling: true });
    expect(r.extra).toEqual(["d1"]);
    const thin = commandExtraDays({ sport: "softball", week: [{ date: "a", day: "long_toss" }, { date: "b", day: "pfp" }, { date: "c", day: "rest" }, { date: "d", day: "day_after" }, { date: "e", day: "outing" }], struggling: true });
    expect(thin.extra).toEqual(["a", "b"]);
    expect(thin.blocked.map(b => b.date)).toEqual(["c", "d"]);
  });
  it("limit my pitching blocks extra days with a reason", () => {
    const r = commandExtraDays({ sport: "baseball", week: starterWeek, struggling: true, limitPitching: true });
    expect(r.extra).toEqual([]); expect(r.blocked[0].reason).toMatch(/limit/);
  });
});

import { commandStatsFromLines } from "../../../../../supabase/functions/_shared/wic/pitching/roleCycle";
describe("command stats from logged pitching game lines", () => {
  // One batter: ball, ball, ball, ball → walk, no first-pitch strike, reached two balls.
  const walk = (n: number) => [0, 1, 2, 3].map((b) => ({ batter_opportunity: n, count_balls: b, count_strikes: 0, result: "ball", batter_result: b === 3 ? "BB" : null }));
  const game = { batters_faced: 4, pitch_count: 16, pitches: [1, 2, 3, 4].flatMap(walk) } as any;
  it("incomplete window or unknown level gives no stats (never adds a day)", () => {
    expect(commandStatsFromLines([game], "baseball", null, {}, 4)).toEqual([]);
    expect(commandStatsFromLines([game], "baseball", "high_school" as never, {}, 10)).toEqual([]);
    expect(commandStatsFromLines([], "baseball", "high_school" as never, {}, 4)).toEqual([]);
  });
  it("a complete window with poor first-pitch strikes and two-ball counts flags command", () => {
    const stats = commandStatsFromLines([game], "baseball", "high_school" as never, {}, 4);
    const by = Object.fromEntries(stats.map((s) => [s.key, s.status]));
    expect(by.first_pitch_strike_pct).toBe("Building");
    expect(by.two_ball_pct).toBe("Building");
    expect(commandStruggle({ stats }).struggling).toBe(true);
  });
});
