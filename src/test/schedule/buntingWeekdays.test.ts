import { describe, it, expect } from "vitest";
import { buntingWeekdays } from "@/lib/hammer/prescription/dailyPlan";
import { buntingProgram } from '../../../supabase/functions/_shared/wic/buntingProgram';
const day = (dow: number, intensity: string, restDay = false) => ({ dow, restDay, modalities: [{ key: "hitting", intensity }] });
const inSeason = [day(0, "", true), day(1, "secondary"), day(2, "activation"), day(3, "secondary"), day(4, "activation"), day(5, "secondary"), day(6, "activation")];
describe("bunting weekdays", () => {
  it("never puts bunting on a game day or Sunday rest", () => {
    const d = buntingWeekdays(inSeason, [1, 5], 2);
    expect(d).not.toContain(1); expect(d).not.toContain(5); expect(d).not.toContain(0);
  });
  it("still finds 2 bunting days when games take the full hitting days", () =>
    expect(buntingWeekdays(inSeason, [1, 5], 2)).toEqual([3, 2]));
  it("uses only full hitting days when there are enough", () =>
    expect(buntingWeekdays(inSeason, [], 2)).toEqual([1, 3, 5]));
  it('a TEST minimum of three reaches three existing legal slots without reopening game or rest days',()=>{
    const legal=buntingWeekdays(inSeason,[1,5],3);
    const p=buntingProgram({sport:'baseball',modules:['baseball_5tool'],bats:'R',legalWeekdays:legal,weeklyMinimum:3,restDay:false,gameDay:false});
    expect(p.scheduled).toEqual([2,3,4]);expect(p.dose('R','squeeze').reps).toBe(5);
  });
  it('a minimum cannot exceed the available non-game slots or grant an unbought skill',()=>{
    const facts={sport:'baseball' as const,modules:['baseball_5tool'],bats:'R' as const,legalWeekdays:buntingWeekdays(inSeason,[1,2,3,4,5],6),weeklyMinimum:6,restDay:false,gameDay:false};
    expect(buntingProgram(facts).scheduled).toEqual([6]);expect(buntingProgram(facts).constrained).toBe(true);
    expect(buntingProgram({...facts,modules:['baseball_completepitcher']}).scheduled).toEqual([]);
  });
});
