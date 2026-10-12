import { describe, it, expect } from "vitest";
import { assessmentSteps, requiredAnalyses, assessmentComplete, type AssessmentInput } from "../initialAssessment";
const base: AssessmentInput = { onboardingDone: false, lastSeasonDoneOrSkipped: false, movementScreenDone: false, s2Done: false, analysesDone: [], sixWeekTestDone: false, modules: ["baseball_pitcher"] };
describe("initial assessment order", () => {
  it("step 2 is locked until step 1 is done", () => expect(assessmentSteps(base)[2]).toBe("locked"));
  it("step 3 is locked until step 2 is done or skipped", () => expect(assessmentSteps({ ...base, onboardingDone: true })[3]).toBe("locked"));
  it("steps 4-6 are locked until 1-3 are done", () => {
    const s = assessmentSteps({ ...base, onboardingDone: true, lastSeasonDoneOrSkipped: true });
    expect([s[4], s[5], s[6]]).toEqual(["locked", "locked", "locked"]);
  });
  it("steps 4-6 open together in any order after 1-3", () => {
    const s = assessmentSteps({ ...base, onboardingDone: true, lastSeasonDoneOrSkipped: true, movementScreenDone: true, sixWeekTestDone: true });
    expect([s[4], s[5], s[6]]).toEqual(["open", "open", "done"]);
  });
});
describe("only subscribed analyses", () => {
  it("Complete Pitcher needs pitching only", () => expect(requiredAnalyses(["baseball_pitcher"])).toEqual(["pitching"]));
  it("5Tool needs hitting and throwing", () => expect(requiredAnalyses(["softball_5tool"])).toEqual(["hitting", "throwing"]));
  it("Golden 2Way needs all three", () => expect(requiredAnalyses(["baseball_golden2way"])).toEqual(["hitting", "pitching", "throwing"]));
  it("complete once every step is done", () => expect(assessmentComplete({ onboardingDone: true, lastSeasonDoneOrSkipped: true, movementScreenDone: true, s2Done: true, analysesDone: ["pitching"], sixWeekTestDone: true, modules: ["baseball_pitcher"] })).toBe(true));
});
