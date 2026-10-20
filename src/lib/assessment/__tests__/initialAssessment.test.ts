import { describe, it, expect } from "vitest";
import { assessmentSteps, requiredAnalyses, assessmentComplete, shouldFinalizeAssessment, type AssessmentInput } from "../initialAssessment";
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
    expect([s[4], s[5], s[6]]).toEqual(["open", "open", "done"]);
  });
});
describe("only subscribed analyses", () => {
  for (const sport of ["baseball", "softball"]) {
    it(`${sport} 5Tool includes both analyses`, () => expect(requiredAnalyses([`${sport}_5tool`])).toEqual(["hitting", "throwing"]));
    it(`${sport} Complete Pitcher includes pitching`, () => expect(requiredAnalyses([`${sport}_pitcher`])).toEqual(["pitching"]));
    it(`${sport} Golden 2Way includes all three`, () => expect(requiredAnalyses([`${sport}_golden2way`])).toEqual(["hitting", "pitching", "throwing"]));
  }
  it("Complete Pitcher needs pitching only", () => expect(requiredAnalyses(["baseball_pitcher"])).toEqual(["pitching"]));
  it("5Tool needs hitting and throwing", () => expect(requiredAnalyses(["softball_5tool"])).toEqual(["hitting", "throwing"]));
  it("Golden 2Way needs all three", () => expect(requiredAnalyses(["baseball_golden2way"])).toEqual(["hitting", "pitching", "throwing"]));
  it("complete once every step is done", () => expect(assessmentComplete({ onboardingDone: true, lastSeasonDoneOrSkipped: true, movementScreenDone: true, s2Done: true, analysesDone: ["pitching"], sixWeekTestDone: true, modules: ["baseball_pitcher"] })).toBe(true));
});

describe("last embedded save finishes assessment", () => {
  const ready: AssessmentInput = { ...base, progress: { 1: "skipped", 2: "skipped", 3: "skipped", 4: "skipped", 5: "skipped" } };
  it("six-week save finalizes without a Mark complete tap", () => {
    expect(shouldFinalizeAssessment(ready, null)).toBe(false);
    expect(shouldFinalizeAssessment({ ...ready, sixWeekTestDone: true }, null)).toBe(true);
  });
  it("final S2 save finishes after five other steps", () => {
    const input = { ...base, progress: { 1: "skipped", 2: "skipped", 3: "skipped", 5: "skipped", 6: "skipped" } as const };
    expect(shouldFinalizeAssessment(input, null)).toBe(false);
    expect(shouldFinalizeAssessment({ ...input, s2Done: true }, null)).toBe(true);
  });
  it("finished assessment never requests another completion write", () => {
    expect(shouldFinalizeAssessment({ ...ready, sixWeekTestDone: true }, "2026-10-20T02:04:00Z")).toBe(false);
  });
});
