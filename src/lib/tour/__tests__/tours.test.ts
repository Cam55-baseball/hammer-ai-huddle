import { describe, it, expect } from "vitest";
import { stepsFor } from "../tours";

const ids = (a: Parameters<typeof stepsFor>[0], modules: string[], owner = false) =>
  stepsFor(a, { modules, sport: "baseball", isOwnerOrAdmin: owner }).filter((s) => (s.allowed ? s.allowed() : true)).map((s) => s.id);

describe("tour assembly per tier", () => {
  it("coach and scout tours carry every approved step", () => {
    expect(stepsFor("coach", { modules: [], sport: "baseball", isOwnerOrAdmin: false })).toHaveLength(11);
    expect(stepsFor("scout", { modules: [], sport: "baseball", isOwnerOrAdmin: false })).toHaveLength(12);
  });
  it("no tour copy uses digits", () => {
    for (const a of ["athlete", "coach", "scout"] as const) {
      for (const s of stepsFor(a, { modules: ["baseball_golden2way"], sport: "baseball", isOwnerOrAdmin: false })) {
        expect(`${s.title} ${s.body}`).not.toMatch(/\d/);
      }
    }
  });
  it("free athlete gets only what free unlocks", () => {
    expect(ids("athlete", [])).toEqual(["menu", "landing", "today", "update-hammer", "meal", "practice", "game", "weather"]);
  });
  it("Complete Pitcher", () => {
    expect(ids("athlete", ["baseball_pitcher"])).toEqual(["menu", "landing", "today", "update-hammer", "meal", "practice", "game", "weather", "upload", "read-analysis", "drills", "game-plan", "vault", "history"]);
  });
  it("5Tool", () => {
    expect(ids("athlete", ["baseball_5tool"])).toEqual(["menu", "landing", "today", "update-hammer", "meal", "practice", "game", "weather", "upload", "read-analysis", "drills", "game-plan", "vault", "history"]);
  });
  it("does not teach temporary programmes", () => {
    const text = JSON.stringify(stepsFor("staff", { modules: ["baseball_golden2way"], sport: "baseball", isOwnerOrAdmin: true })).toLowerCase();
    expect(text).not.toMatch(/iron bambino|heat factory|speed lab|the unicorn/);
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
