// Engine Sentinel — Independent Truth Model
// Pure deterministic classifier. Does NOT use compute-hammer-state.
// Sole purpose: independently estimate expected athlete state from raw signals
// so we can detect drift between the engine and a sanity baseline.

export type SentinelState = 'prime' | 'ready' | 'caution' | 'recover';

export interface TruthInputs {
  completions_6h: number;
  completions_24h: number;
  sessions_3d: number;
  avg_rpe_24h: number | null;
  max_rpe_24h: number | null;
  avg_duration_24h: number | null;
  sleep_quality_24h: number | null; // 0..100 normalized
  hours_since_last_activity: number | null;
}

export interface TruthOutput {
  expected_state: SentinelState;
  load_score: number;
  recovery_score: number;
  freshness_score: number;
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

export function computeExpectedState(i: TruthInputs): TruthOutput {
  const load_score = clamp(
    (i.completions_24h ?? 0) * 8 +
      (i.sessions_3d ?? 0) * 10 +
      (i.avg_rpe_24h ?? 0) * 4
  );
  const recovery_score = clamp(
    (i.hours_since_last_activity ?? 0) * 2 + (i.sleep_quality_24h ?? 50)
  );
  const freshness_score = clamp(100 - Math.max(0, (i.completions_6h ?? 0) * 15));

  let expected_state: SentinelState;
  if (load_score >= 70 && recovery_score < 40) expected_state = 'recover';
  else if (load_score >= 50 && freshness_score >= 60) expected_state = 'prime';
  else if (load_score < 30 && recovery_score >= 70) expected_state = 'prime';
  else if (load_score >= 30 && load_score < 70) expected_state = 'ready';
  else if (load_score < 30 && recovery_score >= 40) expected_state = 'ready';
  else expected_state = 'caution';

  return { expected_state, load_score, recovery_score, freshness_score };
}

// Symmetric distance matrix between engine states (0..100).
const DIST: Record<SentinelState, Record<SentinelState, number>> = {
  prime:   { prime: 0,  ready: 15, caution: 40, recover: 80 },
  ready:   { prime: 15, ready: 0,  caution: 25, recover: 60 },
  caution: { prime: 40, ready: 25, caution: 0,  recover: 35 },
  recover: { prime: 80, ready: 60, caution: 35, recover: 0  },
};

export function driftScore(expected: SentinelState, actual: SentinelState | null): number {
  if (!actual) return 100;
  const row = DIST[expected];
  const known = row?.[actual as SentinelState];
  return typeof known === 'number' ? known : 50;
}

export const SENTINEL_VERSION = 'v1.0.0';
export const DRIFT_THRESHOLD = 30;
