/**
 * UHRC — pure builder.
 *
 * Inputs: latest PIE V2 session aggregate (optional), HIE snapshot
 * (optional), longitudinal trends (optional), athlete-state delta
 * (optional). Output: a deterministic UhrcReport.
 *
 * Constitutional rules:
 * - Never re-scores. Reads values directly from upstream engines.
 * - Missingness is preserved, never imputed.
 * - Confidence is inherited from upstream — never fabricated.
 * - Replay-safe at pinned UHRC_ENGINE_VERSION + upstream engine pins.
 */
import {
  UHRC_ENGINE_VERSION,
  type UhrcEvidence,
  type UhrcPillar,
  type UhrcPillarId,
  type UhrcReport,
  type UhrcSignalContribution,
} from "./types";
import {
  HIE_PHASE_PILLAR_MAP,
  PIE_V2_PILLAR_MAP,
  PILLAR_COMPOSITE_WEIGHTS,
  PILLAR_LABELS,
  pieV2SignalsForPillar,
} from "./pillars";
import type { PieV2SeverityTier, PieV2SessionAggregate } from "@/lib/pieV2/types";
import {
  RELEASE1_HIDDEN_SIGNAL_IDS,
  RELEASE1_HITTING_SUPPRESSED,
} from "@/lib/reportCard/release1";

/**
 * Phase 45 — Release-1 Trust Lock guard.
 *
 * Forces any contribution backed by a HIDDEN or SHOWCASE-FUTURE source
 * signal to render as `missing: true` instead of contributing a fabricated
 * or LLM-derived score to pillar math. The existing missingness machinery
 * (`contributions.filter(c => !c.missing).length` as the denominator,
 * `biggest_leak`/`biggest_win` skip on `value == null`) does the rest.
 */
function applyRelease1Suppression(c: UhrcSignalContribution): UhrcSignalContribution {
  if (!RELEASE1_HIDDEN_SIGNAL_IDS.has(c.source_signal_id)) return c;
  if (c.missing && c.value == null) return c;
  return { ...c, value: null, missing: true, tier: null };
}

type HittingDoctrine = {
  violated_phases: Array<"P1" | "P2" | "P3" | "P4">;
  priority_phase: "P1" | "P2" | "P3" | "P4" | null;
  causal_chains: Partial<Record<"P1" | "P2" | "P3" | "P4", unknown>>;
  roadmap: unknown[];
  confidence: number;
  missingness: { reason: string; missing_signals: string[]; mapped_symptom_count: number };
  engine_version: string;
};

export interface BuildUhrcInput {
  athlete_id: string;
  sport?: "baseball" | "softball";
  disciplines: Array<"pitching" | "hitting">;
  pieV2Latest?: PieV2SessionAggregate | null;
  hieSnapshot?: {
    id?: string;
    computed_at?: string;
    hitting_doctrine?: HittingDoctrine | null;
    decision_speed_index?: number | null;
    movement_efficiency_score?: number | null;
  } | null;
  computed_at?: string;
}

function tierFromScore(score: number | null): PieV2SeverityTier | null {
  if (score == null) return null;
  if (score >= 80) return "clean";
  if (score >= 65) return "minor";
  if (score >= 45) return "major";
  return "critical";
}

function weightedMean(items: Array<{ value: number | null; weight: number }>): number | null {
  let num = 0;
  let den = 0;
  for (const it of items) {
    if (it.value == null) continue;
    num += it.value * it.weight;
    den += it.weight;
  }
  return den === 0 ? null : Math.round((num / den) * 10) / 10;
}

export function buildUhrcReport(input: BuildUhrcInput): UhrcReport {
  const computed_at = input.computed_at ?? new Date().toISOString();
  const sport = input.sport ?? "baseball";
  const includePitching = input.disciplines.includes("pitching");
  // Phase 45 — Release-1 Trust Lock: hitting suppressed end-to-end. Even if
  // a caller asks for hitting we drop it before any BH contribution lands.
  const includeHitting =
    !RELEASE1_HITTING_SUPPRESSED && input.disciplines.includes("hitting");

  const missing: string[] = [];
  const expectedSignals: string[] = [];

  const pillars: UhrcPillar[] = (Object.keys(PILLAR_COMPOSITE_WEIGHTS) as UhrcPillarId[]).map(
    (pid) => {
      const contributions: UhrcSignalContribution[] = [];

      if (includePitching) {
        for (const sid of pieV2SignalsForPillar(pid)) {
          const def = PIE_V2_PILLAR_MAP[sid];
          expectedSignals.push(sid);
          const sigAgg = input.pieV2Latest?.signals.find((s) => s.signal_id === sid) ?? null;
          const value = sigAgg?.average ?? null;
          if (value == null) missing.push(sid);
          contributions.push({
            source_signal_id: sid,
            source_system: "pie_v2",
            value,
            weight: def.weight,
            tier: sigAgg?.tier ?? null,
            source_event_id: input.pieV2Latest
              ? `pie_v2:${input.pieV2Latest.session_id}:${sid}`
              : null,
            explanation: def.explanation,
            missing: value == null,
          });
        }
      }

      if (includeHitting) {
        // HIE phase contributions
        const doctrine = input.hieSnapshot?.hitting_doctrine ?? null;
        const violated = new Set(doctrine?.violated_phases ?? []);
        (["P1", "P2", "P3", "P4"] as const).forEach((phase) => {
          const def = HIE_PHASE_PILLAR_MAP[phase];
          if (def.pillar !== pid) return;
          expectedSignals.push(`hitting.${phase}`);
          // Pure projection: violated phase → 40 (major), priority → 25, clean → 85.
          let value: number | null = null;
          if (doctrine && doctrine.confidence > 0) {
            value = doctrine.priority_phase === phase ? 25 : violated.has(phase) ? 40 : 85;
          } else {
            missing.push(`hitting.${phase}`);
          }
          contributions.push({
            source_signal_id: `hitting.${phase}`,
            source_system: "hie",
            value,
            weight: def.weight,
            tier: tierFromScore(value),
            source_event_id: input.hieSnapshot?.id
              ? `hie:${input.hieSnapshot.id}:${phase}`
              : null,
            explanation: def.explanation,
            missing: value == null,
          });
        });

        if (pid === "decision_quality") {
          expectedSignals.push("hie.decision_speed_index");
          const value = input.hieSnapshot?.decision_speed_index ?? null;
          if (value == null) missing.push("hie.decision_speed_index");
          contributions.push({
            source_signal_id: "hie.decision_speed_index",
            source_system: "hie",
            value,
            weight: 100,
            tier: tierFromScore(value),
            source_event_id: input.hieSnapshot?.id ? `hie:${input.hieSnapshot.id}:decision_speed` : null,
            explanation: "Decision speed index from HIE",
            missing: value == null,
          });
        }
      }

      const score = weightedMean(contributions);
      const presentConfidences = contributions.filter((c) => !c.missing).length;
      const confidence = contributions.length === 0
        ? 0
        : Math.round((presentConfidences / contributions.length) * 100);

      return {
        id: pid,
        label: PILLAR_LABELS[pid],
        score,
        confidence,
        tier: tierFromScore(score),
        contributions,
        note: score == null
          ? "Insufficient data to score this pillar yet."
          : `Pillar derived from ${presentConfidences}/${contributions.length} source signals.`,
      };
    },
  );

  // Composite — pillar-weighted mean, missingness-respecting.
  const composite = weightedMean(
    pillars.map((p) => ({ value: p.score, weight: PILLAR_COMPOSITE_WEIGHTS[p.id] })),
  );

  // Biggest win / leak — derived from contribution extremes.
  let biggest_win: UhrcEvidence | null = null;
  let biggest_leak: UhrcEvidence | null = null;
  let bestVal = -Infinity;
  let worstVal = Infinity;
  for (const p of pillars) {
    for (const c of p.contributions) {
      if (c.value == null) continue;
      if (c.value > bestVal) {
        bestVal = c.value;
        biggest_win = {
          source_event_id: c.source_event_id ?? `${c.source_signal_id}:win`,
          summary: `${c.explanation} (${Math.round(c.value)})`,
        };
      }
      if (c.value < worstVal) {
        worstVal = c.value;
        biggest_leak = {
          source_event_id: c.source_event_id ?? `${c.source_signal_id}:leak`,
          summary: `${c.explanation} (${Math.round(c.value)})`,
        };
      }
    }
  }

  return {
    athlete_id: input.athlete_id,
    sport,
    discipline_scope: input.disciplines,
    computed_at,
    engine_version: UHRC_ENGINE_VERSION,
    source_engine_versions: {
      pie_v2: input.pieV2Latest?.engine_version ?? null,
      hie: input.hieSnapshot?.hitting_doctrine?.engine_version ?? null,
    },
    pillars,
    composite,
    biggest_win,
    biggest_leak,
    missingness: {
      total_signals_expected: expectedSignals.length,
      total_signals_present: expectedSignals.length - missing.length,
      missing_signal_ids: missing,
    },
  };
}
