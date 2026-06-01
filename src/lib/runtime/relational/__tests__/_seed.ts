/**
 * Phase 152–154 — canonical relational demo seed (pure, replay-safe).
 *
 * Produces a deterministic AsbEventRow[] for a demo athlete by routing every
 * payload through the canonical Zod schemas (parse = legality check). The
 * same builder is consumed by:
 *   • the replay-reconstruction test (in-memory projection rebuild)
 *   • the failure-injection test (mutates one event to assert containment)
 *   • scripts/seed-relational-demo.ts (optional live DB seeding via emit)
 *
 * Constitutional invariants honoured:
 *   • all events visibility_scope === "demo" (firewall in projections/types)
 *   • deterministic event_ids: ev_<topic>_<offset>
 *   • deterministic timestamps: EPOCH + offset minutes
 *   • lineage_parent_ids linking conversation citations + transitions
 *   • coach_hammer turns cite recalled_event_ids (RR-1)
 *   • inferred psych confidence ≤ 0.7 (RR-2)
 *   • monotonic developmental stage transitions (RR-3)
 *   • no direct mutation of organism_truth / athlete_intent / etc.
 */
import type { AsbEventRow } from "@/hooks/useAsbTimeline";
import {
  ConversationTurnPayload,
  ConversationSharedPayload,
  ConversationRedactedPayload,
  PsychSelfReportPayload,
  PsychInferredPayload,
  PsychTransitionPayload,
  AgeObservedPayload,
  DeloadWindowPayload,
  DevelopmentalTransitionPayload,
  RELATIONAL_TOPICS,
} from "../schemas";

// Valid UUIDs (v4-shaped) — required by `asb_events.athlete_id::uuid`.
// Kept stable + namespaced so the live demo seed is idempotent and the
// fixture fallback reads the same identifiers as production.
export const DEMO_ATHLETE_ID = "00000000-0000-4000-8000-000000000001" as const;
export const DEMO_COACH_ID = "00000000-0000-4000-8000-000000000002" as const;
export const DEMO_PARENT_ID = "00000000-0000-4000-8000-000000000003" as const;
export const DEMO_RECRUITER_ID = "00000000-0000-4000-8000-000000000004" as const;
export const DEMO_EPOCH_MS = Date.UTC(2026, 0, 1, 0, 0, 0); // 2026-01-01T00:00:00Z

const ENV = {
  engine_version: "asb-1.0.0",
  reasoning_version: "relational-1.0.0",
  visibility_scope: "demo" as const,
  missingness: { fields: [] as string[], reason: "not_observed" as const },
};

function tsAt(offsetMinutes: number): string {
  return new Date(DEMO_EPOCH_MS + offsetMinutes * 60_000).toISOString();
}

function row(
  event_id: string,
  topic_id: string,
  offsetMinutes: number,
  actor_role: AsbEventRow["actor_role"],
  actor_id: string | null,
  payload: Record<string, unknown>,
): AsbEventRow {
  const occurred_at = tsAt(offsetMinutes);
  return {
    event_id,
    athlete_id: DEMO_ATHLETE_ID,
    topic_id,
    actor_role,
    actor_id,
    occurred_at,
    ingested_at: occurred_at,
    effective_at: occurred_at,
    valid_from: occurred_at,
    valid_to: null,
    payload,
    engine_version: "asb-1.0.0",
    idempotency_key: event_id,
    causality_refs: null,
    lineage_refs: (payload.lineage_parent_ids as string[] | undefined) ?? null,
  } as AsbEventRow;
}

// ─── canonical event builders (each calls schema.parse for legality) ──────

export function buildDemoSeed(): AsbEventRow[] {
  const rows: AsbEventRow[] = [];

  // ── Phase 154: developmental foundation ──────────────────────────────
  const ageP = AgeObservedPayload.parse({
    ...ENV,
    authority: "parent",
    confidence: 1,
    lineage_parent_ids: [],
    chronological_age_years: 13,
    source: "parent",
  });
  rows.push(
    row(
      "ev_age_0001",
      RELATIONAL_TOPICS.developmental.age_observed,
      0,
      "parent",
      DEMO_PARENT_ID,
      ageP,
    ),
  );

  const trans1 = DevelopmentalTransitionPayload.parse({
    ...ENV,
    authority: "clinician",
    confidence: 0.9,
    lineage_parent_ids: ["ev_age_0001"],
    from_stage: "youth_intro",
    to_stage: "youth_developmental",
    evidence_event_ids: ["ev_age_0001"],
  });
  rows.push(
    row(
      "ev_devtrans_0010",
      RELATIONAL_TOPICS.developmental.transition,
      10,
      "system",
      null,
      trans1,
    ),
  );

  const trans2 = DevelopmentalTransitionPayload.parse({
    ...ENV,
    authority: "clinician",
    confidence: 0.9,
    lineage_parent_ids: ["ev_devtrans_0010"],
    from_stage: "youth_developmental",
    to_stage: "adolescent_early",
    evidence_event_ids: ["ev_devtrans_0010"],
  });
  rows.push(
    row(
      "ev_devtrans_0020",
      RELATIONAL_TOPICS.developmental.transition,
      20,
      "system",
      null,
      trans2,
    ),
  );

  // Growth-spurt deload
  const deload = DeloadWindowPayload.parse({
    ...ENV,
    authority: "clinician",
    confidence: 0.85,
    lineage_parent_ids: ["ev_devtrans_0020"],
    window_start: tsAt(30),
    window_end: tsAt(30 + 60 * 24 * 14),
    reason: "growth_spurt",
    load_ceiling_pct: 65,
  });
  rows.push(
    row(
      "ev_deload_0030",
      RELATIONAL_TOPICS.developmental.deload_window,
      30,
      "system",
      null,
      deload,
    ),
  );

  // ── Phase 153: psych transitions (slump → reload) ────────────────────
  const psychSelf1 = PsychSelfReportPayload.parse({
    ...ENV,
    authority: "self",
    confidence: 1,
    lineage_parent_ids: [],
    axis: "confidence",
    value: -1.5, // strained
  });
  rows.push(
    row(
      "ev_psych_self_0040",
      RELATIONAL_TOPICS.psych.self_report,
      40,
      "athlete",
      DEMO_ATHLETE_ID,
      psychSelf1,
    ),
  );

  const psychInf1 = PsychInferredPayload.parse({
    ...ENV,
    authority: "system_inferred",
    confidence: 0.6, // ≤ 0.7 ceiling
    lineage_parent_ids: ["ev_psych_self_0040"],
    axis: "motivation",
    value: -1.2,
    evidence_event_ids: ["ev_psych_self_0040"],
  });
  rows.push(
    row(
      "ev_psych_inf_0050",
      RELATIONAL_TOPICS.psych.inferred,
      50,
      "system",
      null,
      psychInf1,
    ),
  );

  const psychTrans = PsychTransitionPayload.parse({
    ...ENV,
    authority: "system_inferred",
    confidence: 0.55,
    lineage_parent_ids: ["ev_psych_self_0040", "ev_psych_inf_0050"],
    axis: "confidence",
    from_band: "baseline",
    to_band: "strained",
    trigger_event_id: "ev_psych_self_0040",
    requires_human_ack: true,
  });
  rows.push(
    row(
      "ev_psych_trans_0060",
      RELATIONAL_TOPICS.psych.transition,
      60,
      "system",
      null,
      psychTrans,
    ),
  );

  // Reload — self report back to baseline
  const psychSelf2 = PsychSelfReportPayload.parse({
    ...ENV,
    authority: "self",
    confidence: 1,
    lineage_parent_ids: ["ev_psych_trans_0060"],
    axis: "confidence",
    value: 0.5, // baseline
  });
  rows.push(
    row(
      "ev_psych_self_0070",
      RELATIONAL_TOPICS.psych.self_report,
      70,
      "athlete",
      DEMO_ATHLETE_ID,
      psychSelf2,
    ),
  );

  // ── Phase 152: conversation turns ────────────────────────────────────
  const turnAthlete = ConversationTurnPayload.parse({
    ...ENV,
    authority: "self",
    confidence: 1,
    lineage_parent_ids: [],
    thread_id: "thread-coach-hammer-001",
    speaker_role: "athlete",
    utterance_ref: "utt_hash_a001",
    intent_tag: "share_slump",
    recalled_event_ids: [],
    trust_delta: 0,
    counterparty_id: "coach_hammer",
  });
  rows.push(
    row(
      "ev_conv_turn_0080",
      RELATIONAL_TOPICS.conversation.turn,
      80,
      "athlete",
      DEMO_ATHLETE_ID,
      turnAthlete,
    ),
  );

  const turnHammer = ConversationTurnPayload.parse({
    ...ENV,
    authority: "system_inferred",
    confidence: 0.6,
    lineage_parent_ids: [
      "ev_psych_self_0040",
      "ev_psych_trans_0060",
      "ev_conv_turn_0080",
    ],
    thread_id: "thread-coach-hammer-001",
    speaker_role: "coach_hammer",
    utterance_ref: "utt_hash_h001",
    intent_tag: "acknowledge_with_recall",
    // RR-1: coach_hammer cites recalled events.
    recalled_event_ids: ["ev_psych_self_0040", "ev_psych_trans_0060"],
    trust_delta: 0.05,
    counterparty_id: "coach_hammer",
  });
  rows.push(
    row(
      "ev_conv_turn_0090",
      RELATIONAL_TOPICS.conversation.turn,
      90,
      "system",
      null,
      turnHammer,
    ),
  );

  // Coach (human) check-in — trust delta from human counterparty
  const turnCoach = ConversationTurnPayload.parse({
    ...ENV,
    authority: "coach",
    confidence: 0.9,
    lineage_parent_ids: ["ev_conv_turn_0080"],
    thread_id: "thread-coach-human-001",
    speaker_role: "coach",
    utterance_ref: "utt_hash_c001",
    intent_tag: "checkin",
    recalled_event_ids: ["ev_psych_self_0040"],
    trust_delta: 0.08,
    counterparty_id: DEMO_COACH_ID,
  });
  rows.push(
    row(
      "ev_conv_turn_0100",
      RELATIONAL_TOPICS.conversation.turn,
      100,
      "coach",
      DEMO_COACH_ID,
      turnCoach,
    ),
  );

  // Parent check-in — parent trust ↑
  const turnParent = ConversationTurnPayload.parse({
    ...ENV,
    authority: "parent",
    confidence: 1,
    lineage_parent_ids: ["ev_conv_turn_0080"],
    thread_id: "thread-parent-001",
    speaker_role: "parent",
    utterance_ref: "utt_hash_p001",
    intent_tag: "support",
    recalled_event_ids: [],
    trust_delta: 0.1,
    counterparty_id: DEMO_PARENT_ID,
  });
  rows.push(
    row(
      "ev_conv_turn_0110",
      RELATIONAL_TOPICS.conversation.turn,
      110,
      "parent",
      DEMO_PARENT_ID,
      turnParent,
    ),
  );

  // Conversation shared (parent ↔ coach) with explicit consent event id
  const shared = ConversationSharedPayload.parse({
    ...ENV,
    authority: "parent",
    confidence: 1,
    lineage_parent_ids: ["ev_conv_turn_0110"],
    thread_id: "thread-parent-001",
    shared_with_scope: "coach",
    redaction_mask: ["recalled_event_ids"],
    consent_event_id: "ev_consent_seed_0001",
  });
  rows.push(
    row(
      "ev_conv_shared_0120",
      RELATIONAL_TOPICS.conversation.shared,
      120,
      "parent",
      DEMO_PARENT_ID,
      shared,
    ),
  );

  // A redacted turn — proves redaction removes utterance_ref + trust delta
  const turnRedactable = ConversationTurnPayload.parse({
    ...ENV,
    authority: "self",
    confidence: 1,
    lineage_parent_ids: [],
    thread_id: "thread-coach-hammer-001",
    speaker_role: "athlete",
    utterance_ref: "utt_hash_redactable",
    intent_tag: "venting",
    recalled_event_ids: [],
    trust_delta: 0.05,
    counterparty_id: "coach_hammer",
  });
  rows.push(
    row(
      "ev_conv_turn_0130",
      RELATIONAL_TOPICS.conversation.turn,
      130,
      "athlete",
      DEMO_ATHLETE_ID,
      turnRedactable,
    ),
  );

  const redacted = ConversationRedactedPayload.parse({
    ...ENV,
    authority: "self",
    confidence: 1,
    lineage_parent_ids: ["ev_conv_turn_0130"],
    thread_id: "thread-coach-hammer-001",
    turn_ids: ["ev_conv_turn_0130"],
    reason: "athlete_withdrew_consent",
    redacted_by_authority: "self",
  });
  rows.push(
    row(
      "ev_conv_redacted_0140",
      RELATIONAL_TOPICS.conversation.redacted,
      140,
      "athlete",
      DEMO_ATHLETE_ID,
      redacted,
    ),
  );

  return rows;
}

/** Stable JSON for byte-equality comparisons (sorted keys, recursive). */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}
