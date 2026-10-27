/**
 * Plan 4 §B — one-time initial assessment.
 * Embedded six-step mode. Answers are optional; done/skipped navigation
 * is persisted separately and never invents test results.
 * Step 5 = one analysis for each module INCLUDED in the subscription only.
 * Baserunning IQ and Game IQ are never part of it.
 */
import { hasFeatureAccess } from "@/utils/tierAccess";
import { ANALYSIS_TYPES, type AnalysisType } from "../../../supabase/functions/_shared/analysisTypes";

export type StepId = 1 | 2 | 3 | 4 | 5 | 6;
export type StepState = "locked" | "open" | "done";
export type AnalysisModule = AnalysisType;
export type StepProgress = Partial<Record<StepId, "done" | "skipped">>;

export interface AssessmentInput {
  onboardingDone: boolean;
  lastSeasonDoneOrSkipped: boolean;
  movementScreenDone: boolean;
  s2Done: boolean;
  analysesDone: readonly AnalysisModule[];
  sixWeekTestDone: boolean;
  modules: readonly string[];
  progress?: StepProgress;
}

export const STEP_LABELS: Record<StepId, string> = {
  1: "Your profile",
  2: "Last season's stats (optional, player-reported)",
  3: "Movement and safety check",
  4: "Tex Vision S2 test",
  5: "Your first analyses",
  6: "First 6-week test",
};

export function requiredAnalyses(modules: readonly string[]): AnalysisModule[] {
  const m = [...modules];
  return ANALYSIS_TYPES.filter((f) => hasFeatureAccess(m, f));
}

/** Use this assessment's sport and the saved active entitlement, never a role bypass. */
export function assessmentModules(subscription: { status: string; subscribed_modules: readonly string[] | null } | null | undefined, sport: "baseball" | "softball"): string[] {
  return subscription?.status === "active" ? (subscription.subscribed_modules ?? []).filter(m => m.startsWith(`${sport}_`)) : [];
}

export function previousAssessmentStep(step: StepId, steps: Record<StepId, StepState>): StepId | null {
  for (let id = step - 1; id >= 1; id--) {
    const candidate = id as StepId;
    if (steps[candidate] !== "locked") return candidate;
  }
  return null;
}

export function assessmentSteps(i: AssessmentInput): Record<StepId, StepState> {
  const need = requiredAnalyses(i.modules);
  const done: Record<StepId, boolean> = {
    1: i.onboardingDone,
    2: i.lastSeasonDoneOrSkipped,
    3: i.movementScreenDone,
    4: false,
    5: need.every((m) => i.analysesDone.includes(m)),
    6: false,
  };
  for (const id of [1, 2, 3, 4, 5, 6] as StepId[]) {
    if (i.progress?.[id]) done[id] = true;
  }
  const st = (id: StepId, unlocked: boolean): StepState => (done[id] ? "done" : unlocked ? "open" : "locked");
  const foundationDone = done[1] && done[2] && done[3];
  return {
    1: st(1, true),
    2: st(2, done[1]),
    3: st(3, done[1] && done[2]),
    4: st(4, foundationDone),
    5: st(5, foundationDone),
    6: st(6, foundationDone),
  };
}

export function assessmentComplete(i: AssessmentInput): boolean {
  return Object.values(assessmentSteps(i)).every((s) => s === "done");
}

/** Result saves can finish the last step without another navigation tap. */
export function shouldFinalizeAssessment(i: AssessmentInput, completedAt: string | null | undefined): boolean {
  return !completedAt && assessmentComplete(i);
}
