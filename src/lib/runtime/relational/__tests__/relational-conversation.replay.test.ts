import { describe, it, expect } from "vitest";
import { conversationMemoryState } from "@/lib/runtime/projections/conversationMemoryState";
import { trustState } from "@/lib/runtime/projections/trustState";
import { mk, ENV } from "./_fixtures";

const ROWS = [
  mk({
    event_id: "c1",
    topic_id: "relational.conversation.turn",
    occurred_at: "2026-01-01T10:00:00Z",
    payload: {
      ...ENV,
      visibility_scope: "self",
      authority: "self",
      confidence: null,
      thread_id: "t1",
      speaker_role: "athlete",
      utterance_ref: "hash_a",
      intent_tag: "checkin",
      recalled_event_ids: [],
      trust_delta: 0.05,
      counterparty_id: "cp_hammer",
    },
  }),
  mk({
    event_id: "c2",
    topic_id: "relational.conversation.turn",
    occurred_at: "2026-01-01T10:01:00Z",
    payload: {
      ...ENV,
      visibility_scope: "self",
      authority: "self",
      confidence: null,
      thread_id: "t1",
      speaker_role: "coach_hammer",
      utterance_ref: "hash_b",
      intent_tag: "reflect",
      recalled_event_ids: ["c1"],
      trust_delta: 0.02,
      counterparty_id: "cp_hammer",
    },
  }),
  mk({
    event_id: "c3",
    topic_id: "relational.conversation.shared",
    occurred_at: "2026-01-01T10:02:00Z",
    payload: {
      ...ENV,
      visibility_scope: "self",
      authority: "self",
      confidence: null,
      thread_id: "t1",
      shared_with_scope: "coach",
      redaction_mask: [],
      consent_event_id: "cs1",
    },
  }),
  mk({
    event_id: "c2",
    topic_id: "relational.conversation.redacted",
    occurred_at: "2026-01-01T10:03:00Z",
    payload: {
      ...ENV,
      visibility_scope: "self",
      authority: "self",
      confidence: null,
      thread_id: "t1",
      turn_ids: ["c2"],
      reason: "consent_withdrawn",
      redacted_by_authority: "self",
    },
  }),
];

describe("relational.conversation projection — replay determinism", () => {
  it("is byte-stable across two builds", () => {
    const a = conversationMemoryState(ROWS, "self");
    const b = conversationMemoryState(ROWS, "self");
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
  });

  it("zeros utterance_ref and removes trust_delta on redacted turns", () => {
    const { state } = conversationMemoryState(ROWS, "self");
    const thread = state.threads["t1"];
    expect(thread).toBeDefined();
    const redacted = thread.turns.find((t) => t.redacted);
    expect(redacted?.utterance_ref).toBe("");
    // c1 contributes 0.05; c2 (redacted) contributes nothing.
    expect(thread.trust_score).toBeCloseTo(0.05, 10);
  });

  it("records last_shared_scope from shared events", () => {
    const { state } = conversationMemoryState(ROWS, "self");
    expect(state.threads["t1"].last_shared_scope).toBe("coach");
  });

  it("trustState derives per-counterparty and excludes redacted turns", () => {
    const { state } = trustState(ROWS, "self");
    const cp = state.byCounterparty["cp_hammer"];
    expect(cp.trust_score).toBeCloseTo(0.05, 10);
    expect(cp.contribution_count).toBe(1);
  });
});
