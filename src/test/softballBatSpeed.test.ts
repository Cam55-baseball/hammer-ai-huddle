import { describe, it, expect } from "vitest";
import { batSpeedProgramGate, batSpeedProgramOf } from "../../supabase/functions/_shared/wic/batSpeed/programGate";

// Simulation: 8 weeks in-season, Golden 2Way pitcher-hitter with starts every 5th day.
function simulate(modules: string[]) {
  let days = 0, light = 0;
  for (let d = 0; d < 56; d++) {
    const r = batSpeedProgramGate({ modules, season: "in_season", isStartDay: d % 5 === 0, startedYesterday: d % 5 === 1, startsTomorrow: d % 5 === 4, batSpeedDaysThisWeek: 0 });
    if (r.allow) days++; if (r.lightOnly) light++;
  }
  return { days, light };
}
describe("Round 9 — softball 5Tool / Golden 2Way get the hitter bat-speed program", () => {
  for (const sport of ["baseball", "softball"]) {
    it(`${sport} 5Tool and Golden 2Way are hitters`, () => {
      expect(batSpeedProgramOf([`${sport}_5tool`, `${sport}_pitching`])).toBe("hitter");
      expect(batSpeedProgramOf([`${sport}_golden2way`, `${sport}_pitching`])).toBe("hitter");
    });
  }
  it("simulation: softball matches baseball day for day, no velocity limits", () => {
    for (const p of ["5tool", "golden2way"]) {
      const b = simulate([`baseball_${p}`, "baseball_pitching"]);
      const s = simulate([`softball_${p}`, "softball_pitching"]);
      expect(s).toEqual(b);
      expect(s).toEqual({ days: 56, light: 0 });
    }
    expect(simulate(["softball_pitching"]).days).toBeLessThan(56); // Complete Pitcher still limited
  });
});
