import { describe, it, expect } from "vitest";
import { buildIndividualPostgame } from "../reportEngine";

const game: any = { id: "g", sport: "baseball", game_date: "2026-10-18", opponent_team: "TEST" };
const build = (over: any) =>
  buildIndividualPostgame({ game, atBats: [], pitches: [], defense: [], baserun: [], ...over }) as any;
const section = (r: any, id: string) => r.sections.find((s: any) => s.id === id);

describe("post-game report never fills in unentered values", () => {
  it("a steal with no entered result is 'Not entered', not unsuccessful", () => {
    const r = build({ baserun: [{ event_type: "steal", success: null }] });
    const s = section(r, "baserunning");
    expect(s.summary).toBe("Result not entered.");
    expect(s.table.rows[0][1]).toBe("Not entered");
    expect(r.headline.find((h: any) => h.label === "Base running").value).toBe("Not entered");
  });

  it("a blank pitch type shows 'Not entered', never 'unknown'", () => {
    const r = build({ pitches: [{ perspective: "pitcher", inning: 1, result: "ball" }] });
    expect(section(r, "pitching").table.rows[0][0]).toBe("Not entered");
  });

  it("pitches with no entered count are not treated as first pitches", () => {
    const r = build({ pitches: [{ perspective: "pitcher", inning: 1, result: "ball" }] });
    expect(section(r, "pitching").stats[0].value).toBe("Not entered");
  });

  it("2 first pitches are an early read and never drive Train next", () => {
    const p = { perspective: "pitcher", inning: 1, count_balls: 0, count_strikes: 0, result: "ball" };
    const r = build({ pitches: [p, p] });
    expect(section(r, "pitching").stats[0].detail).toContain("early read");
    expect(JSON.stringify(r)).not.toContain("First-pitch strike rate —");
  });

  it("10 entered 0-0 balls do drive the Train next suggestion", () => {
    const p = { perspective: "pitcher", inning: 1, count_balls: 0, count_strikes: 0, result: "ball" };
    const r = build({ pitches: Array(10).fill(p) });
    expect(JSON.stringify(r)).toContain("First-pitch strike rate —");
  });
});
