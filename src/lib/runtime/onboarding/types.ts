/**
 * Hammer Wave 3 — C3 Onboarding Presence
 *
 * Pure types only. No runtime, no I/O.
 *
 * Enumerates the 7 onboarding states defined in
 * `docs/asb/hammer-wave-3-execution-package.md` §2. Inputs and outputs are
 * descriptors over Wave 1 (`classifySilenceZone`) and Wave 2
 * (`resolveGuidanceSlots`, `resolveHandoff`) primitives. No copy. No prompts.
 *
 * Constitutional subordination: Eternal Laws · Megaphase 151–160 · RR-5 · RR-6 ·
 * RR-8 · Wave 1 Ratified · Wave 2 Ratified · Wave 3 Execution Package §1, §4.
 */
import type { GuidanceSlotsOutput } from "@/lib/runtime/guidance/types";

export type OnboardingStateKind =
  | "first-login"
  | "first-completed-action"
  | "first-prescription"
  | "first-week"
  | "incomplete-onboarding"
  | "partial-profile"
  | "no-activity";

export interface OnboardingInput {
  readonly state: OnboardingStateKind;
  /** Safeguarding-precedence override; non-downgradable. */
  readonly safeguardingActive?: boolean;
  /** Opaque projection ids already disclosed to the athlete (never prose). */
  readonly contextSummaryRefs?: ReadonlyArray<string>;
  /** Replay-traceable lineage handle for any handoff (ledger pointer). */
  readonly lineageHandle?: string;
}

export interface OnboardingDescriptor {
  readonly state: OnboardingStateKind;
  readonly slots: GuidanceSlotsOutput;
}

export interface OnboardingResult {
  readonly descriptor: OnboardingDescriptor;
}
