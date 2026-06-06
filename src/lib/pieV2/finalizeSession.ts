/**
 * PIE V2 — session finalization orchestrator.
 *
 * Single entry point used by capture surfaces (PitchingV2MicroInput +
 * PieV2FrameTagger after a session closes). Drives the deterministic
 * runtime chain:
 *
 *   reps[] → aggregateSession → emitPieV2SessionAggregate
 *          → deriveInjuryCaution → emitPieV2ArmHealthCaution (when level≠none)
 *
 * Pure orchestration over already-pure scoring + aggregation. Replay-safe
 * at pinned PIE_V2_ENGINE_VERSION. No new storage surface — every side
 * effect rides the canonical `emitAsbEvent` path.
 *
 * Subordinate to Eternal Laws, Megaphase 76–90 event-fabric doctrine,
 * Phase 46 ledger supremacy, Phase 47 RP-1…RP-10 replay legality, and
 * RR-6 injury-recovery constitution (athlete-reported pain outranks
 * inferred mechanical risk; system never diagnoses, never prescribes).
 */
import { aggregateSession } from "./aggregate";
import { emitPieV2SessionAggregate, emitPieV2ArmHealthCaution } from "./emit";
import { deriveInjuryCaution } from "./injuryDetection";
import type { PieV2RepInput, PieV2SessionAggregate } from "./types";
import type { PieV2InjuryCaution } from "./injuryDetection";

export interface FinalizeSessionInput {
  session_id: string;
  athlete_id: string;
  reps: PieV2RepInput[];
  /** Prior session aggregates used for cross-session arm-slot drift detection. */
  recent_aggregates?: PieV2SessionAggregate[];
  computed_at?: string;
  parent_aggregate_event_id?: string;
}

export interface FinalizeSessionResult {
  aggregate: PieV2SessionAggregate;
  caution: PieV2InjuryCaution;
  caution_emitted: boolean;
}

export async function finalizePieV2Session(
  input: FinalizeSessionInput,
): Promise<FinalizeSessionResult> {
  const computed_at = input.computed_at ?? new Date().toISOString();
  const aggregate = aggregateSession(
    input.session_id,
    input.athlete_id,
    input.reps,
    computed_at,
  );

  // 1) Canonical session aggregate event.
  await emitPieV2SessionAggregate(aggregate);

  // 2) RR-6 advisory — never diagnoses, never prescribes. Only emits when
  //    level escalates above "none". Athlete-reported pain alone is enough
  //    to escalate to "watch" per RR-6 supremacy.
  const caution = deriveInjuryCaution(aggregate, input.recent_aggregates ?? []);
  let caution_emitted = false;
  if (caution.level !== "none") {
    await emitPieV2ArmHealthCaution({
      athlete_id: input.athlete_id,
      session_id: input.session_id,
      occurred_at: computed_at,
      level: caution.level,
      contributing_factors: caution.contributing_factors,
      athlete_reported_pain: caution.athlete_reported_pain,
      recommended_action: caution.recommended_action,
      parent_aggregate_event_id: input.parent_aggregate_event_id,
    });
    caution_emitted = true;
  }

  return { aggregate, caution, caution_emitted };
}
