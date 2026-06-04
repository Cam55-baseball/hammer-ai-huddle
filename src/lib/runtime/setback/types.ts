/**
 * Hammer Wave 3 — C5 First Setback Guidance
 *
 * Pure types only. No runtime, no I/O.
 *
 * Encodes the 6 setback states from Wave 3 Execution Package §2 + §5.
 * The setback resolver may expose factual missingness and route a lawful
 * handoff — it may not invent reasons, assume emotions, predict outcomes,
 * author narrative, or diagnose.
 *
 * Constitutional subordination: Eternal Laws · Megaphase 151–160 · RR-5 · RR-6 ·
 * RR-8 · Wave 1 Ratified · Wave 2 Ratified · Wave 3 Execution Package §1, §5.
 */
import type { GuidanceSlotsOutput } from "@/lib/runtime/guidance/types";

export type SetbackStateKind =
  | "missed-day"
  | "missed-week"
  | "interrupted-prescription"
  | "incomplete-logging"
  | "recovery-interruption"
  | "unavailable-signal";

export interface SetbackInput {
  readonly state: SetbackStateKind;
  /** Safeguarding-precedence override; non-downgradable. */
  readonly safeguardingActive?: boolean;
  /** Replay-traceable opaque projection ids the athlete already saw. */
  readonly knownSignalRefs?: ReadonlyArray<string>;
  /** Opaque identifiers of signal dimensions that are missing. */
  readonly unknownSignalRefs?: ReadonlyArray<string>;
  /** Replay-traceable lineage handle for the handoff candidate. */
  readonly lineageHandle?: string;
}

export interface SetbackDescriptor {
  readonly state: SetbackStateKind;
  readonly slots: GuidanceSlotsOutput;
  /** Always true at the descriptor level — missingness is never collapsed. */
  readonly missingnessVisible: true;
  readonly knownSignalRefs: ReadonlyArray<string>;
  readonly unknownSignalRefs: ReadonlyArray<string>;
}

export interface SetbackResult {
  readonly descriptor: SetbackDescriptor;
}
