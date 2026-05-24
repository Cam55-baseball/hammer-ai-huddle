/**
 * G2 — Replay Certification & Re-Derivation Visibility
 *
 * Pure, deterministic, side-effect-free projection + diff utilities.
 * Under RE-1…RE-10 and Phase 56, the re-derivation here is presented
 * as a *projection* of the canonical event ledger — never a re-authoring
 * of organism truth. The transparent merge below is the declared
 * derivation rule; if a key is absent from the input chain, it stays
 * absent (missingness is preserved, never imputed or smoothed).
 */

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [k: string]: JsonValue }
  | JsonValue[];

export type JsonObject = { [k: string]: JsonValue };

export interface ProvenanceEntry {
  source_event_id: string;
  source_index: number; // position in ordered input chain; chain.length - 1 = self
}

export interface ReDerivationResult {
  projection: JsonObject;
  provenance: Record<string, ProvenanceEntry>; // top-level key -> source
  engine_version: string;
  chain_length: number;
}

export interface ReplayInput {
  event_id: string;
  payload: JsonObject;
}

function isPlainObject(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Deep merge for plain objects only. Arrays are replaced wholesale (never
 * concatenated, never deduped) — concatenation would fabricate ordering and
 * is forbidden. Non-object values overwrite.
 */
function deepMerge(a: JsonValue, b: JsonValue): JsonValue {
  if (isPlainObject(a) && isPlainObject(b)) {
    const out: JsonObject = { ...a };
    for (const k of Object.keys(b)) {
      out[k] = k in a ? deepMerge(a[k], b[k]) : b[k];
    }
    return out;
  }
  return b;
}

/**
 * Deterministic last-write-wins projection across the ordered replay chain.
 * Chain order is [ancestor_0, ancestor_1, …, ancestor_n, self].
 */
export function computeReDerivedState(
  chain: ReplayInput[],
  engineVersion: string,
): ReDerivationResult {
  const projection: JsonObject = {};
  const provenance: Record<string, ProvenanceEntry> = {};

  chain.forEach((input, idx) => {
    if (!isPlainObject(input.payload)) return; // payload contract is jsonb object
    for (const key of Object.keys(input.payload)) {
      projection[key] =
        key in projection
          ? deepMerge(projection[key], input.payload[key])
          : input.payload[key];
      provenance[key] = { source_event_id: input.event_id, source_index: idx };
    }
  });

  return {
    projection,
    provenance,
    engine_version: engineVersion,
    chain_length: chain.length,
  };
}

/* ---------- Canonical JSON equality (no rounding, no tolerance) ---------- */

function canonicalize(v: JsonValue): JsonValue {
  if (Array.isArray(v)) return v.map(canonicalize);
  if (isPlainObject(v)) {
    const out: JsonObject = {};
    for (const k of Object.keys(v).sort()) out[k] = canonicalize(v[k]);
    return out;
  }
  return v;
}

export function canonicalJson(v: JsonValue): string {
  return JSON.stringify(canonicalize(v));
}

function deepEqual(a: JsonValue, b: JsonValue): boolean {
  return canonicalJson(a) === canonicalJson(b);
}

/* ---------- Snapshot diff ---------- */

export interface SnapshotDiff {
  added: string[]; // keys present in reDerived, absent in original
  removed: string[]; // keys present in original, absent in reDerived
  changed: { key: string; before: JsonValue; after: JsonValue }[];
  unchanged: string[];
}

export function diffSnapshots(
  original: JsonObject,
  reDerived: JsonObject,
): SnapshotDiff {
  const added: string[] = [];
  const removed: string[] = [];
  const changed: SnapshotDiff["changed"] = [];
  const unchanged: string[] = [];

  const allKeys = new Set<string>([
    ...Object.keys(original),
    ...Object.keys(reDerived),
  ]);

  for (const key of Array.from(allKeys).sort()) {
    const inOrig = key in original;
    const inDer = key in reDerived;
    if (!inOrig && inDer) added.push(key);
    else if (inOrig && !inDer) removed.push(key);
    else if (inOrig && inDer) {
      if (deepEqual(original[key], reDerived[key])) unchanged.push(key);
      else changed.push({ key, before: original[key], after: reDerived[key] });
    }
  }

  return { added, removed, changed, unchanged };
}

/* ---------- Certification verdict ---------- */

export type CertificationVerdict = "certified" | "divergent" | "uncertifiable";

export interface CertificationResult {
  verdict: CertificationVerdict;
  reasons: string[];
  diff: SnapshotDiff | null;
}

export interface CertifyInputs {
  snapshotPayload: JsonObject | null;
  reDerivedPayload: JsonObject;
  snapshotEngineVersion: string | null;
  eventEngineVersion: string;
  chainLength: number;
  hasEngineVersionInRegistry: boolean;
}

export function certify(inputs: CertifyInputs): CertificationResult {
  const reasons: string[] = [];

  if (!inputs.hasEngineVersionInRegistry) {
    reasons.push(
      `Engine version "${inputs.eventEngineVersion}" not found in asb_engine_versions registry — replay equivalence cannot be pinned.`,
    );
  }
  if (inputs.snapshotPayload == null) {
    reasons.push(
      "No state snapshot recorded as_of this event — nothing to certify against.",
    );
  }
  if (
    inputs.snapshotEngineVersion != null &&
    inputs.snapshotEngineVersion !== inputs.eventEngineVersion
  ) {
    reasons.push(
      `Snapshot engine_version (${inputs.snapshotEngineVersion}) does not match event engine_version (${inputs.eventEngineVersion}) — version pin broken.`,
    );
  }
  if (inputs.chainLength <= 1) {
    reasons.push(
      "Replay chain contains only the event itself (no lineage ancestors) — re-derivation is trivially equal to the event payload only.",
    );
  }

  if (inputs.snapshotPayload == null || !inputs.hasEngineVersionInRegistry) {
    return { verdict: "uncertifiable", reasons, diff: null };
  }
  if (
    inputs.snapshotEngineVersion != null &&
    inputs.snapshotEngineVersion !== inputs.eventEngineVersion
  ) {
    return { verdict: "uncertifiable", reasons, diff: null };
  }

  const diff = diffSnapshots(inputs.snapshotPayload, inputs.reDerivedPayload);
  const isEqual =
    diff.added.length === 0 &&
    diff.removed.length === 0 &&
    diff.changed.length === 0;

  return {
    verdict: isEqual ? "certified" : "divergent",
    reasons,
    diff,
  };
}
