/**
 * RR-8 — relational.life_context.* projection.
 *
 * Pure, deterministic, memoized. Folds life-context disclosures into:
 *   • currentContext     — most-recent disclosure per category (no inference
 *                          into empty categories — missingness preserved)
 *   • activePressureSignals — disclosures whose window is still open at the
 *                          last observed ledger timestamp (no wall-clock)
 *   • suppressionCandidates — refs the load surface MAY consult to soften
 *                          scheduled load. Never scores. Never authors truth.
 *   • continuityTimeline — chronological visible disclosures
 *   • revokedEventIds    — honoured on next rebuild (RR-8 invariant 2)
 *   • safeguardingHeld   — true if any visible disclosure carries
 *                          safeguarding_category (invariant 8)
 *   • missingness        — explicit knowledge gaps (never imputed —
 *                          invariant 3)
 *
 * Replay invariants:
 *   • Byte-identical output under identical inputs at pinned engine_version
 *     + reasoning_version.
 *   • Revocation removes downstream visibility on next rebuild — no cache,
 *     no grace period (RR-8 invariant 2).
 *   • Demo↔production firewall inherited from prepareRows.
 *   • No predictive scoring, no behavioural classification, no identity
 *     locking. No Date.now / Math.random / I/O.
 */
import { memoize, type Scope } from "./types";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";
import {
  LIFE_CONTEXT_TOPIC_PREFIX,
  LIFE_CONTEXT_TOPICS,
  LIFE_CONTEXT_CATEGORIES,
  type LifeContextCategory,
  type LifeContextIntensityBand,
} from "@/lib/runtime/relational/lifeContextSchemas";

export interface LifeContextDisclosureNode {
  event_id: string;
  category: LifeContextCategory;
  occurred_at: string;
  window_start: string;
  window_end: string;
  intensity_band: LifeContextIntensityBand;
  topic_tag: string | null;
  authority: "self" | "parent";
  visibility_scope: "self" | "parent" | "coach" | "demo";
  safeguarding_category: boolean;
  lineage_parent_ids: string[];
  missingness_fields: string[];
}

export interface LifeContextSuppressionCandidate {
  event_id: string;
  category: LifeContextCategory;
  intensity_band: LifeContextIntensityBand;
  topic_tag: string | null;
}

export interface LifeContextState {
  currentContext: Partial<
    Record<LifeContextCategory, LifeContextDisclosureNode>
  >;
  activePressureSignals: LifeContextDisclosureNode[];
  suppressionCandidates: LifeContextSuppressionCandidate[];
  continuityTimeline: LifeContextDisclosureNode[];
  revokedEventIds: string[];
  safeguardingHeld: boolean;
  missingness: {
    fields: string[];
    reason: "not_observed" | "redacted" | "consent_withheld";
    /** Categories with no observed disclosure (invariant 3 visibility). */
    categoriesWithoutDisclosure: LifeContextCategory[];
  };
}

const PREFIXES = [LIFE_CONTEXT_TOPIC_PREFIX];

function categoryOf(topicId: string): LifeContextCategory | null {
  switch (topicId) {
    case LIFE_CONTEXT_TOPICS.academic_load:
      return "academic_load";
    case LIFE_CONTEXT_TOPICS.schedule_stress:
      return "schedule_stress";
    case LIFE_CONTEXT_TOPICS.sleep_disruption:
      return "sleep_disruption";
    case LIFE_CONTEXT_TOPICS.travel_load:
      return "travel_load";
    case LIFE_CONTEXT_TOPICS.family_context:
      return "family_context";
    case LIFE_CONTEXT_TOPICS.general_pressure:
      return "general_pressure";
    default:
      return null;
  }
}

export const buildLifeContextState = memoize<LifeContextState>((rows) => {
  // Pass 1: collect revocations (RR-8 invariant 2).
  const revoked = new Set<string>();
  for (const r of rows) {
    if (r.topic_id !== LIFE_CONTEXT_TOPICS.disclosure_revocation) continue;
    const p = r.payload as { revokes_event_id?: string } | undefined;
    if (p?.revokes_event_id) revoked.add(p.revokes_event_id);
  }

  // Pass 2: fold visible disclosures.
  const nodes: LifeContextDisclosureNode[] = [];
  const missingFields = new Set<string>();
  let safeguardingHeld = false;
  for (const r of rows) {
    const category = categoryOf(r.topic_id);
    if (!category) continue;
    if (revoked.has(r.event_id)) continue;

    const p = (r.payload ?? {}) as Record<string, unknown>;
    const miss = p.missingness as
      | {
          fields?: string[];
          reason?: LifeContextState["missingness"]["reason"];
        }
      | undefined;
    for (const f of miss?.fields ?? []) missingFields.add(f);

    const safeguarding = Boolean(p.safeguarding_category);
    if (safeguarding) safeguardingHeld = true;

    nodes.push({
      event_id: r.event_id,
      category,
      occurred_at: r.occurred_at,
      window_start: (p.window_start as string | undefined) ?? r.occurred_at,
      window_end: (p.window_end as string | undefined) ?? r.occurred_at,
      intensity_band:
        (p.intensity_band as LifeContextIntensityBand | undefined) ??
        "moderate",
      topic_tag: (p.topic_tag as string | undefined) ?? null,
      authority:
        (p.authority as LifeContextDisclosureNode["authority"]) ?? "self",
      visibility_scope:
        (p.visibility_scope as LifeContextDisclosureNode["visibility_scope"]) ??
        "self",
      safeguarding_category: safeguarding,
      lineage_parent_ids: (p.lineage_parent_ids as string[] | undefined) ?? [],
      missingness_fields: miss?.fields ?? [],
    });
  }

  // Chronological timeline (prepareRows already sorted).
  const continuityTimeline = nodes;

  // currentContext — most-recent disclosure per category. No defaulting:
  // categories with no disclosures stay absent (invariant 3).
  const currentContext: Partial<
    Record<LifeContextCategory, LifeContextDisclosureNode>
  > = {};
  for (const n of nodes) {
    currentContext[n.category] = n; // last write wins == most recent
  }

  // activePressureSignals — disclosures whose window_end >= last observed
  // ledger timestamp. Deterministic, no Date.now.
  const lastObservedAt = nodes.length
    ? nodes[nodes.length - 1].occurred_at
    : null;
  const activePressureSignals: LifeContextDisclosureNode[] = lastObservedAt
    ? nodes.filter((n) => n.window_end >= lastObservedAt)
    : [];

  // suppressionCandidates — references only, never composite scores.
  // Ordered by most-recent first; deterministic.
  const suppressionCandidates: LifeContextSuppressionCandidate[] =
    activePressureSignals
      .slice()
      .reverse()
      .map((n) => ({
        event_id: n.event_id,
        category: n.category,
        intensity_band: n.intensity_band,
        topic_tag: n.topic_tag,
      }));

  // Missingness — explicit gap, never imputed.
  const observed = new Set(nodes.map((n) => n.category));
  const categoriesWithoutDisclosure = LIFE_CONTEXT_CATEGORIES.filter(
    (c) => !observed.has(c),
  );

  return {
    currentContext,
    activePressureSignals,
    suppressionCandidates,
    continuityTimeline,
    revokedEventIds: Array.from(revoked).sort(),
    safeguardingHeld,
    missingness: {
      fields: Array.from(missingFields).sort(),
      reason: "not_observed",
      categoriesWithoutDisclosure,
    },
  };
});

export function lifeContextState(
  rows: AsbEventRow[] | undefined,
  scope: Scope,
) {
  return buildLifeContextState(rows, scope, PREFIXES);
}
