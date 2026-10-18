import { describe, it, expect } from "vitest";
import {
  hitterReport, pitcherReport, defenseReport, baserunReport, tapInHeatMap, matchupPlanner,
  NOT_ENTERED, rateStat,
} from "../gameIq";

const stat = (s: ReturnType<typeof hitterReport>, label: string) => s.stats!.find((x) => x.label.startsWith(label))!;

describe("Game IQ honesty rules", () => {
  it("no rows at all → Need more data (stats null) for every report", () => {
    expect(hitterReport([]).stats).toBeNull();
    expect(pitcherReport([]).stats).toBeNull();
    expect(defenseReport([]).stats).toBeNull();
    expect(baserunReport([]).stats).toBeNull();
  });

  it("blank at-bat results leave the denominator; all blank → Not entered", () => {
    const r = hitterReport([{ result: null }, { result: "" }]);
    expect(stat(r, "Hit rate").value).toBe(NOT_ENTERED);
    expect(stat(r, "Plate appearances missing").value).toBe("2");
    const r2 = hitterReport([{ result: "1B" }, { result: "K_swinging" }, { result: null }]);
    expect(stat(r2, "Hit rate").value).toBe("50% (1 of 2)");
    expect(stat(r2, "Strikeouts").value).toBe("1");
  });

  it("walks are not official at-bats", () => {
    expect(stat(hitterReport([{ result: "BB" }, { result: "1B" }]), "Hit rate").value).toBe("100% (1 of 1)");
  });

  it("under 10 entries says early read; 10+ does not", () => {
    expect(rateStat("x", 1, 9, "pitches").sample).toContain("early read");
    expect(rateStat("x", 1, 10, "pitches").sample).not.toContain("early read");
  });

  it("pitches with no result never count as strikes", () => {
    const r = pitcherReport([{ perspective: "pitcher", result: "ball" }, { perspective: "pitcher", result: null }]);
    expect(stat(r, "Strike rate").value).toBe("0% (0 of 1)");
    expect(stat(r, "Pitches missing").value).toBe("1");
  });

  it("first-pitch strikes need an entered 0-0 count", () => {
    const r = pitcherReport([{ perspective: "pitcher", result: "called_strike" }]);
    expect(stat(r, "First-pitch").value).toBe(NOT_ENTERED);
  });

  it("defense: unmarked error leaves the denominator", () => {
    const r = defenseReport([{ position: "SS", error_flag: null }, { position: "SS", error_flag: false }]);
    expect(stat(r, "Plays without").value).toBe("100% (1 of 1)");
  });

  it("baserunning: steal with no result → Not entered, not 0%", () => {
    expect(stat(baserunReport([{ event_type: "steal", success: null }]), "Steal success").value).toBe(NOT_ENTERED);
  });

  it("heat map: no tapped location → null (No data yet); only tapped zones count", () => {
    expect(tapInHeatMap([{ perspective: "hitter", result: "ball", location: null }], "hitter")).toBeNull();
    const m = tapInHeatMap([
      { perspective: "hitter", result: "swinging_strike", location: { zone: 5 } },
      { perspective: "hitter", result: "ball", location: { outZone: "low" } },
      { perspective: "pitcher", result: "ball", location: { zone: 1 } },
    ], "hitter")!;
    expect(m.total).toBe(2);
    expect(m.cells[4]).toMatchObject({ pitches: 1, swings: 1, whiffs: 1 });
    expect(m.cells[0].pitches).toBe(0);
    expect(m.earlyRead).toBe(true);
  });

  it("matchup planner: every row carries its sample size and blank keys say Not entered", () => {
    const rows = matchupPlanner([
      { perspective: "hitter", result: "swinging_strike", pitcher_throws: "R", pitch_type: "slider" },
      { perspective: "hitter", result: "ball", pitcher_throws: null, pitch_type: null },
      { perspective: "hitter", result: null, pitcher_throws: "R", pitch_type: "slider" },
    ]);
    expect(rows).toHaveLength(2);
    const sl = rows.find((r) => r.key === "vs RHP · slider")!;
    expect(sl.pitches).toBe(1);
    expect(sl.earlyRead).toBe(true);
    expect(sl.whiff.sample).toContain("from 1 swings");
    expect(rows.some((r) => r.key.includes("not entered"))).toBe(true);
  });
});
