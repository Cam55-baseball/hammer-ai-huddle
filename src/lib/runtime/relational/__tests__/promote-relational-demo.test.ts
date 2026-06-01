import { describe, it, expect } from "vitest";
import { planPromotions } from "../../../../../scripts/promote-relational-demo";
import { conversationMemoryState } from "@/lib/runtime/projections/conversationMemoryState";
import { mk, ENV } from "./_fixtures";

const DEMO_ROWS = [
  {
    event_id: "demo-c1",
    athlete_id: "ath_test",
    topic_id: "relational.conversation.turn",
    actor_role: "athlete" as const,
    actor_id: "u_test",
    occurred_at: "2026-01-01T10:00:00Z",
    payload: {
      ...ENV,
      visibility_scope: "demo",
      authority: "self",
      confidence: null,
      thread_id: "t-demo",
      speaker_role: "athlete",
      utterance_ref: "h1",
      intent_tag: "checkin",
      recalled_event_ids: [],
      trust_delta: 0.01,
      counterparty_id: "cp",
    },
  },
];

describe("promote-relational-demo — additive migration", () => {
  it("(a) demo rows are inputs only; planPromotions never mutates them", async () => {
    const snapshot = JSON.parse(JSON.stringify(DEMO_ROWS));
    await planPromotions(DEMO_ROWS, "self");
    expect(DEMO_ROWS).toEqual(snapshot);
  });

  it("(b) every plan entry has lineage material referencing the original event id", async () => {
    const plan = await planPromotions(DEMO_ROWS, "self");
    expect(plan).toHaveLength(1);
    for (const p of plan) {
      expect(p.promoted.lineage_refs).toContain(p.original.event_id);
      expect(
        (p.promoted.payload as { lineage_parent_ids: string[] })
          .lineage_parent_ids,
      ).toContain(p.original.event_id);
      expect(p.lineageMaterial).toBe(
        `promote::${p.original.event_id}::self`,
      );
    }
  });

  it("(c) projection continuity: demo@demo ≅ promoted@self (shape)", async () => {
    const plan = await planPromotions(DEMO_ROWS, "self");
    const demoRows = DEMO_ROWS.map((r) =>
      mk({
        event_id: r.event_id,
        topic_id: r.topic_id,
        occurred_at: r.occurred_at,
        payload: r.payload,
      }),
    );
    const promotedRows = plan.map((p) =>
      mk({
        event_id: p.promoted.event_id,
        topic_id: p.promoted.topic_id,
        occurred_at: p.promoted.occurred_at,
        payload: p.promoted.payload,
      }),
    );
    const a = conversationMemoryState(demoRows, "demo");
    const b = conversationMemoryState(promotedRows, "self");
    // Threads + turn counts + derived trust must be equivalent shapes.
    const norm = (s: typeof a.state) =>
      Object.values(s.threads).map((t) => ({
        turns: t.turns.length,
        trust_score: t.trust_score,
        last_shared_scope: t.last_shared_scope,
      }));
    expect(norm(a.state)).toEqual(norm(b.state));
  });

  it("promotion idempotency is deterministic across runs", async () => {
    const p1 = await planPromotions(DEMO_ROWS, "self");
    const p2 = await planPromotions(DEMO_ROWS, "self");
    expect(p1[0].promoted.idempotency_key).toBe(p2[0].promoted.idempotency_key);
    expect(p1[0].promoted.event_id).toBe(p2[0].promoted.event_id);
  });
});
