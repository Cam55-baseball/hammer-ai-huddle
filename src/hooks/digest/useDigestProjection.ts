import { useMemo } from "react";
import { useAthleteCommandRows } from "@/hooks/command/useAthleteCommandRows";
import {
  compareWindowCounts,
  detectBehavioralTrendShift,
  detectEscalationEmergence,
  detectEscalationResolution,
  detectScheduleContinuityShift,
  lastNDays,
  priorNDays,
} from "@/lib/digest/projections";

const TRACKED_TOPICS = [
  "athlete.readiness",
  "athlete.fatigue",
  "athlete.recovery",
  "athlete.schedule",
  "behavioral",
];

/**
 * Single SELECT (14d). Returns deterministic projections for every digest card.
 * No writes. No smoothing.
 */
export function useDigestProjection() {
  const { data: rows, isLoading } = useAthleteCommandRows({ days: 14, limit: 1000 });

  const projection = useMemo(() => {
    const curr = lastNDays(7);
    const prev = priorNDays(7);
    const r = rows ?? [];

    const trackedAbsent: string[] = [];
    for (const topic of TRACKED_TOPICS) {
      const seen = r.some(
        (row) =>
          (row.topic_id === topic || row.topic_id.startsWith(topic + ".")) &&
          Date.parse(row.occurred_at) >= curr.startMs,
      );
      if (!seen) trackedAbsent.push(topic);
    }

    return {
      organismChange: compareWindowCounts(r, "", curr, prev),
      workloadShift: detectScheduleContinuityShift(r, curr, prev),
      escalationEmerged: detectEscalationEmergence(r, curr, prev),
      escalationResolved: detectEscalationResolution(r, curr, prev),
      behavioralTrend: detectBehavioralTrendShift(r, curr, prev),
      recoveryContinuity: compareWindowCounts(r, "athlete.recovery", curr, prev),
      missingTopics: trackedAbsent,
      totalEvents: r.length,
      currWindow: curr,
      prevWindow: prev,
    };
  }, [rows]);

  return { projection, isLoading, rows: rows ?? [] };
}
