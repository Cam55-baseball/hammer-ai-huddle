// Phase 11–12 — Global Determinism Lock
// Single deterministic enforcement layer used by every WIC generator.
// Additive-only. No behavioral changes to selection logic.

export const DETERMINISM_LOCK_VERSION = "det_v1";

/** Canonical JSON stringify — recursive key sort so hashes are stable. */
export function canonicalJson(value: unknown): string {
  const seen = new WeakSet();
  const walk = (v: unknown): unknown => {
    if (v === null || typeof v !== "object") return v;
    if (seen.has(v as object)) return null;
    seen.add(v as object);
    if (Array.isArray(v)) return v.map(walk);
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) {
      out[k] = walk((v as Record<string, unknown>)[k]);
    }
    return out;
  };
  return JSON.stringify(walk(value));
}

/** FNV-1a 64-bit → hex. Deterministic, no crypto import, no async. */
export function fnv1a64Hex(input: string): string {
  let h1 = 0xcbf29ce4 >>> 0;
  let h2 = 0x84222325 >>> 0;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h2 ^= c & 0xff;
    // multiply by FNV prime 0x100000001b3 emulated on two 32-bit halves
    const lo = Math.imul(h2, 0x000001b3);
    const hi = Math.imul(h1, 0x000001b3) + Math.imul(h2, 0x00000100);
    h2 = lo >>> 0;
    h1 = hi >>> 0;
  }
  return (h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0"));
}

/** Stable seed for a generation. */
export function stableSeed(
  videoId: string | null | undefined,
  athleteId: string,
  contextHash: string,
): string {
  const key = `${DETERMINISM_LOCK_VERSION}|${videoId ?? "none"}|${athleteId}|${contextHash}`;
  return fnv1a64Hex(key);
}

/** UTC-normalize a plan date to ISO YYYY-MM-DD. */
export function utcPlanDate(input: string | Date): string {
  const d = typeof input === "string" ? new Date(`${input}T00:00:00Z`) : input;
  return d.toISOString().slice(0, 10);
}

/** Canonical string sort — deterministic across engines. */
export function canonicalSort<T>(items: readonly T[], key: (t: T) => string): T[] {
  return [...items].sort((a, b) => {
    const ka = key(a); const kb = key(b);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
}

/** Hash a governance slice of the movement catalog. */
export function governanceCatalogHash(rows: Array<Record<string, unknown>>): string {
  const slice = canonicalSort(rows, (r) => String(r.slug ?? "")).map((r) => ({
    slug: r.slug,
    category: r.category,
    conditioning_category: r.conditioning_category ?? null,
    cross_sport_category: r.cross_sport_category ?? null,
    recovery_category: r.recovery_category ?? null,
    arm_care_category: r.arm_care_category ?? null,
    energy_system: r.energy_system ?? null,
    recovery_class: r.recovery_class ?? null,
    throwing_phase: r.throwing_phase ?? null,
    speed_category: (r as Record<string, unknown>).speed_category ?? null,
    bat_speed_category: (r as Record<string, unknown>).bat_speed_category ?? null,
  }));
  return fnv1a64Hex(canonicalJson(slice));
}

export interface DeterminismTrace {
  version: string;
  seed: string;
  utc_plan_date: string;
  context_hash: string;
  governance_catalog_hash: string;
  engine_execution_order: string[];
}

export function buildDeterminismTrace(input: {
  seed: string;
  utcPlanDate: string;
  contextHash: string;
  governanceCatalogHash: string;
  engineExecutionOrder: string[];
}): DeterminismTrace {
  return {
    version: DETERMINISM_LOCK_VERSION,
    seed: input.seed,
    utc_plan_date: input.utcPlanDate,
    context_hash: input.contextHash,
    governance_catalog_hash: input.governanceCatalogHash,
    engine_execution_order: input.engineExecutionOrder,
  };
}
