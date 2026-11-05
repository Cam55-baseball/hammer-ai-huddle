import { describe, it, expect } from "vitest";
import { playerProgramModules, programOf, programQuestionScope, normalizeProgramModules } from "../../supabase/functions/_shared/programAccess";
import { questionsFor, categoriesFor } from "../../supabase/functions/_shared/wic/progression/startingPoint";
import { OWNER_POSITION_ONLY_USER_ID } from "../../supabase/functions/_shared/owner/ownerPositionException";
import { priorityAccess } from "@/lib/hammer/priorityAccess";
import { requiredAnalyses } from "@/lib/assessment/initialAssessment";
import { rulesForCard } from "@/components/hammer/cards/CardRules";

/** Owner Nov 5 #2: one program judge everywhere — 3 programs × 2 sports × the owner's account. */
const SPORTS = ["baseball", "softball"] as const;
const PROGRAMS = ["pitcher", "5tool", "golden2way"] as const;
const PLAYER = "11111111-1111-1111-1111-111111111111";

function surfaces(userId: string, raw: string[], sport: (typeof SPORTS)[number]) {
  const modules = playerProgramModules(userId, normalizeProgramModules(raw, sport));
  const program = programOf(sport, modules)!;
  const cats = new Set(questionsFor(sport, program).map((q) => q.category));
  const today = priorityAccess(modules, sport);
  const assessment = requiredAnalyses(modules.filter((m) => m.startsWith(`${sport}_`)));
  return { program, cats, today, assessment, scope: programQuestionScope(program), modules };
}

describe("program judge matrix (locked by owner Nov 5)", () => {
  for (const sport of SPORTS) {
    for (const p of PROGRAMS) {
      it(`${sport} ${p}: no cross-program question or card`, () => {
        const s = surfaces(PLAYER, [`${sport}_${p}`], sport);
        expect(s.program).toBe(p);
        expect(new Set(categoriesFor(p))).toEqual(s.cats);
        if (p === "pitcher") {
          for (const c of ["hitting", "bunting", "defense"]) expect(s.cats.has(c as never)).toBe(false);
          expect(s.today.hasHitting).toBe(false);
          expect(s.assessment).not.toContain("hitting");
          expect(s.scope.hitting || s.scope.bunting).toBe(false);
          expect(rulesForCard("baserunning", s.modules).some((r) => /steal/i.test(r))).toBe(false);
        }
        if (p === "5tool") {
          expect(s.cats.has("pitching")).toBe(false);
          expect(s.today.hasPitching).toBe(false);
          expect(s.assessment).not.toContain("pitching");
          expect(s.scope.pitching).toBe(false);
        }
        if (p === "golden2way") {
          for (const c of ["hitting", "bunting", "pitching"]) expect(s.cats.has(c as never)).toBe(true);
          expect(s.today.hasHitting && s.today.hasPitching).toBe(true);
          expect(s.scope.pitching && s.scope.hitting).toBe(true);
        }
      });
    }
    it(`${sport} owner account: 5Tool everywhere even with every module bought`, () => {
      const s = surfaces(OWNER_POSITION_ONLY_USER_ID, [`${sport}_golden2way`, `${sport}_pitcher`, `${sport}_5tool`], sport);
      expect(s.program).toBe("5tool");
      expect(s.cats.has("pitching")).toBe(false);
      expect(s.today.hasPitching).toBe(false);
      expect(s.assessment).not.toContain("pitching");
      expect(s.scope.pitching).toBe(false);
    });
  }
  it("another account with the same modules keeps Golden 2Way", () => {
    expect(surfaces(PLAYER, ["baseball_golden2way"], "baseball").program).toBe("golden2way");
  });
});
