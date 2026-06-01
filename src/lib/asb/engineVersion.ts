/**
 * Canonical engine_version source for client-side ASB emission.
 * Pinned at write-time. Never mutated retroactively.
 */
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

/** Stable key-sorted JSON. Deterministic across runs for the same logical value. */
export function canonicalPayload(v: unknown): string {
  return JSON.stringify(canonicalize(v as JsonValue));
}

/** sha256 hex of the input string via SubtleCrypto, with node-crypto fallback. */
async function sha256Hex(s: string): Promise<string> {
  const subtle =
    (globalThis as { crypto?: { subtle?: SubtleCrypto } }).crypto?.subtle;
  if (subtle) {
    const buf = await subtle.digest("SHA-256", new TextEncoder().encode(s));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  const nodeCrypto = await import("node:crypto");
  return nodeCrypto.createHash("sha256").update(s).digest("hex");
}

export interface IdempotencyInputs {
  athlete_id: string;
  topic_id: string;
  occurred_at: string;
  payload: unknown;
}

/**
 * Deterministic idempotency key.
 * sha256(athlete_id | topic_id | occurred_at | canonical(payload))
 */
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
