/**
 * Post-Launch Observability — Safeguarding Reducer
 *
 * Verifies the constitutional invariant: no safeguarding signal disappears,
 * none remain unseen. RR-10 + Phase 60 §G containment.
 *
 * Pure projection. Never writes, never auto-resolves, never reclassifies.
 */

export interface SafeguardingNotificationLike {
  id: string;
  athlete_id: string;
  created_at: string;
  topic?: string | null;
  resolved_at?: string | null;
}

export interface SafeguardingAckLike {
  notification_id: string;
  actor_role: "coach" | "parent" | "athlete" | "system";
  acked_at: string;
}

export interface SafeguardingAsbEventLike {
  event_id: string;
  athlete_id: string;
  topic_id: string;
  occurred_at: string;
}

export interface InvariantViolation {
  type:
    | "missing_asb_emission"
    | "unacked_minor_24h"
    | "unacked_coach_72h"
    | "no_view_recorded";
  athlete_id: string;
  evidence_event_id: string | null;
  notification_id: string;
}

export interface SafeguardingMetrics {
  emitted: number;
  viewed: number;
  coach_ack: number;
  parent_ack: number;
  view_rate: number;
  ack_rate_coach: number;
  ack_rate_parent: number;
  median_resolution_ms: number | null;
  repeat_athletes: string[];
  invariant_violations: InvariantViolation[];
}

const MINOR_ACK_SLA_MS = 24 * 3600 * 1000;
const COACH_ACK_SLA_MS = 72 * 3600 * 1000;

function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function computeSafeguardingMetrics(
  notifications: SafeguardingNotificationLike[],
  acks: SafeguardingAckLike[],
  asbEvents: SafeguardingAsbEventLike[],
  minorAthleteIds: Set<string>,
  now: Date = new Date(),
): SafeguardingMetrics {
  const acksByNotif = new Map<string, SafeguardingAckLike[]>();
  for (const a of acks) {
    const arr = acksByNotif.get(a.notification_id) ?? [];
    arr.push(a);
    acksByNotif.set(a.notification_id, arr);
  }

  // ASB events for safeguarding namespace.
  const asbByAthlete = new Map<string, SafeguardingAsbEventLike[]>();
  for (const e of asbEvents) {
    if (!e.topic_id.startsWith("relational.safeguarding")) continue;
    const arr = asbByAthlete.get(e.athlete_id) ?? [];
    arr.push(e);
    asbByAthlete.set(e.athlete_id, arr);
  }

  let coach_ack = 0;
  let parent_ack = 0;
  let viewed = 0;
  const resolutions: number[] = [];
  const violations: InvariantViolation[] = [];
  const athleteCount = new Map<string, number>();

  for (const n of notifications) {
    athleteCount.set(n.athlete_id, (athleteCount.get(n.athlete_id) ?? 0) + 1);
    const nAcks = acksByNotif.get(n.id) ?? [];
    if (nAcks.length) viewed += 1;
    const coachAcks = nAcks.filter((a) => a.actor_role === "coach");
    const parentAcks = nAcks.filter((a) => a.actor_role === "parent");
    if (coachAcks.length) coach_ack += 1;
    if (parentAcks.length) parent_ack += 1;

    // resolution time = first ack
    if (nAcks.length) {
      const first = Math.min(...nAcks.map((a) => Date.parse(a.acked_at)));
      resolutions.push(first - Date.parse(n.created_at));
    }

    // Invariant: matching ASB emission for this notification's athlete near
    // the notification timestamp.
    const athleteEvents = asbByAthlete.get(n.athlete_id) ?? [];
    const matched = athleteEvents.find(
      (e) =>
        Math.abs(Date.parse(e.occurred_at) - Date.parse(n.created_at)) <
        60 * 60 * 1000,
    );
    if (!matched) {
      violations.push({
        type: "missing_asb_emission",
        athlete_id: n.athlete_id,
        evidence_event_id: null,
        notification_id: n.id,
      });
    }

    const ageMs = now.getTime() - Date.parse(n.created_at);
    const isMinor = minorAthleteIds.has(n.athlete_id);
    if (isMinor && !parentAcks.length && ageMs > MINOR_ACK_SLA_MS) {
      violations.push({
        type: "unacked_minor_24h",
        athlete_id: n.athlete_id,
        evidence_event_id: matched?.event_id ?? null,
        notification_id: n.id,
      });
    }
    if (!coachAcks.length && ageMs > COACH_ACK_SLA_MS) {
      violations.push({
        type: "unacked_coach_72h",
        athlete_id: n.athlete_id,
        evidence_event_id: matched?.event_id ?? null,
        notification_id: n.id,
      });
    }
    if (!nAcks.length && ageMs > COACH_ACK_SLA_MS) {
      violations.push({
        type: "no_view_recorded",
        athlete_id: n.athlete_id,
        evidence_event_id: matched?.event_id ?? null,
        notification_id: n.id,
      });
    }
  }

  const emitted = notifications.length;
  const repeat_athletes = [...athleteCount.entries()]
    .filter(([, c]) => c >= 2)
    .map(([id]) => id);

  return {
    emitted,
    viewed,
    coach_ack,
    parent_ack,
    view_rate: emitted ? +(viewed / emitted).toFixed(3) : 0,
    ack_rate_coach: emitted ? +(coach_ack / emitted).toFixed(3) : 0,
    ack_rate_parent: emitted ? +(parent_ack / emitted).toFixed(3) : 0,
    median_resolution_ms: median(resolutions),
    repeat_athletes,
    invariant_violations: violations,
  };
}
