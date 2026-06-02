/**
 * RR-5 — relational.narrative.* projection.
 *
 * Pure, deterministic, memoized. Folds narrative events into:
 *   • continuityTimeline — ordered visible narrative events
 *   • resurfacingCandidates — deterministic ranking for Hammer callbacks
 *   • unresolvedThreads — slump/breakthrough markers with no follow-up
 *   • longitudinalContext — counts only, bounded by window
 *   • revokedEventIds — identity_reflection revocations honoured next rebuild
 *   • missingness — explicit knowledge gaps (never imputed)
 *
 * Replay invariants:
 *   • Byte-identical output under identical inputs at pinned engine_version
 *     + reasoning_version (RR-5 invariant 1).
 *   • Revocation removes downstream visibility on next rebuild (no cached
 *     narrative authority — RR-5 invariant 10).
 *   • Citation-less narrative rows are dropped (RR-5 invariant 2).
 *
 * No AI/ML, no Date.now, no Math.random. Bounded windows only.
 */
import { memoize, type Scope } from "./types";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";
import {
  NARRATIVE_TOPIC_PREFIX,
  NARRATIVE_TOPICS,
} from "@/lib/runtime/relational/narrativeSchemas";

export type NarrativeKind =
  | "memory_anchor"
  | "slump_marker"
  | "breakthrough_marker"
  | "identity_reflection"
  | "context_recall";

export interface NarrativeNode {
  event_id: string;
  kind: NarrativeKind;
  occurred_at: string;
  citedEventIds: string[];
  topic_tag: string | null;
  pattern_kind: string | null;
  surface: string | null;
  confidence: number | null;
  missingness_fields: string[];
}

export interface ResurfacingCandidate {
  event_id: string;
  occurred_at: string;
  kind: NarrativeKind;
  topic_tag: string | null;
  citedEventIds: string[];
  /** Deterministic score; higher = stronger candidate. */
  score: number;
}

export interface NarrativeState {
  continuityTimeline: NarrativeNode[];
  resurfacingCandidates: ResurfacingCandidate[];
  unresolvedThreads: NarrativeNode[];
  longitudinalContext: {
    anchors: number;
    slumps: number;
    breakthroughs: number;
    recalls: number;
    reflections: number;
  };
  revokedEventIds: string[];
  missingness: { fields: string[]; reason: "not_observed" | "redacted" | "consent_withheld" };
}

const PREFIXES = [NARRATIVE_TOPIC_PREFIX];

function kindOf(topicId: string): NarrativeKind | null {
  switch (topicId) {
    case NARRATIVE_TOPICS.memory_anchor:
      return "memory_anchor";
    case NARRATIVE_TOPICS.slump_marker:
      return "slump_marker";
    case NARRATIVE_TOPICS.breakthrough_marker:
      return "breakthrough_marker";
    case NARRATIVE_TOPICS.identity_reflection:
      return "identity_reflection";
    case NARRATIVE_TOPICS.context_recall:
      return "context_recall";
    default:
      return null;
  }
}

export const buildNarrativeState = memoize<NarrativeState>((rows) => {
  // Pass 1: collect revocations (RR-5 invariant 10).
  const revoked = new Set<string>();
  for (const r of rows) {
    if (r.topic_id !== NARRATIVE_TOPICS.identity_reflection) continue;
    const p = r.payload as { revokes_event_id?: string | null } | undefined;
    if (p?.revokes_event_id) revoked.add(p.revokes_event_id);
  }

  // Pass 2: fold visible narrative events. Drop citation-less rows
  // (defence in depth — schema enforces this for cite-bound topics).
  const nodes: NarrativeNode[] = [];
  const missingFields = new Set<string>();
  for (const r of rows) {
    const kind = kindOf(r.topic_id);
    if (!kind) continue;
    if (revoked.has(r.event_id)) continue;

    const p = (r.payload ?? {}) as Record<string, unknown>;
    const lineage = (p.lineage_parent_ids as string[] | undefined) ?? [];
    const recalled = (p.recalled_event_ids as string[] | undefined) ?? [];
    const cited = [...lineage, ...recalled];

    // Cite-bound topics must have ≥1 antecedent.
    if (kind !== "identity_reflection" && cited.length === 0) continue;

    const miss = p.missingness as
      | { fields?: string[]; reason?: NarrativeState["missingness"]["reason"] }
      | undefined;
    for (const f of miss?.fields ?? []) missingFields.add(f);

    nodes.push({
      event_id: r.event_id,
      kind,
      occurred_at: r.occurred_at,
      citedEventIds: cited,
      topic_tag: (p.topic_tag as string | undefined) ?? null,
      pattern_kind: (p.pattern_kind as string | undefined) ?? null,
      surface: (p.surface as string | undefined) ?? null,
      confidence: (p.confidence as number | null | undefined) ?? null,
      missingness_fields: miss?.fields ?? [],
    });
  }

  // Continuity timeline = chronological (prepareRows already sorted).
  const continuityTimeline = nodes;

  // Resurfacing candidates — deterministic, no Date.now. Score combines:
  //   • recency rank within the window (latest = highest)
  //   • lineage richness (citations clamped)
  //   • kind weight (memory_anchor > breakthrough > context_recall > slump
  //     — slumps surface gently, never amplified)
  const KIND_WEIGHT: Record<NarrativeKind, number> = {
    memory_anchor: 3,
    breakthrough_marker: 2,
    context_recall: 2,
    identity_reflection: 1,
    slump_marker: 1,
  };
  const recent = nodes.slice(-20); // bounded window
  const resurfacingCandidates: ResurfacingCandidate[] = recent
    .map((n, i) => ({
      event_id: n.event_id,
      occurred_at: n.occurred_at,
      kind: n.kind,
      topic_tag: n.topic_tag,
      citedEventIds: n.citedEventIds,
      score:
        (i + 1) * 10 +
        Math.min(n.citedEventIds.length, 5) +
        KIND_WEIGHT[n.kind],
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Deterministic tiebreak.
      if (a.occurred_at !== b.occurred_at) {
        return a.occurred_at < b.occurred_at ? 1 : -1;
      }
      return a.event_id < b.event_id ? -1 : 1;
    });

  // Unresolved threads: slump/breakthrough markers with no later marker on
  // the same pattern_kind. Bounded comparison.
  const unresolvedThreads: NarrativeNode[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.kind !== "slump_marker" && n.kind !== "breakthrough_marker") continue;
    let resolved = false;
    for (let j = i + 1; j < nodes.length; j++) {
      const m = nodes[j];
      if (
        (m.kind === "slump_marker" || m.kind === "breakthrough_marker") &&
        m.pattern_kind === n.pattern_kind
      ) {
        resolved = true;
        break;
      }
    }
    if (!resolved) unresolvedThreads.push(n);
  }

  const longitudinalContext = {
    anchors: nodes.filter((n) => n.kind === "memory_anchor").length,
    slumps: nodes.filter((n) => n.kind === "slump_marker").length,
    breakthroughs: nodes.filter((n) => n.kind === "breakthrough_marker").length,
    recalls: nodes.filter((n) => n.kind === "context_recall").length,
    reflections: nodes.filter((n) => n.kind === "identity_reflection").length,
  };

  return {
    continuityTimeline,
    resurfacingCandidates,
    unresolvedThreads,
    longitudinalContext,
    revokedEventIds: Array.from(revoked).sort(),
    missingness: {
      fields: Array.from(missingFields).sort(),
      reason: "not_observed",
    },
  };
});

export function narrativeState(
  rows: AsbEventRow[] | undefined,
  scope: Scope,
) {
  return buildNarrativeState(rows, scope, PREFIXES);
}
