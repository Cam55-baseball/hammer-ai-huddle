/**
 * Phase A §3 — Authenticated relational persistence + demo/live coexistence.
 *
 * Verifies (without touching the DB):
 *   (a) projections built from a persisted-then-reread row set equal
 *       projections built directly from the source rows
 *   (b) demo↔production firewall (prepareRows) strips cross-scope rows
 *   (c) mixed demo + self rows preserve scope isolation in every projection
 */
import { describe, it, expect } from "vitest";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";
import { prepareRows } from "@/lib/runtime/projections/types";
import { psychState } from "@/lib/runtime/projections/psychState";
import { conversationMemoryState } from "@/lib/runtime/projections/conversationMemoryState";
import { developmentalState } from "@/lib/runtime/projections/developmentalState";
import { stableStringify } from "./_seed";

const ENV = {
  engine_version: "asb-1.0.0",
  reasoning_version: "relational-1.0.0",
};

function mkRow(opts: {
  event_id: string;
  topic_id: string;
  occurred_at: string;
  payload: Record<string, unknown>;
  actor_role?: AsbEventRow["actor_role"];
}): AsbEventRow {
  return {
    event_id: opts.event_id,
    athlete_id: "athlete-x",
    topic_id: opts.topic_id,
    actor_role: opts.actor_role ?? "athlete",
    actor_id: "athlete-x",
    occurred_at: opts.occurred_at,
    ingested_at: opts.occurred_at,
    effective_at: opts.occurred_at,
    valid_from: opts.occurred_at,
    valid_to: null,
    payload: opts.payload,
    engine_version: "asb-1.0.0",
    idempotency_key: opts.event_id,
    causality_refs: [],
    lineage_refs: [],
  };
}

const selfRows: AsbEventRow[] = [
  mkRow({
    event_id: "live_psych_1",
    topic_id: "relational.psych.self_report",
    occurred_at: "2026-02-01T10:00:00.000Z",
    payload: {
      ...ENV,
      visibility_scope: "self",
      confidence: 0.85,
      missingness: { fields: [], reason: "not_observed" },
      authority: "self",
      lineage_parent_ids: [],
      axis: "confidence",
      band: "rising",
      narrative_ref: "n1",
    },
  }),
  mkRow({
    event_id: "live_conv_1",
    topic_id: "relational.conversation.turn",
    occurred_at: "2026-02-01T10:05:00.000Z",
    payload: {
      ...ENV,
      visibility_scope: "self",
      confidence: 1,
      missingness: { fields: [], reason: "not_observed" },
      authority: "self",
      lineage_parent_ids: [],
      thread_id: "t1",
      speaker_role: "athlete",
      utterance_ref: "u1",
      intent_tag: "checkin",
      recalled_event_ids: [],
      trust_delta: 0,
      counterparty_id: null,
    },
  }),
];

const demoRow = mkRow({
  event_id: "demo_psych_1",
  topic_id: "relational.psych.self_report",
  occurred_at: "2026-02-01T11:00:00.000Z",
  payload: {
    ...ENV,
    visibility_scope: "demo",
    confidence: 0.5,
    missingness: { fields: [], reason: "not_observed" },
    authority: "self",
    lineage_parent_ids: [],
    axis: "confidence",
    band: "strained",
    narrative_ref: "n_demo",
  },
});

describe("Phase A §3 — authenticated relational persistence", () => {
  it("(a) persistence round-trip preserves projection state byte-for-byte", () => {
    const original = {
      psych: psychState(selfRows, "self").state,
      conv: conversationMemoryState(selfRows, "self").state,
      dev: developmentalState(selfRows, "self").state,
    };
    // Simulate persistence + refetch by re-cloning rows (new array identity
    // defeats memoization; output must still match).
    const refetched = selfRows.map((r) => ({ ...r, payload: { ...r.payload } }));
    const after = {
      psych: psychState(refetched, "self").state,
      conv: conversationMemoryState(refetched, "self").state,
      dev: developmentalState(refetched, "self").state,
    };
    expect(stableStringify(after)).toBe(stableStringify(original));
  });

  it("(b) firewall: demo rows never reach self-scope projection", () => {
    const mixed = [...selfRows, demoRow];
    const filtered = prepareRows(mixed, "self", ["relational."]);
    expect(filtered.find((r) => r.event_id === "demo_psych_1")).toBeUndefined();
    expect(filtered.length).toBe(selfRows.length);
  });

  it("(b') firewall: self rows never reach demo-scope projection", () => {
    const mixed = [...selfRows, demoRow];
    const filtered = prepareRows(mixed, "demo", ["relational."]);
    expect(filtered.length).toBe(1);
    expect(filtered[0].event_id).toBe("demo_psych_1");
  });

  it("(c) mixed coexistence: each scope sees only its own narrative", () => {
    const mixed = [...selfRows, demoRow];
    const psSelf = psychState(mixed, "self").state;
    const psDemo = psychState(mixed, "demo").state;
    expect(psSelf.axes.confidence.source).toBe("self");
    expect(psDemo.axes.confidence.source).toBe("self");
    // The two states are derived from disjoint event sets and must not be
    // identical (confidence values differ across scopes).
    expect(stableStringify(psSelf)).not.toBe(stableStringify(psDemo));
  });
});
