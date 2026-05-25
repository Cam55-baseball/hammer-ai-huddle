/**
 * Canonical ASB emission surface.
 *
 * Single I/O wrapper around supabase inserts into the ASB ledger.
 * All ASB producers MUST go through this so observability and
 * idempotency-dedupe semantics stay uniform.
 *
 * Contract:
 *  - Never throws. Additive emission must NEVER break legacy paths.
 *  - Unique-conflict (Postgres 23505) on idempotency_key is logged as
 *    dedupe (not failure) — replay-safe append-only semantics.
 *  - Any other error is logged at error level; the call still resolves.
 */
import { supabase } from "@/integrations/supabase/client";

export interface AsbEmitRow {
  event_id: string;
  athlete_id: string;
  topic_id: string;
  actor_role: "athlete" | "coach" | "parent" | "org" | "ai" | "system" | "medical";
  actor_id: string | null;
  occurred_at: string;
  ingested_at: string;
  effective_at: string;
  valid_from: string;
  valid_to?: string | null;
  payload: Record<string, unknown>;
  engine_version: string;
  idempotency_key: string;
  causality_refs: unknown;
  lineage_refs: unknown;
}

export interface AsbLineageEdge {
  parent_event_id: string;
  child_event_id: string;
  derivation_type: string;
  engine_version: string;
}

export async function emitAsbEvent(row: AsbEmitRow): Promise<void> {
  try {
    const { error } = await supabase.from("asb_events").insert(row as never);
    if (!error) {
      console.info("[asb] emit", {
        event_id: row.event_id,
        topic_id: row.topic_id,
        engine_version: row.engine_version,
      });
      return;
    }
    // Postgres unique_violation
    if ((error as { code?: string }).code === "23505") {
      console.info("[asb] dedupe", {
        idempotency_key: row.idempotency_key,
        topic_id: row.topic_id,
      });
      return;
    }
    console.error("[asb] emit_failed", {
      topic_id: row.topic_id,
      code: (error as { code?: string }).code,
      message: error.message,
    });
  } catch (e) {
    console.error("[asb] emit_threw", {
      topic_id: row.topic_id,
      message: (e as Error)?.message,
    });
  }
}

export async function emitAsbLineage(edge: AsbLineageEdge): Promise<void> {
  try {
    const { error } = await supabase
      .from("asb_event_lineage")
      .insert(edge as never);
    if (!error) {
      console.info("[asb] lineage", edge);
      return;
    }
    if ((error as { code?: string }).code === "23505") {
      console.info("[asb] lineage_dedupe", edge);
      return;
    }
    console.error("[asb] lineage_failed", {
      derivation_type: edge.derivation_type,
      code: (error as { code?: string }).code,
      message: error.message,
    });
  } catch (e) {
    console.error("[asb] lineage_threw", {
      derivation_type: edge.derivation_type,
      message: (e as Error)?.message,
    });
  }
}
