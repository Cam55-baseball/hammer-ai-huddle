/**
 * Plan 4 §B — one-time initial assessment.
 * Suggested checklist only. Every item is optional; explicit completion
 * is persisted separately and is the only first-start requirement.
 * Step 5 = one analysis for each module INCLUDED in the subscription only.
 * Baserunning IQ and Game IQ are never part of it.
 */
import { hasFeatureAccess } from "@/utils/tierAccess";

export type StepId = 1 | 2 | 3 | 4 | 5 | 6;
export type StepState = "locked" | "open" | "done";
export type AnalysisModule = "hitting" | "pitching" | "throwing";

export interface AssessmentInput {
  onboardingDone: boolean;
  lastSeasonDoneOrSkipped: boolean;
  movementScreenDone: boolean;
  s2Done: boolean;
  analysesDone: readonly AnalysisModule[];
  sixWeekTestDone: boolean;
  modules: readonly string[];
}

export const STEP_LABELS: Record<StepId, string> = {
  1: "Your profile",
  2: "Last season's stats (optional, player-reported)",
  3: "Movement and safety check",
  4: "Tex Vision S2 test",
  5: "One video analysis for each part of your plan",
  6: "First 6-week test",
};

export function requiredAnalyses(modules: readonly string[]): AnalysisModule[] {
  const m = [...modules];
  return (["hitting", "pitching", "throwing"] as const).filter((f) => hasFeatureAccess(m, f));
}

export function assessmentSteps(i: AssessmentInput): Record<StepId, StepState> {
  const need = requiredAnalyses(i.modules);
  const done: Record<StepId, boolean> = {
    1: i.onboardingDone,
    2: i.lastSeasonDoneOrSkipped,
    3: i.movementScreenDone,
    4: i.s2Done,
    5: need.every((m) => i.analysesDone.includes(m)),
    6: i.sixWeekTestDone,
  };
  const st = (id: StepId, unlocked: boolean): StepState => (done[id] ? "done" : unlocked ? "open" : "locked");
  return {
    1: st(1, true),
    2: st(2, true),
    3: st(3, true),
    4: st(4, true),
    5: st(5, true),
    6: st(6, true),
  };
}

export function assessmentComplete(i: AssessmentInput): boolean {
  return Object.values(assessmentSteps(i)).every((s) => s === "done");
}
