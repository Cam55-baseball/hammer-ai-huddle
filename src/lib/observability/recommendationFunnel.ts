/**
 * Post-Launch Observability — Recommendation Effectiveness Reducer
 *
 * Pure projection over recommendation trace + outcome rows. Measurement only.
 * Never writes back, never influences ranking (RR-9; mirrors
 * `src/lib/videoConversionAnalytics.ts` posture).
 */

export interface RecommendationTraceLike {
  id: string;
  recommendation_id: string;
  user_id: string;
  shown_at: string;
  opened_at?: string | null;
}

export interface RecommendationOutcomeLike {
  recommendation_id?: string | null;
  video_id?: string | null;
  user_id: string;
  started_at?: string | null;
  completed_at?: string | null;
  watch_duration_ms?: number | null;
}

export interface RecommendationCoachAckLike {
  recommendation_id: string;
  coach_id: string;
  acked_at: string;
}

export interface RecommendationEffectiveness {
  recommendation_id: string;
  shown: number;
  opened: number;
  drill_started: number;
  drill_completed: number;
  video_watched: number;
  repeat: number;
  open_rate: number;
  completion_rate: number;
  repeat_rate: number;
  coach_ack_count: number;
  missingness: {
    opened: boolean;
    drill_started: boolean;
    drill_completed: boolean;
    video_watched: boolean;
    coach_ack: boolean;
  };
}

const VIDEO_WATCH_THRESHOLD_MS = 30_000;
const REPEAT_WINDOW_MS = 14 * 86_400 * 1000;

export function computeRecommendationEffectiveness(
  traces: RecommendationTraceLike[],
  outcomes: RecommendationOutcomeLike[],
  acks: RecommendationCoachAckLike[],
): RecommendationEffectiveness[] {
  const byRec = new Map<string, RecommendationTraceLike[]>();
  for (const t of traces) {
    const arr = byRec.get(t.recommendation_id) ?? [];
    arr.push(t);
    byRec.set(t.recommendation_id, arr);
  }

  const outcomesByRec = new Map<string, RecommendationOutcomeLike[]>();
  for (const o of outcomes) {
    const key = o.recommendation_id;
    if (!key) continue;
    const arr = outcomesByRec.get(key) ?? [];
    arr.push(o);
    outcomesByRec.set(key, arr);
  }

  const acksByRec = new Map<string, RecommendationCoachAckLike[]>();
  for (const a of acks) {
    const arr = acksByRec.get(a.recommendation_id) ?? [];
    arr.push(a);
    acksByRec.set(a.recommendation_id, arr);
  }

  const results: RecommendationEffectiveness[] = [];
  for (const [recId, recTraces] of byRec.entries()) {
    const shown = recTraces.length;
    const opened = recTraces.filter((t) => !!t.opened_at).length;
    const recOutcomes = outcomesByRec.get(recId) ?? [];
    const drill_started = recOutcomes.filter((o) => !!o.started_at).length;
    const drill_completed = recOutcomes.filter((o) => !!o.completed_at).length;
    const video_watched = recOutcomes.filter(
      (o) => (o.watch_duration_ms ?? 0) >= VIDEO_WATCH_THRESHOLD_MS,
    ).length;

    // Repeat: same user completed twice within 14 days.
    const completionsByUser = new Map<string, number[]>();
    for (const o of recOutcomes) {
      if (!o.completed_at) continue;
      const arr = completionsByUser.get(o.user_id) ?? [];
      arr.push(Date.parse(o.completed_at));
      completionsByUser.set(o.user_id, arr);
    }
    let repeat = 0;
    for (const times of completionsByUser.values()) {
      const sorted = times.sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] - sorted[i - 1] <= REPEAT_WINDOW_MS) {
          repeat += 1;
          break;
        }
      }
    }

    const coach_ack_count = (acksByRec.get(recId) ?? []).length;

    results.push({
      recommendation_id: recId,
      shown,
      opened,
      drill_started,
      drill_completed,
      video_watched,
      repeat,
      open_rate: shown ? +(opened / shown).toFixed(3) : 0,
      completion_rate: opened ? +(drill_completed / opened).toFixed(3) : 0,
      repeat_rate: drill_completed
        ? +(repeat / drill_completed).toFixed(3)
        : 0,
      coach_ack_count,
      missingness: {
        opened: recTraces.every((t) => !t.opened_at),
        drill_started: recOutcomes.every((o) => !o.started_at),
        drill_completed: recOutcomes.every((o) => !o.completed_at),
        video_watched: recOutcomes.every(
          (o) => (o.watch_duration_ms ?? 0) < VIDEO_WATCH_THRESHOLD_MS,
        ),
        coach_ack: coach_ack_count === 0,
      },
    });
  }

  return results.sort((a, b) => b.shown - a.shown);
}

export function flagIgnored(
  r: RecommendationEffectiveness,
): "ignored" | "completed" | "neutral" {
  if (r.shown >= 10 && r.open_rate < 0.1) return "ignored";
  if (r.completion_rate >= 0.5) return "completed";
  return "neutral";
}
