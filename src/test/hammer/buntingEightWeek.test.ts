import { describe, expect, it } from "vitest";
import { buntingProgram, validBuntOutcome } from "../../../supabase/functions/_shared/wic/buntingProgram";
describe("owner bunting bounds over eight weeks", () => {
  for (const sport of ["baseball", "softball"] as const) for (const tier of ["5tool", "golden2way"]) for (const bats of ["R", "L", "S"] as const) {
    for (const cohort of ["baseline", "under300", "leftPower", "powerGoal", "speedy", "lacksPower"] as const) {
      it(`${sport} ${tier} ${bats} ${cohort}`, () => {
        let sessions = 0;
        for (let week = 0; week < 8; week++) for (let weekday = 0; weekday < 7; weekday++) {
          const facts = { sport, modules: [`${sport}_${tier}`], bats, legalWeekdays: [1,2,3,4,5,6], restDay: weekday === 0, gameDay: false,
            speedy: cohort === "speedy", lacksPower: cohort === "lacksPower", leftPower: cohort === "leftPower", powerGoal: cohort === "powerGoal",
            battingGames: cohort === "under300" ? [{ hits: 2, atBats: 10 }, { hits: 1, atBats: 10 }] : [], opponentThrows: "L" as const };
          const program = buntingProgram(facts);
          if (facts.restDay) expect(program.canTrainToday).toBe(false);
          if (!program.canTrainToday || !program.scheduled.includes(weekday)) continue;
          sessions++;
          expect(program.sides).toEqual(bats === "S" ? ["R", "L"] : [bats]);
          for (const side of program.sides) for (const type of program.typesFor(side)) {
            const dose = program.dose(side,type);
            const minimum = cohort === "under300" || side === "L" && ["leftPower", "powerGoal"].includes(cohort) ? 7 : 5;
            expect(dose.reps).toBeGreaterThanOrEqual(minimum);
            expect(dose.reps).toBeLessThanOrEqual(20);
            if (bats === "S" && side === "L") expect(type).not.toBe("push");
          }
        }
        expect(sessions).toBe(8 * (["speedy", "lacksPower"].includes(cohort) ? 3 : 2));
      });
    }
  }
  it("scales only exact-side/type real success and caps at twenty", () => {
    const facts = { sport: "baseball" as const, modules: ["baseball_5tool"], bats: "R" as const, legalWeekdays: [1,2,3], restDay: false, gameDay: false };
    expect(buntingProgram(facts).dose("R","drag").reps).toBe(5);
    const failed = buntingProgram({ ...facts, outcomes: [{ side: "R", type: "drag", attempts: 10, successes: 0 }] });
    expect(failed.dose("R","drag").reps).toBe(20);
    expect(failed.dose("L","drag").reps).toBe(5);
    expect(failed.dose("R","squeeze").reps).toBe(5);
    expect(buntingProgram({ ...facts, outcomes: [{ side: "R", type: "drag", attempts: 10, successes: 10 }] }).dose("R","drag").reps).toBe(5);
  });
  it("never creates extra days, trains during games, or grants another sport access", () => {
    const facts = { sport: "softball" as const, modules: ["softball_5tool"], bats: "S" as const, legalWeekdays: [1], restDay: false, gameDay: true, speedy: true };
    expect(buntingProgram(facts).canTrainToday).toBe(false);
    expect(buntingProgram(facts).scheduled).toEqual([1]);
    expect(buntingProgram(facts).constrained).toBe(true);
    expect(buntingProgram({ ...facts, modules: ["baseball_5tool"] }).included).toBe(false);
  });
  it("missing statistics stay unknown and invalid successes cannot scale dose", () => {
    expect(validBuntOutcome({ side: "R", type: "drag", attempts: 2, successes: 3 })).toBe(false);
    const result = buntingProgram({ sport: "baseball", modules: ["baseball_5tool"], bats: "R", legalWeekdays: [1,2], restDay: false, gameDay: false });
    expect(result.battingSample).toEqual({ games: 0, hits: 0, atBats: 0, average: null, under300: false });
  });
});