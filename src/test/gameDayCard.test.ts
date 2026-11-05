import { describe, it, expect } from "vitest";
import { gameSections, asksDidYouPitch, placeGameCard, gamePhase, summaryLine, ledgerRows, emptyLine, type DayItem } from "@/lib/games/gameDayCard";
import { programOf } from "../../supabase/functions/_shared/programAccess";

describe("Game card — subscription content (shared program judge)", () => {
  it("5Tool → hitting, fielding, baserunning; never pitching", () => {
    const p = programOf("baseball", ["baseball_5tool"]);
    expect(gameSections(p, true)).toEqual(["hitting", "fielding", "baserunning", "review"]);
  });
  it("Complete Pitcher → pitching only, no hitting", () => {
    const p = programOf("softball", ["softball_pitcher"]);
    expect(p).toBe("pitcher");
    expect(gameSections(p, false)).toEqual(["pitching", "review"]);
    expect(asksDidYouPitch(p)).toBe(false);
  });
  it("Golden 2Way → both, pitching only if they pitched", () => {
    const p = programOf("baseball", ["baseball_golden2way"]);
    expect(asksDidYouPitch(p)).toBe(true);
    expect(gameSections(p, false)).toEqual(["hitting", "fielding", "baserunning", "review"]);
    expect(gameSections(p, true)).toEqual(["hitting", "fielding", "baserunning", "pitching", "review"]);
  });
});

describe("Game card — chronological placement", () => {
  const day: DayItem[] = [
    { id: "warm", kind: "warmup" }, { id: "def", kind: "work" }, { id: "flush", kind: "recovery" },
  ];
  it("no time → after pre-game warm-up, before recovery/flush", () => {
    expect(placeGameCard(day, { id: "game", kind: "game" }).map((x) => x.id)).toEqual(["warm", "def", "game", "flush"]);
  });
  it("time known → by clock among timed items", () => {
    const timed: DayItem[] = [{ id: "warm", kind: "warmup", time: "15:00" }, { id: "practice", kind: "work", time: "20:30" }, { id: "flush", kind: "recovery" }];
    expect(placeGameCard(timed, { id: "game", kind: "game", time: "6:30 PM" }).map((x) => x.id)).toEqual(["warm", "game", "practice", "flush"]);
  });
  it("before the start time shows the plan; after it asks to log; logged shows summary", () => {
    expect(gamePhase({ status: "scheduled", time: "18:00", nowMinutes: 9 * 60 })).toBe("before");
    expect(gamePhase({ status: "scheduled", time: "18:00", nowMinutes: 21 * 60 })).toBe("log");
    expect(gamePhase({ status: "final", time: "18:00", nowMinutes: 9 * 60 })).toBe("logged");
  });
});

describe("Game card — summary and saved rows", () => {
  it("builds '2-for-4 · 1 HR · 3 RBI · 1 SB' from entered facts", () => {
    const line = { ...emptyLine(), steals: 1, atBats: [
      { result: "HR", inning: 1, runners: [2 as const] }, { result: "1B", inning: 3, runners: [3 as const], scored: 1 },
      { result: "GO", inning: 5 }, { result: "K_swinging", inning: 7 },
    ] };
    expect(summaryLine(line, ["hitting", "fielding", "baserunning", "review"])).toBe("2-for-4 · 1 HR · 3 RBI · 1 SB");
  });
  it("pitcher save writes the pitching line to the game and no hitting rows", () => {
    const line = { ...emptyLine(), atBats: [{ result: "1B", inning: 1 }], pitching: { pitches: 78, battersFaced: 22, innings: 5, outs: 1, strikeouts: 6, walks: 1, firstPitchStrikes: 14, twoBallCounts: 7, soft: 5, medium: 6, hard: 3, runnersOn: 6, stealsAllowed: 1, stealAttempts: 2 } };
    const r = ledgerRows(line, ["pitching", "review"], { userId: "u", gameId: "g" });
    expect(r.atBats).toHaveLength(0);
    expect(r.game).toMatchObject({ status: "final", pitch_count: 78, pitcher_outs: 16, pitcher_strikeouts: 6 });
  });
  it("fielding chances become defense rows with errors flagged; steals become steal events", () => {
    const r = ledgerRows({ ...emptyLine(), position: "CF", chances: 3, errors: 1, steals: 2, caught: 1 }, ["hitting", "fielding", "baserunning", "review"], { userId: "u", gameId: "g" });
    expect(r.defense.map((d) => d.error_flag)).toEqual([true, false, false]);
    expect(r.baserun.filter((b) => b.success).length).toBe(2);
    expect(r.baserun.filter((b) => !b.success).length).toBe(1);
  });
});
