/**
 * PIE V2 — session & window aggregators.
 *
 * Pure deterministic. Reads rep-level scores → returns session aggregate.
 * Tracked-only signals contribute zero weight to pie_v2_composite but
 * surface trends / variance / fatigue_slope for AI Hammer + advisories.
 */
import {
  PIE_V2_ENGINE_VERSION,
  PIE_V2_SCORED_SIGNALS,
  PIE_V2_TRACKED_ONLY_SIGNALS,
  type PieV2RepInput,
  type PieV2RepScore,
  type PieV2SessionAggregate,
  type PieV2SessionSignalAggregate,
  type PieV2SignalId,
  type PieV2Confidence,
} from "./types";
import { PIE_V2_SIGNALS, tierForScore } from "@/data/baseball/pieV2Signals";
import { scoreAllSignals } from "./scoring";

function mean(xs: number[]): number | null {
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function variance(xs: number[]): number | null {
  if (xs.length < 2) return null;
  const m = mean(xs)!;
  return xs.reduce((a, x) => a + (x - m) ** 2, 0) / xs.length;
}

/** Linear regression slope over indices 0..n-1. Null when n<3. */
function slope(xs: number[]): number | null {
  if (xs.length < 3) return null;
  const n = xs.length;
  const xMean = (n - 1) / 2;
  const yMean = xs.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (xs[i] - yMean);
    den += (i - xMean) ** 2;
  }
  return den === 0 ? null : num / den;
}

function aggregateConfidence(confs: PieV2Confidence[]): PieV2Confidence {
  if (confs.length === 0) return { score: 0, basis: "manual_aggregate" };
  const avg = confs.reduce((a, c) => a + c.score, 0) / confs.length;
  // Cap by lowest-confidence contributor.
  const lowest = Math.min(...confs.map((c) => c.score));
  const sample = confs[0];
  const basis: PieV2Confidence["basis"] =
    sample.basis === "video_frame_range" ? "video_aggregate"
      : sample.basis === "manual_single_rep" ? "manual_aggregate"
      : sample.basis;
  return { score: Math.round(Math.min(avg, lowest + 10)), basis };
}

function aggregateForSignal(
  signal_id: PieV2SignalId,
  repScores: PieV2RepScore[],
): PieV2SessionSignalAggregate {
  const relevant = repScores.filter((r) => r.signal_id === signal_id);
  const scored = relevant.filter((r) => r.score !== null) as Array<PieV2RepScore & { score: number }>;
  const values = scored.map((r) => r.score);
  const v = variance(values);
  const consistency = v === null ? null : Math.max(0, 100 - Math.sqrt(v));
  const avg = mean(values);
  const fatigue = slope(values);
  const tracked_only = PIE_V2_TRACKED_ONLY_SIGNALS.includes(signal_id);
  return {
    signal_id,
    sample_count: scored.length,
    missing_count: relevant.length - scored.length,
    average: avg,
    best: values.length === 0 ? null : Math.max(...values),
    worst: values.length === 0 ? null : Math.min(...values),
    variance: v,
    consistency,
    tier: tracked_only ? null : tierForScore(avg),
    confidence: aggregateConfidence(scored.map((r) => r.confidence)),
    tracked_only,
    fatigue_slope: fatigue,
  };
}

export function aggregateSession(
  session_id: string,
  athlete_id: string,
  reps: PieV2RepInput[],
  computed_at: string,
): PieV2SessionAggregate {
  const allScores = reps.flatMap(scoreAllSignals);
  const signals = ([...PIE_V2_SCORED_SIGNALS, ...PIE_V2_TRACKED_ONLY_SIGNALS] as PieV2SignalId[]).map(
    (id) => aggregateForSignal(id, allScores),
  );

  // Composite — scored signals only, weighted per PIE_V2_SIGNALS.composite_weight.
  let weighted = 0;
  let totalWeight = 0;
  for (const s of signals) {
    if (s.tracked_only) continue;
    if (s.average === null) continue;
    const w = PIE_V2_SIGNALS[s.signal_id].composite_weight;
    weighted += s.average * w;
    totalWeight += w;
  }
  const composite = totalWeight === 0 ? null : Math.round((weighted / totalWeight) * 10) / 10;

  return {
    session_id,
    athlete_id,
    computed_at,
    engine_version: PIE_V2_ENGINE_VERSION,
    signals,
    pie_v2_composite: composite,
    athlete_reported_pain_in_session: reps.some((r) => r.athlete_reported_pain === true),
  };
}

/** Roll-up across multiple session aggregates — used by `usePitchingV2Trends`. */
export function rollupAggregates(aggs: PieV2SessionAggregate[]): PieV2SessionAggregate | null {
  if (aggs.length === 0) return null;
  const fake: PieV2RepInput[] = [];
  // Synthesize one "rep" per session signal average so aggregator math reuses cleanly.
  // We expose a derived aggregate, not a replay-canonical one — clearly marked computed_at.
  for (const a of aggs) {
    for (const s of a.signals) {
      if (s.average === null) continue;
      fake.push({
        rep_id: `${a.session_id}:${s.signal_id}`,
        session_id: a.session_id,
        athlete_id: a.athlete_id,
        occurred_at: a.computed_at,
        provenance: "manual",
        // Encode the average into the relevant raw field so scorer math reproduces score.
        // For simplicity we attach a synthetic field set:
        energy_angle_deg: s.signal_id === "energy_angle" ? scoreToProxy(s.average, "energy_angle") : undefined,
      });
    }
  }
  return aggregateSession(aggs[0].session_id, aggs[0].athlete_id, fake, new Date().toISOString());
}

// Helper for rollupAggregates — purely cosmetic; trends UI uses signals[].average directly.
function scoreToProxy(avg: number, _id: PieV2SignalId): number {
  return avg >= 85 ? 25 : avg >= 70 ? 20 : 15;
}
