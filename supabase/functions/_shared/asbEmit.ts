// Canonical ASB emission helper for edge functions (Deno).
// Mirrors src/lib/asb/{engineVersion,emit}.ts. Additive-only.
// Never throws. Unique-conflict on idempotency_key is dedupe (not failure).
export const ENGINE_VERSION = "asb-1.0.0" as const;

type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [k: string]: JsonValue }
  | JsonValue[];

function canonicalize(v: JsonValue): JsonValue {
  if (Array.isArray(v)) return v.map(canonicalize);
  if (v !== null && typeof v === "object") {
    const out: Record<string, JsonValue> = {};
    for (const k of Object.keys(v as Record<string, JsonValue>).sort()) {
      out[k] = canonicalize((v as Record<string, JsonValue>)[k]);
    }
    return out;
  }
  return v;
}

export function canonicalPayload(v: unknown): string {
  return JSON.stringify(canonicalize(v as JsonValue));
}

export async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface IdempotencyInputs {
  athlete_id: string;
  topic_id: string;
  occurred_at: string;
  payload: unknown;
}

export async function computeIdempotencyKey(
  inputs: IdempotencyInputs,
): Promise<string> {
  const material = [
    inputs.athlete_id,
    inputs.topic_id,
    inputs.occurred_at,
    canonicalPayload(inputs.payload),
  ].join("|");
  return sha256Hex(material);
}

export interface AsbEmitRow {
  event_id: string;
  athlete_id: string;
  topic_id: string;
  actor_role:
    | "athlete"
    | "coach"
    | "parent"
    | "org"
    | "ai"
    | "system"
    | "medical";
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

// deno-lint-ignore no-explicit-any
export async function emitAsbEvent(supabase: any, row: AsbEmitRow): Promise<void> {
  try {
    const { error } = await supabase.from("asb_events").insert(row);
    if (!error) {
      console.info("[asb] emit", {
        event_id: row.event_id,
        topic_id: row.topic_id,
        engine_version: row.engine_version,
      });
      return;
    }
    if (error.code === "23505") {
      console.info("[asb] dedupe", {
        idempotency_key: row.idempotency_key,
        topic_id: row.topic_id,
      });
      return;
    }
    console.error("[asb] emit_failed", {
      topic_id: row.topic_id,
      code: error.code,
      message: error.message,
    });
  } catch (e) {
    console.error("[asb] emit_threw", {
      topic_id: row.topic_id,
      message: (e as Error)?.message,
    });
  }
}

// deno-lint-ignore no-explicit-any
export async function emitAsbLineage(supabase: any, edge: AsbLineageEdge): Promise<void> {
  try {
    const { error } = await supabase.from("asb_event_lineage").insert(edge);
    if (!error) {
      console.info("[asb] lineage", edge);
      return;
    }
    if (error.code === "23505") {
      console.info("[asb] lineage_dedupe", edge);
      return;
    }
    console.error("[asb] lineage_failed", {
      derivation_type: edge.derivation_type,
      code: error.code,
      message: error.message,
    });
  } catch (e) {
    console.error("[asb] lineage_threw", {
      derivation_type: edge.derivation_type,
      message: (e as Error)?.message,
    });
  }
}

/**
 * Build a canonical ASB row with sensible defaults. Caller supplies
 * athlete_id, topic_id, occurred_at, payload. Idempotency key is computed
 * deterministically from (athlete_id, topic_id, occurred_at, payload).
 */
export async function buildAsbRow(params: {
  athlete_id: string;
  topic_id: string;
  occurred_at: string;
  payload: Record<string, unknown>;
  actor_role?: AsbEmitRow["actor_role"];
  actor_id?: string | null;
  causality_refs?: unknown;
  lineage_refs?: unknown;
}): Promise<AsbEmitRow> {
  const now = new Date().toISOString();
  return {
    event_id: crypto.randomUUID(),
    athlete_id: params.athlete_id,
    topic_id: params.topic_id,
    actor_role: params.actor_role ?? "system",
    actor_id: params.actor_id ?? null,
    occurred_at: params.occurred_at,
    ingested_at: now,
    effective_at: params.occurred_at,
    valid_from: params.occurred_at,
    valid_to: null,
    payload: params.payload,
    engine_version: ENGINE_VERSION,
    idempotency_key: await computeIdempotencyKey({
      athlete_id: params.athlete_id,
      topic_id: params.topic_id,
      occurred_at: params.occurred_at,
      payload: params.payload,
    }),
    causality_refs: params.causality_refs ?? [],
    lineage_refs: params.lineage_refs ?? [],
  };
}
