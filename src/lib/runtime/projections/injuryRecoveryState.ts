/**
 * RR-6 Wave 1 — relational.injury.* projection.
 *
 * Pure, deterministic, memoized. Folds injury continuity into:
 *   • activeRecoveryState        — most-recent observation per body_region
 *                                 (no inference into untouched regions)
 *   • participationStatus        — most-recent overall participation status
 *   • latestCheckpointByType     — most-recent checkpoint per type
 *   • visibleRecoveryTimeline    — chronological visible events
 *   • revokedEventIds            — honoured on next rebuild (RR-6 inv 10)
 *   • safeguardingHeld           — true if any visible event carries
 *                                  safeguarding_category (RR-6 inv 9)
 *   • missingness                — explicit gaps; never imputed (RR-6 inv 6)
 *
 * Replay invariants:
 *   • Byte-identical output under identical inputs at pinned engine_version
 *     + reasoning_version.
 *   • Revocation removes downstream visibility on next rebuild (RR-6 inv 10).
 *   • Demo↔production firewall and parent-scope guard inherited via
 *     prepareRows (Wave 1D).
 *   • No prediction, no future-estimate, no RTP inference, no organism
 *     scoring. No Date.now / Math.random / I/O.
 */
import { memoize, type Scope } from "./types";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";
import {
  INJURY_TOPIC_PREFIX,
  INJURY_TOPICS,
  type InjurySeverityBand,
  type InjuryParticipationStatus,
  type InjuryCheckpointType,
  type InjuryReportedSymptom,
} from "@/lib/runtime/relational/injurySchemas";

export type InjuryEventKind =
  | "reported"
  | "updated"
  | "recovery_checkpoint"
  | "rtp_authorized";

export interface InjuryRecoveryNode {
  event_id: string;
  kind: InjuryEventKind;
  occurred_at: string;
  body_region: string | null;
  severity_band: InjurySeverityBand | null;
  participation_status: InjuryParticipationStatus | null;
  reported_symptoms: InjuryReportedSymptom[];
  checkpoint_type: InjuryCheckpointType | null;
  recovery_focus: string | null;
  authority: "self" | "parent" | "clinician";
  visibility_scope: "self" | "parent" | "coach" | "demo";
  safeguarding_category: boolean;
  lineage_parent_ids: string[];
}

export interface InjuryActiveRegionState {
  event_id: string;
  body_region: string;
  severity_band: InjurySeverityBand | null;
  participation_status: InjuryParticipationStatus | null;
  occurred_at: string;
  rtp_authorized: boolean;
  rtp_event_id: string | null;
}

export interface InjuryRecoveryState {
  activeRecoveryState: Record<string, InjuryActiveRegionState>;
  participationStatus: InjuryParticipationStatus | null;
  latestCheckpointByType: Partial<Record<InjuryCheckpointType, string>>;
  visibleRecoveryTimeline: InjuryRecoveryNode[];
  revokedEventIds: string[];
  safeguardingHeld: boolean;
  missingness: {
    fields: string[];
    reason: "not_observed" | "redacted" | "consent_withheld";
  };
}

const PREFIXES = [INJURY_TOPIC_PREFIX];

function kindOf(topicId: string): InjuryEventKind | "revoked" | null {
  switch (topicId) {
    case INJURY_TOPICS.reported:
      return "reported";
    case INJURY_TOPICS.updated:
      return "updated";
    case INJURY_TOPICS.recovery_checkpoint:
      return "recovery_checkpoint";
    case INJURY_TOPICS.rtp_authorized:
      return "rtp_authorized";
    case INJURY_TOPICS.visibility_revoked:
      return "revoked";
    default:
      return null;
  }
}

export const buildInjuryRecoveryState = memoize<InjuryRecoveryState>((rows) => {
  // Pass 1 — collect revocations (RR-6 invariant 10).
  const revoked = new Set<string>();
  for (const r of rows) {
    if (r.topic_id !== INJURY_TOPICS.visibility_revoked) continue;
    const p = r.payload as { revokes_event_id?: string } | undefined;
    if (p?.revokes_event_id) revoked.add(p.revokes_event_id);
  }

  // Pass 2 — fold visible nodes.
  const nodes: InjuryRecoveryNode[] = [];
  const missingFields = new Set<string>();
  let safeguardingHeld = false;

  for (const r of rows) {
    const k = kindOf(r.topic_id);
    if (!k || k === "revoked") continue;
    if (revoked.has(r.event_id)) continue;

    const p = (r.payload ?? {}) as Record<string, unknown>;
    const miss = p.missingness as
      | {
          fields?: string[];
          reason?: InjuryRecoveryState["missingness"]["reason"];
        }
      | undefined;
    for (const f of miss?.fields ?? []) missingFields.add(f);

    const safeguarding = Boolean(p.safeguarding_category);
    if (safeguarding) safeguardingHeld = true;

    nodes.push({
      event_id: r.event_id,
      kind: k,
      occurred_at: r.occurred_at,
      body_region: (p.body_region as string | undefined) ?? null,
      severity_band:
        (p.severity_band as InjurySeverityBand | undefined) ?? null,
      participation_status:
        (p.participation_status as InjuryParticipationStatus | undefined) ??
        null,
      reported_symptoms:
        (p.reported_symptoms as InjuryReportedSymptom[] | undefined) ?? [],
      checkpoint_type:
        (p.checkpoint_type as InjuryCheckpointType | undefined) ?? null,
      recovery_focus: (p.recovery_focus as string | undefined) ?? null,
      authority:
        (p.authority as InjuryRecoveryNode["authority"]) ?? "self",
      visibility_scope:
        (p.visibility_scope as InjuryRecoveryNode["visibility_scope"]) ??
        "self",
      safeguarding_category: safeguarding,
      lineage_parent_ids:
        (p.lineage_parent_ids as string[] | undefined) ?? [],
    });
  }

  // activeRecoveryState — last observation per body_region. RTP
  // authorization flips rtp_authorized=true for that region; never
  // inferred — only set when a canonical rtp_authorized event has been
  // emitted by parent/clinician (RR-6 invariant 5).
  const active: Record<string, InjuryActiveRegionState> = {};
  for (const n of nodes) {
    if (n.kind === "rtp_authorized") {
      if (!n.body_region) continue;
      const prior = active[n.body_region];
      active[n.body_region] = {
        event_id: prior?.event_id ?? n.event_id,
        body_region: n.body_region,
        severity_band: prior?.severity_band ?? null,
        participation_status: n.participation_status ?? prior?.participation_status ?? null,
        occurred_at: n.occurred_at,
        rtp_authorized: true,
        rtp_event_id: n.event_id,
      };
      continue;
    }
    if (!n.body_region) continue;
    if (n.kind !== "reported" && n.kind !== "updated") continue;
    const prior = active[n.body_region];
    active[n.body_region] = {
      event_id: n.event_id,
      body_region: n.body_region,
      severity_band: n.severity_band ?? prior?.severity_band ?? null,
      participation_status:
        n.participation_status ?? prior?.participation_status ?? null,
      occurred_at: n.occurred_at,
      rtp_authorized: prior?.rtp_authorized ?? false,
      rtp_event_id: prior?.rtp_event_id ?? null,
    };
  }

  // participationStatus — most-recent overall (last write wins by
  // chronological order — prepareRows sorted).
  let participationStatus: InjuryParticipationStatus | null = null;
  for (const n of nodes) {
    if (n.participation_status) participationStatus = n.participation_status;
  }

  // latestCheckpointByType
  const latestCheckpointByType: Partial<
    Record<InjuryCheckpointType, string>
  > = {};
  for (const n of nodes) {
    if (n.kind === "recovery_checkpoint" && n.checkpoint_type) {
      latestCheckpointByType[n.checkpoint_type] = n.event_id;
    }
  }

  return {
    activeRecoveryState: active,
    participationStatus,
    latestCheckpointByType,
    visibleRecoveryTimeline: nodes,
    revokedEventIds: Array.from(revoked).sort(),
    safeguardingHeld,
    missingness: {
      fields: Array.from(missingFields).sort(),
      reason: "not_observed",
    },
  };
});

export function injuryRecoveryState(
  rows: AsbEventRow[] | undefined,
  scope: Scope,
) {
  return buildInjuryRecoveryState(rows, scope, PREFIXES);
}
