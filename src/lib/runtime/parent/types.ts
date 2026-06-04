/**
 * Hammer Wave 4 — C4 Parent Voice (types)
 *
 * Pure types. Parent Voice is an interpretive overlay only. Never authors
 * organism_truth, athlete_intent, authority_override, hard_stop, or
 * rehabilitation_state. RR-5 / RR-6 / RR-8 enforced at the resolver layer.
 *
 * Constitutional subordination: Eternal Laws · Megaphase 151–160 · RR-5 · RR-6 ·
 * RR-8 · Wave 1 Ratified · Wave 2 Ratified · Wave 3 Ratified ·
 * Wave 4 Execution Package §0, §1, §4.
 */
import type { GuidanceSlotsOutput } from "@/lib/runtime/guidance/types";
import type { OnboardingInput } from "@/lib/runtime/onboarding/types";
import type { SetbackInput } from "@/lib/runtime/setback/types";

export type ParentStateKind =
  | "invited-not-accepted"
  | "accepted-no-athlete-activity"
  | "accepted-active-athlete"
  | "accepted-missingness-state"
  | "accepted-recovery-state"
  | "accepted-onboarding-state"
  | "accepted-setback-state";

/** Closed set of verbs Parent Voice may use. Wave 4 §4. */
export type ParentVerb = "explain" | "summarize" | "guide" | "route";
export const PARENT_ALLOWED_VERBS: ReadonlyArray<ParentVerb> = [
  "explain",
  "summarize",
  "guide",
  "route",
] as const;

export interface ParentInput {
  readonly state: ParentStateKind;
  /** Safeguarding-precedence override; non-downgradable. */
  readonly safeguardingActive?: boolean;
  /** Opaque projection ids already disclosed to the parent. */
  readonly knownSignalRefs?: ReadonlyArray<string>;
  /** Opaque ids of signal dimensions that are missing (RR-6/RR-8 visibility). */
  readonly unknownSignalRefs?: ReadonlyArray<string>;
  /** Replay-traceable lineage handle for any handoff. */
  readonly lineageHandle?: string;
  /** Required when state === "accepted-onboarding-state". */
  readonly onboarding?: OnboardingInput;
  /** Required when state === "accepted-setback-state". */
  readonly setback?: SetbackInput;
}

export interface ParentDescriptor {
  readonly state: ParentStateKind;
  readonly slots: GuidanceSlotsOutput;
  /** Always true — missingness is never collapsed at the parent surface. */
  readonly missingnessVisible: true;
  readonly knownSignalRefs: ReadonlyArray<string>;
  readonly unknownSignalRefs: ReadonlyArray<string>;
  readonly allowedVerbs: ReadonlyArray<ParentVerb>;
}

export interface ParentResult {
  readonly descriptor: ParentDescriptor;
}
