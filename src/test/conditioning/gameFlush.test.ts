import { describe, it, expect } from "vitest";
import { gameFlushFor } from "../../../supabase/functions/_shared/wic/conditioning/gameFlush";

const base = { planDate: "2026-10-08", isGameDay: false, conditioningPath: "in_season", holdDay: false };

describe("game-linked flush", () => {
  it("offers an optional flush the day after a saved game", () => {
    const r = gameFlushFor({ ...base, games: [{ date: "2026-10-07", source: "gp_games" }] });
    expect(r?.optional).toBe(true);
    expect(r?.slugs.length).toBeLessThanOrEqual(2);
  });
  it("never on a game day, hold day, ignored game, or when the day is already a flush", () => {
    const g = [{ date: "2026-10-07", source: "gp_games" }];
    expect(gameFlushFor({ ...base, games: g, isGameDay: true })).toBeNull();
    expect(gameFlushFor({ ...base, games: g, holdDay: true })).toBeNull();
    expect(gameFlushFor({ ...base, games: [{ ...g[0], ignored: true }] })).toBeNull();
    expect(gameFlushFor({ ...base, games: g, conditioningPath: "pitcher_after_start" })).toBeNull();
    expect(gameFlushFor({ ...base, games: [{ date: "2026-10-06", source: "gp_games" }] })).toBeNull();
    expect(gameFlushFor({ ...base, games: [] })).toBeNull();
  });
});
