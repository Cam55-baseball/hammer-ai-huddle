// Phase 12+ — Engine Contract V-Final
// Deterministic post-hoc hash-stamping for every certifier's output.
// Additive-only: no engine internals are changed. This wrapper reads a
// certification result and derives the four canonical engine hashes.

import { canonicalJson, fnv1a64Hex } from "../determinism/globalDeterminismLock.ts";

export interface EngineSignature {
  engine: string;
  engine_signature_hash: string;
  deterministic_output_hash: string;
  substitution_trace_hash: string;
  category_resolution_hash: string;
  unresolved_categories: string[];
  unverified_substitutions: string[];
}

export interface CertificationLike {
  templateId?: string | null;
  categoryCoverage?: Record<string, unknown> | null;
  substitutionCompleteness?: number | null;
  validationStatus?: string | null;
  governanceVersion?: string | null;
  stamps?: Map<string, { substitution_ladder?: unknown; resolved_category?: unknown; verified?: boolean }>
        | Array<{ slug: string; substitution_ladder?: unknown; resolved_category?: unknown; verified?: boolean }>
        | null;
  fatal?: Array<{ code: string; message?: string }>;
  warn?: Array<{ code: string; message?: string }>;
}

function stampsToArray(
  stamps: CertificationLike["stamps"],
): Array<{ slug: string; substitution_ladder?: unknown; resolved_category?: unknown; verified?: boolean }> {
  if (!stamps) return [];
  if (Array.isArray(stamps)) return stamps;
  const out: Array<{ slug: string; substitution_ladder?: unknown; resolved_category?: unknown; verified?: boolean }> = [];
  stamps.forEach((v, slug) => out.push({ slug, ...v }));
  return out;
}

export function computeEngineSignature(engine: string, cert: CertificationLike | null | undefined): EngineSignature {
  const c = cert ?? {};
  const arr = stampsToArray(c.stamps);
  const subs = arr.map((s) => ({ slug: s.slug, ladder: s.substitution_ladder ?? null }));
  const cats = arr.map((s) => ({ slug: s.slug, cat: s.resolved_category ?? null }));

  const unresolvedCategories = cats.filter((c) => c.cat === null || c.cat === undefined || c.cat === "unresolved").map((c) => c.slug);
  const unverifiedSubstitutions = arr.filter((s) => s.substitution_ladder && s.verified === false).map((s) => s.slug);

  const detOut = {
    engine,
    templateId: c.templateId ?? null,
    validationStatus: c.validationStatus ?? null,
    governanceVersion: c.governanceVersion ?? null,
    categoryCoverage: c.categoryCoverage ?? null,
    substitutionCompleteness: c.substitutionCompleteness ?? null,
    subs,
    cats,
  };

  const substitution_trace_hash = fnv1a64Hex(canonicalJson(subs));
  const category_resolution_hash = fnv1a64Hex(canonicalJson(cats));
  const deterministic_output_hash = fnv1a64Hex(canonicalJson(detOut));
  const engine_signature_hash = fnv1a64Hex(
    canonicalJson({ engine, deterministic_output_hash, substitution_trace_hash, category_resolution_hash }),
  );

  return {
    engine,
    engine_signature_hash,
    deterministic_output_hash,
    substitution_trace_hash,
    category_resolution_hash,
    unresolved_categories: unresolvedCategories,
    unverified_substitutions: unverifiedSubstitutions,
  };
}

export function assertEngineContract(sig: EngineSignature): void {
  if (sig.unresolved_categories.length > 0) {
    throw new Error(`engine_contract_violation: ${sig.engine} has unresolved categories [${sig.unresolved_categories.join(",")}]`);
  }
  if (sig.unverified_substitutions.length > 0) {
    throw new Error(`engine_contract_violation: ${sig.engine} has unverified substitutions [${sig.unverified_substitutions.join(",")}]`);
  }
}
