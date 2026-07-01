// Structured `why_v2` payload — every prescription must answer the six
// mandatory constitutional questions. If any answer is missing, the
// prescription is invalid and must not be published.

import type { WicEngine } from "./constitution.ts";
import type { PrimaryAdaptation } from "./adaptationSelector.ts";

export interface WhyV2 {
  why_today: string;
  why_athlete: string;
  why_exercise: string;
  why_volume: string;
  why_order: string;
  why_recovery: string;
  adaptation: PrimaryAdaptation;
  engine: WicEngine;
  generator_version: string;
}

export function buildWhy(input: Partial<WhyV2> & { adaptation: PrimaryAdaptation; engine: WicEngine; generator_version: string }): WhyV2 {
  return {
    why_today: input.why_today ?? "",
    why_athlete: input.why_athlete ?? "",
    why_exercise: input.why_exercise ?? "",
    why_volume: input.why_volume ?? "",
    why_order: input.why_order ?? "",
    why_recovery: input.why_recovery ?? "",
    adaptation: input.adaptation,
    engine: input.engine,
    generator_version: input.generator_version,
  };
}

export function whyIsComplete(w: WhyV2): boolean {
  return !!(w.why_today && w.why_athlete && w.why_exercise && w.why_volume && w.why_order && w.why_recovery);
}
