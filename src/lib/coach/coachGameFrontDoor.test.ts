import { describe, it, expect } from "vitest";
import { teamLinesToSave, generalGameInput, guardSinglePlayer, guardLineupPlay } from "./coachLogging";
import { playerWeekCards, type WeekDay } from "./playerWeek";

const row = (j: string, played: boolean, values: Record<string, string>) => ({ athlete_id: `a${j}`, jersey: j, name: `P${j}`, played, values });

describe("coach Log a game (owner Nov 5)", () => {
  it("team mode skips players who didn't play and saves the rest", () => {
    const r = teamLinesToSave([row("1", true, { ab: "3", hits: "1", rbi: "2" }), row("2", false, {}), row("3", true, { ab: "4" })]);
    expect(r.errors).toEqual([]);
    expect(r.save.map((s) => s.row.athlete_id)).toEqual(["a1", "a3"]);
    expect(r.save[0].stats).toEqual({ ab: 3, hits: 1, rbi: 2 });
  });
  it("team mode names the player whose line is wrong", () => {
    expect(teamLinesToSave([row("7", true, { ab: "1", hits: "2" })]).errors[0]).toMatch(/#7 P7/);
  });
  it("general game needs players and both scores or neither", () => {
    expect(generalGameInput("", "", []).error).toMatch(/team or your roster/);
    expect(generalGameInput("5", "", ["a"]).error).toMatch(/both scores/);
    expect(generalGameInput("5", "3", ["a"])).toEqual({ my: 5, opp: 3, error: null });
    expect(generalGameInput("", "", ["a"]).error).toBeNull();
  });
  it("saving to the wrong player stays blocked", () => {
    expect(guardSinglePlayer("a1", "a2").ok).toBe(false);
    expect(guardLineupPlay([{ athlete_id: "a1", jersey: "9", name: "P" }], "9", "a2").ok).toBe(false);
  });
  it("logged games show on the player week calendar", () => {
    const day = { date: "2026-11-05", plan: { blocks: [] }, restDay: false, prescriptions: [], logs: [], tasks: [], coachWorkouts: [],
      games: [{ id: "g1", opponent: "Tigers", my_score: 5, opp_score: 3, entry_source: "coach", general: true }] } as unknown as WeekDay;
    const card = playerWeekCards(day).find((c) => c.id === "game:g1")!;
    expect(card.title).toBe("Game vs Tigers");
    expect(card.activities[0].name).toBe("Won 5–3");
    expect(card.activities[0].dosage).toBe("Team game (no player stats)");
  });
});
