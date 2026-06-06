/**
 * PIE V2 — canonical session projection writer.
 *
 * Single writer path used by `finalizePieV2Session` to project the
 * replay-derived aggregate + RR-6 caution onto the two columns the
 * read-side surfaces consume:
 *
 *   performance_sessions.pie_v2_signals        (per-session aggregate)
 *   athlete_foundation_state.pie_v2_caution_state  (latest arm-health caution)
 *
 * Replay-safe / idempotent / lineage-preserving / engine_version-pinned.
 *
 * Subordinate to:
 *   - Megaphase 76–90 persistence authority (storage never authors truth;
 *     projections derive strictly from canonical ledger events)
 *   - Phase 46 EL ledger supremacy
 *   - Phase 47 RP-1…RP-10 replay equivalence
 *   - RR-6 injury-recovery doctrine (never diagnoses, never prescribes)
 */
import { supabase } from "@/integrations/supabase/client";
import { PIE_V2_ENGINE_VERSION, type PieV2SessionAggregate } from "./types";
import type { PieV2InjuryCaution } from "./injuryDetection";

export interface PersistPieV2SessionInput {
  session_id: string;
  athlete_id: string;
  aggregate: PieV2SessionAggregate;
  caution: PieV2InjuryCaution;
}

export interface PersistPieV2SessionResult {
  signals_written: boolean;
  caution_written: boolean;
  caution_cleared: boolean;
}

/**
 * Project the aggregate + caution onto the two read-side columns.
 * Errors are logged and swallowed so a projection failure never breaks
 * the canonical event-fabric path (which already succeeded).
 */
export async function persistPieV2Session(
  input: PersistPieV2SessionInput,
): Promise<PersistPieV2SessionResult> {
  const result: PersistPieV2SessionResult = {
    signals_written: false,
    caution_written: false,
    caution_cleared: false,
  };

  // 1) performance_sessions.pie_v2_signals — per-session aggregate.
  try {
    const signalsPayload = {
      aggregate: input.aggregate,
      engine_version: PIE_V2_ENGINE_VERSION,
      computed_at: input.aggregate.computed_at,
    };
    const { error } = await supabase
      .from("performance_sessions")
      .update({ pie_v2_signals: signalsPayload as never })
      .eq("id", input.session_id);
    if (error) {
      console.error("[pieV2] persist_signals_failed", {
        session_id: input.session_id,
        message: error.message,
      });
    } else {
      result.signals_written = true;
    }
  } catch (e) {
    console.error("[pieV2] persist_signals_threw", {
      session_id: input.session_id,
      message: (e as Error)?.message,
    });
  }

  // 2) athlete_foundation_state.pie_v2_caution_state — latest RR-6 advisory.
  //    Clears to null when the latest session shows no caution, so the
  //    coach/athlete surface always reflects current state.
  try {
    const caution_state =
      input.caution.level === "none"
        ? null
        : {
            level: input.caution.level,
            contributing_factors: input.caution.contributing_factors,
            athlete_reported_pain: input.caution.athlete_reported_pain,
            recommended_action: input.caution.recommended_action,
            session_id: input.session_id,
            engine_version: PIE_V2_ENGINE_VERSION,
            computed_at: input.aggregate.computed_at,
          };

    // Upsert so the row exists for first-time athletes.
    const { error } = await supabase
      .from("athlete_foundation_state")
      .upsert(
        {
          user_id: input.athlete_id,
          pie_v2_caution_state: caution_state as never,
        } as never,
        { onConflict: "user_id" },
      );
    if (error) {
      console.error("[pieV2] persist_caution_failed", {
        athlete_id: input.athlete_id,
        message: error.message,
      });
    } else if (caution_state === null) {
      result.caution_cleared = true;
    } else {
      result.caution_written = true;
    }
  } catch (e) {
    console.error("[pieV2] persist_caution_threw", {
      athlete_id: input.athlete_id,
      message: (e as Error)?.message,
    });
  }

  return result;
}
