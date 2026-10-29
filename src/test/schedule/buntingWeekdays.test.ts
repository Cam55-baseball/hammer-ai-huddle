import { describe, it, expect } from "vitest";
import { buntingWeekdays } from "@/lib/hammer/prescription/dailyPlan";
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
});
