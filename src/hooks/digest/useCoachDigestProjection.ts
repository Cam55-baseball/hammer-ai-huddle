import { useMemo } from "react";
import { useCoachRoster } from "@/hooks/coach/useCoachRoster";
import { useCoachRosterRows } from "@/hooks/coach/useCoachRosterRows";
import {
  compareWindowCounts,
  detectEscalationEmergence,
  detectEscalationResolution,
  detectScheduleContinuityShift,
  lastNDays,
  priorNDays,
} from "@/lib/digest/projections";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";

const TRACKED_TOPICS = ["athlete.readiness", "athlete.schedule", "behavioral"];

export interface CoachDigestEscalationEntry {
  athleteId: string;
  displayName: string;
  eventId: string;
  topicId: string;
  occurredAt: string;
}

export function useCoachDigestProjection() {
  const { data: roster, isLoading: rosterLoading } = useCoachRoster();
  const athleteIds = useMemo(() => (roster ?? []).map((a) => a.athleteId), [roster]);
  const { data: rows, isLoading: rowsLoading } = useCoachRosterRows(athleteIds, {
    days: 14,
    limit: 2000,
  });

  const projection = useMemo(() => {
    const curr = lastNDays(7);
    const prev = priorNDays(7);
    const all = rows ?? [];
    const ros = roster ?? [];

    // Bucket rows by athlete
    const byAthlete = new Map<string, AsbEventRow[]>();
    for (const r of all) {
      const list = byAthlete.get(r.athlete_id) ?? [];
      list.push(r);
      byAthlete.set(r.athlete_id, list);
    }

    // Org-wide rollups (use all rows together)
    const orgEscalationEmerged = detectEscalationEmergence(all, curr, prev);
    const orgEscalationResolved = detectEscalationResolution(all, curr, prev);
    const orgWorkloadShift = detectScheduleContinuityShift(all, curr, prev);
    const orgEventDensity = compareWindowCounts(all, "", curr, prev);

    // Stale-signal roster count: how many athletes have ≥1 tracked topic absent this week
    let staleAthletes = 0;
    const missingByAthlete = new Map<string, string[]>();
    for (const a of ros) {
      const athleteRows = byAthlete.get(a.athleteId) ?? [];
      const absent: string[] = [];
      for (const topic of TRACKED_TOPICS) {
        const seen = athleteRows.some(
          (row) =>
            (row.topic_id === topic || row.topic_id.startsWith(topic + ".")) &&
            Date.parse(row.occurred_at) >= curr.startMs,
        );
        if (!seen) absent.push(topic);
      }
      if (absent.length > 0) {
        staleAthletes++;
        missingByAthlete.set(a.athleteId, absent);
      }
    }

    // Unresolved escalation list (sorted by occurred_at desc — never by score)
    const escalationPrefixes = [
      "foundation.pattern",
      "behavioral.escalation",
      "behavioral.risk",
    ];
    const unresolved: CoachDigestEscalationEntry[] = [];
    for (const r of all) {
      const t = Date.parse(r.occurred_at);
      if (Number.isNaN(t) || t < curr.startMs) continue;
      if (!escalationPrefixes.some((p) => r.topic_id === p || r.topic_id.startsWith(p + "."))) {
        continue;
      }
      const profile = ros.find((a) => a.athleteId === r.athlete_id);
      unresolved.push({
        athleteId: r.athlete_id,
        displayName: profile?.displayName ?? "Athlete",
        eventId: r.event_id,
        topicId: r.topic_id,
        occurredAt: r.occurred_at,
      });
    }
    unresolved.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

    return {
      orgEscalationEmerged,
      orgEscalationResolved,
      orgWorkloadShift,
      orgEventDensity,
      staleAthletes,
      totalAthletes: ros.length,
      missingByAthlete,
      unresolved: unresolved.slice(0, 50),
      currWindow: curr,
      prevWindow: prev,
    };
  }, [rows, roster]);

  return {
    projection,
    roster: roster ?? [],
    isLoading: rosterLoading || rowsLoading,
  };
}
