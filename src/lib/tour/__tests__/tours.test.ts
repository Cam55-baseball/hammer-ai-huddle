import { describe, it, expect } from "vitest";
import { stepsFor, PICK_ONE_PLAN_BODY } from "../tours";

const ids = (a: Parameters<typeof stepsFor>[0], modules: string[], owner = false) =>
  stepsFor(a, { modules, sport: "baseball", isOwnerOrAdmin: owner }).filter((s) => (s.allowed ? s.allowed() : true)).map((s) => s.id);

describe("tour assembly per tier", () => {
  it("free athlete gets only what free unlocks", () => {
    expect(ids("athlete", [])).toEqual(["today", "update-hammer"]);
  });
  it("Complete Pitcher", () => {
    expect(ids("athlete", ["baseball_pitcher"])).toEqual(["today", "update-hammer", "pick-one", "program", "upload", "game-plan", "vault"]);
  });
  it("5Tool", () => {
    expect(ids("athlete", ["baseball_5tool"])).toEqual(["today", "update-hammer", "pick-one", "program", "upload", "game-plan", "vault"]);
  });
  it("Golden 2Way adds The Unicorn", () => {
    expect(ids("athlete", ["baseball_golden2way"])).toContain("unicorn");
  });
  it("pick-one sits before the programme step with approved wording", () => {
    const s = ids("athlete", ["baseball_5tool"]);
    expect(s.indexOf("pick-one")).toBeLessThan(s.indexOf("program"));
    expect(PICK_ONE_PLAN_BODY).toMatch(/^There are two ways to train here\./);
  });
  it("no non-staff tour mentions the Report Card", () => {
    for (const a of ["athlete", "coach", "scout"] as const) {
      const text = JSON.stringify(stepsFor(a, { modules: ["baseball_golden2way"], sport: "baseball", isOwnerOrAdmin: false }));
      expect(text.toLowerCase()).not.toContain("report card");
    }
  });
  it("scout tour has no comparison or prospect reports", () => {
    const text = JSON.stringify(stepsFor("scout", { modules: [], sport: "baseball", isOwnerOrAdmin: false })).toLowerCase();
    expect(text).not.toMatch(/compar|prospect report/);
  });
});
