// Hitting doctrine attribution (edge runtime).
//
// Derives violated phases, priority phase, causal chains, and 4-step roadmap
// from HIE weakness clusters. Strict / deterministic / replay-safe /
// confidence-bounded / missingness-visible. NEVER fabricates priority phase
// or invents symptoms. When the signal map is empty or below threshold,
// returns confidence=0 with explicit missingness reason.
//
// Subordinate to:
//   - Eternal Laws + Megaphase 76–90 event-fabric persistence authority
//   - Megaphase 111–150 human-coaching translation governance
//     (translation may compress, never fabricate)
//   - mem://features/hitting-analysis/elite-hitting-mechanics-formula

import {
  HITTING_PHASES,
  HittingPhaseId,
  attributePhaseFromSymptoms,
  prioritizePhasesForRoadmap,
} from './hittingPhases.ts';
import {
  PHASE_CAUSAL_CHAINS,
  PHASE_ROADMAPS,
  CausalChain,
  RoadmapStep,
} from './hittingCausalChains.ts';

export const HIE_DOCTRINE_ENGINE_VERSION = 'hie-doctrine-v1.0.0';

export interface WeaknessClusterLite {
  area?: string;
  issue?: string;
  why?: string;
  impact?: 'high' | 'medium' | 'low';
  data_points?: Record<string, unknown>;
}

export interface HittingDoctrineAttribution {
  violated_phases: HittingPhaseId[];
  priority_phase: HittingPhaseId | null;
  causal_chains: Partial<Record<HittingPhaseId, CausalChain>>;
  roadmap: RoadmapStep[];
  confidence: number; // 0..1
  missingness: {
    reason:
      | 'sufficient'
      | 'no_hitting_clusters'
      | 'unmapped_clusters'
      | 'below_threshold';
    missing_signals: string[];
    mapped_symptom_count: number;
  };
  engine_version: string;
}

/**
 * Strict mapping table: HIE micro-pattern metric → canonical doctrine symptom
 * token (consumed by attributePhaseFromSymptoms). Only metrics with a
 * defensible phase-failure interpretation appear here. Anything else is
 * intentionally omitted — better confidence=0 than fabricated attribution.
 */
const METRIC_TO_SYMPTOM: Record<string, string> = {
  // P1 — hip load failures
  inside_weakness: 'jammed_elbow',
  // P2 — over-stride / pull-off / forward drift consequences
  // (HIE doesn't yet emit these directly; entries reserved for future micro.)
  // P3 — landing / late / outside-reach failures
  outside_weakness: 'cant_reach_outside_pitch',
  velocity_weakness: 'late_swing_high_velocity',
  whiff_rate: 'late_swing_high_velocity',
  // P4 — hitter's move failures
  down_weakness: 'rollover',
};

/**
 * Symptom tokens that callers may also embed directly in
 * `cluster.data_points.symptoms: string[]`. We honour those verbatim so
 * AI-pipeline outputs (analyze-video, ai-chat) can pass through explicit
 * phase tokens without re-mapping.
 */
function extractExplicitSymptoms(clusters: WeaknessClusterLite[]): string[] {
  const out: string[] = [];
  for (const c of clusters) {
    const dp = c.data_points;
    if (!dp) continue;
    const sym = (dp as { symptoms?: unknown }).symptoms;
    if (Array.isArray(sym)) {
      for (const s of sym) {
        if (typeof s === 'string') out.push(s.toLowerCase().trim());
      }
    }
  }
  return out;
}

function mapMetricSymptoms(clusters: WeaknessClusterLite[]): string[] {
  const out: string[] = [];
  for (const c of clusters) {
    const metric = c.data_points && (c.data_points as { metric?: unknown }).metric;
    if (typeof metric !== 'string') continue;
    const sym = METRIC_TO_SYMPTOM[metric];
    if (sym) out.push(sym);
  }
  return out;
}

function isHittingCluster(c: WeaknessClusterLite): boolean {
  const area = (c.area ?? '').toLowerCase();
  if (area === 'hitting' || area === 'composite_bqi') return true;
  // composite areas that aren't hitting are out
  if (area.startsWith('composite_')) return false;
  return area === '';
}

/**
 * Pure attribution. Deterministic for given inputs.
 */
export function deriveHittingDoctrineAttribution(
  weaknessClusters: WeaknessClusterLite[] | null | undefined,
  opts?: { signalDepth?: number },
): HittingDoctrineAttribution {
  const clusters = (weaknessClusters ?? []).filter(isHittingCluster);

  if (clusters.length === 0) {
    return emptyAttribution('no_hitting_clusters', [
      'weakness_clusters.area=hitting',
    ]);
  }

  const explicit = extractExplicitSymptoms(clusters);
  const mapped = mapMetricSymptoms(clusters);
  const allSymptoms = [...explicit, ...mapped];

  if (allSymptoms.length === 0) {
    return emptyAttribution('unmapped_clusters', [
      'weakness_clusters[].data_points.symptoms',
      'weakness_clusters[].data_points.metric (no known mapping)',
    ]);
  }

  const { dominant, counts } = attributePhaseFromSymptoms(allSymptoms);

  if (!dominant) {
    return emptyAttribution('unmapped_clusters', [
      'no symptom token resolved to a known phase',
    ]);
  }

  const violated_phases: HittingPhaseId[] = (
    ['P1', 'P2', 'P3', 'P4'] as HittingPhaseId[]
  ).filter((p) => counts[p] > 0);

  const ordered = prioritizePhasesForRoadmap(violated_phases);
  const priority_phase = ordered[0] ?? dominant;

  const causal_chains: Partial<Record<HittingPhaseId, CausalChain>> = {};
  for (const p of ordered) causal_chains[p] = PHASE_CAUSAL_CHAINS[p];

  const roadmap = PHASE_ROADMAPS[priority_phase] ?? [];

  // Confidence: bounded by mapped-symptom depth + cluster impact. Never 1.0.
  // 1 mapped symptom → 0.4 ; 2 → 0.6 ; 3+ → 0.8. Capped at 0.85.
  const baseConf =
    allSymptoms.length >= 3 ? 0.8 : allSymptoms.length === 2 ? 0.6 : 0.4;
  const highImpact = clusters.some((c) => c.impact === 'high');
  const confidence = Math.min(0.85, highImpact ? baseConf + 0.05 : baseConf);

  const signalDepth = opts?.signalDepth;
  if (typeof signalDepth === 'number' && signalDepth < 5) {
    // Insufficient rep depth — still surface attribution but pin confidence
    // to 0 per RR-doctrine missingness preservation (no false certainty).
    return {
      violated_phases,
      priority_phase: null,
      causal_chains: {},
      roadmap: [],
      confidence: 0,
      missingness: {
        reason: 'below_threshold',
        missing_signals: [`rep_depth=${signalDepth} (min=5)`],
        mapped_symptom_count: allSymptoms.length,
      },
      engine_version: HIE_DOCTRINE_ENGINE_VERSION,
    };
  }

  return {
    violated_phases,
    priority_phase,
    causal_chains,
    roadmap,
    confidence,
    missingness: {
      reason: 'sufficient',
      missing_signals: [],
      mapped_symptom_count: allSymptoms.length,
    },
    engine_version: HIE_DOCTRINE_ENGINE_VERSION,
  };
}

function emptyAttribution(
  reason: HittingDoctrineAttribution['missingness']['reason'],
  missing_signals: string[],
): HittingDoctrineAttribution {
  return {
    violated_phases: [],
    priority_phase: null,
    causal_chains: {},
    roadmap: [],
    confidence: 0,
    missingness: {
      reason,
      missing_signals,
      mapped_symptom_count: 0,
    },
    engine_version: HIE_DOCTRINE_ENGINE_VERSION,
  };
}

// Re-export for downstream consumers that want to attach phase metadata.
export { HITTING_PHASES };
