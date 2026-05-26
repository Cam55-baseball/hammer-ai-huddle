import { memoize } from "./types";

export interface OnboardingState {
  steps: string[];
  primerAcknowledged: boolean;
  path: string | null;
  lastSource: string | null;
}
const PREFIXES = ["onboarding."];

export const buildOnboardingState = memoize<OnboardingState>((rows) => {
  const seen = new Set<string>();
  const steps: string[] = [];
  let primerAcknowledged = false;
  let path: string | null = null;
  let lastSource: string | null = null;
  for (const r of rows) {
    const p = r.payload as { step?: string; path?: string } | undefined;
    if (r.topic_id === "onboarding.step_completed" && p?.step && !seen.has(p.step)) {
      seen.add(p.step);
      steps.push(p.step);
      lastSource = r.event_id;
    }
    if (r.topic_id === "onboarding.primer_acknowledged") {
      primerAcknowledged = true;
      lastSource = r.event_id;
    }
    if (r.topic_id === "onboarding.path_selected" && p?.path) {
      path = p.path;
      lastSource = r.event_id;
    }
  }
  return { steps, primerAcknowledged, path, lastSource };
});

export function onboardingState(rows: Parameters<typeof buildOnboardingState>[0], scope: Parameters<typeof buildOnboardingState>[1]) {
  return buildOnboardingState(rows, scope, PREFIXES);
}
