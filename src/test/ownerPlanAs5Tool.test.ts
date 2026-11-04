import { describe, it, expect } from "vitest";
import { planningProgramModules, normalizeProgramModules, programOf } from "../../supabase/functions/_shared/programAccess";
const OWNER = "95de827d-7418-460b-8b79-267bf79bdca4";
const ALL = ["hitting", "pitching", "throwing"];
describe("owner-only plan-as-5Tool rule (Nov 4 r2 #3)", () => {
  it("plans the owner as a 5Tool position player in either sport (no pitching key)", () => {
    for (const sport of ["baseball", "softball"]) {
      const m = planningProgramModules(OWNER, ALL, sport);
      expect(m).toContain(`${sport}_5tool`);
      expect(m.some(k => k.includes("pitch") || k.includes("golden2way"))).toBe(false);
      expect(programOf(sport, m, sport)).toBe("5tool");
    }
  });
  it("leaves the owner's access judge untouched (still every module)", () => {
    expect(programOf("baseball", normalizeProgramModules(ALL, "baseball"))).toBe("golden2way");
  });
  it("affects no other account, including the other owner-role account and near-miss IDs", () => {
    for (const id of [null, undefined, "", "7da0f944-0000-0000-0000-000000000000", OWNER.toUpperCase(), OWNER + " ", "95de827d"]) {
      expect(planningProgramModules(id as any, ALL, "baseball")).toEqual(normalizeProgramModules(ALL, "baseball"));
    }
  });
});
