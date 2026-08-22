/**
 * RR-6 — injury continuity projection.
 * ------------------------------------------------------------------
 * A replay-derived READ-ONLY overlay over `relational.injury.*` events.
 * It authors nothing: no new storage, no inferred readiness, no medical
 * claim. It only orders what the athlete (and their parent/clinician)
 * already said, so the arc "reported → adapted plan → graded steps →
 * explicit human authorization" is visible instead of implied.
 *
 * Constitutional (RR-6):
 *   - Never diagnoses, never prescribes, never predicts a return date.
 *   - Athlete-reported pain outranks anything inferred: any active report
 *     with a limiting/inactive participation status keeps the arc open no
 *     matter how many checkpoints were logged.
 *   - Return-to-play is NEVER derived. Only an explicit
 *     `relational.injury.rtp_authorized` event from a parent or clinician
 *     closes an arc.
 *
 * Pure module: no I/O, no Date.now, no Math.random. Replay-safe.
 */

export type InjuryContinuityStage =
  | "reported"
  | "adapting"
  | "graded_steps"
  | "awaiting_authorization"
  | "cleared";

export interface InjuryEventRow {
  event_id: string;
  topic_id: string;
  occurred_at: string;
  actor_role?: string | null;
  payload: Record<string, unknown> | null;
}

export interface InjuryCheckpointEntry {
  event_id: string;
  occurred_at: string;
  checkpoint_type: string;
  participation_status: string;
  recovery_focus?: string;
}

export interface InjuryArc {
  body_region: string;
  /** Event id of the originating report — lineage anchor for later events. */
  origin_event_id: string;
  opened_at: string;
  last_event_at: string;
  severity_band: string;
  participation_status: string;
  symptoms: string[];
  checkpoints: InjuryCheckpointEntry[];
  stage: InjuryContinuityStage;
  /** True only when a parent/clinician authorized return. Never inferred. */
  human_authorized: boolean;
  authorized_by_role?: string;
  authorized_at?: string;
}

const TOPIC = {
  reported: "relational.injury.reported",
  updated: "relational.injury.updated",
  checkpoint: "relational.injury.recovery_checkpoint",
  rtp: "relational.injury.rtp_authorized",
  revoked: "relational.injury.visibility_revoked",
} as const;

const OPEN_STATUSES = new Set(["limited", "inactive"]);

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.length > 0 ? v : fallback;
}

function byTime(a: { occurred_at: string }, b: { occurred_at: string }) {
  return a.occurred_at < b.occurred_at ? -1 : a.occurred_at > b.occurred_at ? 1 : 0;
}

/**
 * Build one arc per body region from the raw event stream.
 * Deterministic: identical input rows always yield identical arcs.
 */
export function buildInjuryArcs(rows: readonly InjuryEventRow[]): InjuryArc[] {
  const ordered = [...rows].sort(byTime);
  const revoked = new Set<string>();
  for (const r of ordered) {
    if (r.topic_id === TOPIC.revoked) {
      const target = str(r.payload?.["revokes_event_id"]);
      if (target) revoked.add(target);
    }
  }

  const arcs = new Map<string, InjuryArc>();

  for (const r of ordered) {
    if (revoked.has(r.event_id)) continue;
    const p = r.payload ?? {};
    const region = str(p["body_region"]);
    if (!region) continue;

    if (r.topic_id === TOPIC.reported || r.topic_id === TOPIC.updated) {
      const existing = arcs.get(region);
      if (!existing || existing.human_authorized) {
        // A new report after a cleared arc opens a fresh arc.
        arcs.set(region, {
          body_region: region,
          origin_event_id: r.event_id,
          opened_at: r.occurred_at,
          last_event_at: r.occurred_at,
          severity_band: str(p["severity_band"], "light"),
          participation_status: str(p["participation_status"], "modified"),
          symptoms: Array.isArray(p["reported_symptoms"])
            ? (p["reported_symptoms"] as string[])
            : [],
          checkpoints: [],
          stage: "reported",
          human_authorized: false,
        });
      } else {
        existing.last_event_at = r.occurred_at;
        existing.severity_band = str(p["severity_band"], existing.severity_band);
        existing.participation_status = str(
          p["participation_status"],
          existing.participation_status,
        );
        if (Array.isArray(p["reported_symptoms"])) {
          existing.symptoms = p["reported_symptoms"] as string[];
        }
      }
      continue;
    }

    if (r.topic_id === TOPIC.checkpoint) {
      const arc = arcs.get(region);
      if (!arc || arc.human_authorized) continue;
      arc.checkpoints.push({
        event_id: r.event_id,
        occurred_at: r.occurred_at,
        checkpoint_type: str(p["checkpoint_type"], "general"),
        participation_status: str(p["participation_status"], "modified"),
        recovery_focus: str(p["recovery_focus"]) || undefined,
      });
      arc.participation_status = str(
        p["participation_status"],
        arc.participation_status,
      );
      arc.last_event_at = r.occurred_at;
      continue;
    }

    if (r.topic_id === TOPIC.rtp) {
      const arc = arcs.get(region);
      if (!arc) continue;
      arc.human_authorized = true;
      arc.authorized_by_role = str(r.actor_role ?? undefined) || undefined;
      arc.authorized_at = r.occurred_at;
      arc.participation_status = str(
        p["participation_status"],
        "full",
      );
      arc.last_event_at = r.occurred_at;
    }
  }

  for (const arc of arcs.values()) arc.stage = deriveStage(arc);
  return [...arcs.values()].sort((a, b) =>
    a.last_event_at < b.last_event_at ? 1 : -1,
  );
}

/**
 * Stage is descriptive, never predictive. `awaiting_authorization` means
 * "the athlete has logged graded steps and no longer reports a limiting
 * status" — it explicitly does NOT mean the athlete is cleared.
 */
export function deriveStage(arc: InjuryArc): InjuryContinuityStage {
  if (arc.human_authorized) return "cleared";
  const limiting = OPEN_STATUSES.has(arc.participation_status);
  if (arc.checkpoints.length === 0) return "reported";
  if (limiting) return "adapting";
  if (arc.checkpoints.length < 2) return "graded_steps";
  return "awaiting_authorization";
}

export const STAGE_COPY: Record<
  InjuryContinuityStage,
  { label: string; help: string }
> = {
  reported: {
    label: "Reported",
    help: "You told Hammer about this. Today's plan works around it.",
  },
  adapting: {
    label: "Adapted plan",
    help: "Your plan is adapted while this is still limiting you.",
  },
  graded_steps: {
    label: "Graded steps",
    help: "You've logged a step back toward full work. Keep logging how it responds.",
  },
  awaiting_authorization: {
    label: "Needs sign-off",
    help: "Steps are logged. A parent or clinician has to authorize full return — Hammer never clears you.",
  },
  cleared: {
    label: "Cleared",
    help: "Return was authorized by a person, and recorded.",
  },
};

/** Regions that must keep gating the daily plan. */
export function activeRegions(arcs: readonly InjuryArc[]): string[] {
  return arcs.filter((a) => !a.human_authorized).map((a) => a.body_region);
}
