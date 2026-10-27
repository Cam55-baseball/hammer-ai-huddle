import { describe, it, expect } from "vitest";
import { assessmentModules, previousAssessmentStep, assessmentSteps, requiredAnalyses, assessmentComplete, shouldFinalizeAssessment, type AssessmentInput } from "../initialAssessment";
const base: AssessmentInput = { onboardingDone: false, lastSeasonDoneOrSkipped: false, movementScreenDone: false, s2Done: false, analysesDone: [], sixWeekTestDone: false, modules: ["baseball_pitcher"] };
describe("optional initial assessment", () => {
  it("step 2 follows step 1", () => expect(assessmentSteps(base)[2]).toBe("locked"));
  it("step 3 follows steps 1 and 2", () => expect(assessmentSteps({ ...base, onboardingDone: true })[3]).toBe("locked"));
  it("tests wait until step 3 is done or skipped", () => {
    const s = assessmentSteps({ ...base, onboardingDone: true, lastSeasonDoneOrSkipped: true });
    expect([s[4], s[5], s[6]]).toEqual(["locked", "locked", "locked"]);
  });
  it("skipping all six counts as completion without invented results", () => {
    expect(assessmentComplete({ ...base, progress: { 1: "skipped", 2: "skipped", 3: "skipped", 4: "skipped", 5: "skipped", 6: "skipped" } })).toBe(true);
  });
  it("skipped foundations unlock 4–6 together", () => {
    const s = assessmentSteps({ ...base, progress: { 1: "skipped", 2: "skipped", 3: "skipped" } });
    expect([s[4], s[5], s[6]]).toEqual(["open", "open", "open"]);
  });
  it("steps 4-6 open together in any order after 1-3", () => {
    const s = assessmentSteps({ ...base, onboardingDone: true, lastSeasonDoneOrSkipped: true, movementScreenDone: true, sixWeekTestDone: true });
    expect([s[4], s[5], s[6]]).toEqual(["open", "open", "open"]);
  });
});
describe("only subscribed analyses", () => {
  it("unsupported categories never create required analyzer steps", () => {
    expect(requiredAnalyses(["baseball_fielding", "softball_catching", "baseball_bunting"])).toEqual([]);
  });
  for (const sport of ["baseball", "softball"]) {
    it(`${sport} 5Tool includes both analyses`, () => expect(requiredAnalyses([`${sport}_5tool`])).toEqual(["hitting", "throwing"]));
    it(`${sport} Complete Pitcher includes pitching`, () => expect(requiredAnalyses([`${sport}_pitcher`])).toEqual(["pitching"]));
    it(`${sport} Golden 2Way includes all three`, () => expect(requiredAnalyses([`${sport}_golden2way`])).toEqual(["hitting", "pitching", "throwing"]));
  }
  it("Complete Pitcher needs pitching only", () => expect(requiredAnalyses(["baseball_pitcher"])).toEqual(["pitching"]));
  it("5Tool needs hitting and throwing", () => expect(requiredAnalyses(["softball_5tool"])).toEqual(["hitting", "throwing"]));
  it("Golden 2Way needs all three", () => expect(requiredAnalyses(["baseball_golden2way"])).toEqual(["hitting", "pitching", "throwing"]));
  it("complete once every step is done", () => expect(assessmentComplete({ onboardingDone: true, lastSeasonDoneOrSkipped: true, movementScreenDone: true, s2Done: true, analysesDone: ["pitching"], sixWeekTestDone: true, modules: ["baseball_pitcher"], progress: { 4: "done", 6: "done" } })).toBe(true));
});

describe("last embedded save finishes assessment", () => {
  const ready: AssessmentInput = { ...base, progress: { 1: "skipped", 2: "skipped", 3: "skipped", 4: "skipped", 5: "skipped" } };
  it("six-week save finalizes without a Mark complete tap", () => {
    expect(shouldFinalizeAssessment(ready, null)).toBe(false);
    expect(shouldFinalizeAssessment({ ...ready, sixWeekTestDone: true }, null)).toBe(false);
    expect(shouldFinalizeAssessment({ ...ready, sixWeekTestDone: true, progress: { ...ready.progress, 6: "done" } }, null)).toBe(true);
  });
  it("final S2 save finishes after five other steps", () => {
    const input = { ...base, progress: { 1: "skipped", 2: "skipped", 3: "skipped", 5: "skipped", 6: "skipped" } as const };
    expect(shouldFinalizeAssessment(input, null)).toBe(false);
    expect(shouldFinalizeAssessment({ ...input, s2Done: true }, null)).toBe(false);
    expect(shouldFinalizeAssessment({ ...input, s2Done: true, progress: { ...input.progress, 4: "done" } }, null)).toBe(true);
  });
  it("finished assessment never requests another completion write", () => {
    expect(shouldFinalizeAssessment({ ...ready, sixWeekTestDone: true }, "2026-10-20T02:04:00Z")).toBe(false);
  });
});

describe("assessment navigation and subscription isolation", () => {
  it("old S2 and Vault records cannot complete unvisited steps", () => {
    const steps = assessmentSteps({ ...base, s2Done: true, sixWeekTestDone: true });
    expect([steps[4], steps[6]]).toEqual(["locked", "locked"]);
  });
  it("Back skips a locked predecessor", () => {
    const steps = assessmentSteps({ ...base, progress: { 4: "skipped", 5: "skipped" } });
    expect(previousAssessmentStep(4, steps)).toBe(1);
  });
  it("Back works between any unlocked later steps", () => {
    const steps = assessmentSteps({ ...base, progress: { 1: "skipped", 2: "skipped", 3: "skipped" } });
    expect(previousAssessmentStep(6, steps)).toBe(5);
    expect(previousAssessmentStep(5, steps)).toBe(4);
    expect(previousAssessmentStep(1, steps)).toBeNull();
  });
  for (const sport of ["baseball", "softball"] as const) {
    it(`${sport} uses only its active saved modules`, () => {
      expect(requiredAnalyses(assessmentModules({ status: "active", subscribed_modules: ["baseball_5tool", "softball_pitcher"] }, sport))).toEqual(sport === "baseball" ? ["hitting", "throwing"] : ["pitching"]);
    });
    it(`${sport} inactive subscriptions grant no assessment analyses`, () => {
      expect(assessmentModules({ status: "canceled", subscribed_modules: [`${sport}_golden2way`] }, sport)).toEqual([]);
    });
  }
});
