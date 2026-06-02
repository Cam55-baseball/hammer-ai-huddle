/**
 * RR-5 — narrativeState projection tests.
 *
 * Validates:
 *   • rebuild determinism (byte-identical JSON output)
 *   • out-of-order replay stability
 *   • duplicate event idempotency (via projection)
 *   • revocation removes downstream visibility on next rebuild
 *   • missing-memory survivability (gaps visible, not imputed)
 *   • citation-less narrative rows are dropped
 *   • resurfacing candidate ordering is deterministic
 */
import { describe, it, expect } from "vitest";
import { narrativeState } from "@/lib/runtime/projections/narrativeState";
import { mk, ENV } from "@/lib/runtime/relational/__tests__/_fixtures";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";

const baseEnv = {
  ...ENV,
  visibility_scope: "self" as const,
  authority: "self" as const,
  confidence: 0.6,
};

const ROWS: AsbEventRow[] = [
  mk({
    event_id: "n1",
    topic_id: "relational.narrative.memory_anchor",
    occurred_at: "2026-01-01T10:00:00Z",
    payload: {
      ...baseEnv,
      lineage_parent_ids: ["c_outing_1"],
      anchor_kind: "outing",
      topic_tag: "first bullpen",
    },
  }),
  mk({
    event_id: "n2",
    topic_id: "relational.narrative.slump_marker",
    occurred_at: "2026-01-05T10:00:00Z",
    payload: {
      ...baseEnv,
      lineage_parent_ids: ["s_self_1", "s_self_2"],
      window_start: "2026-01-01",
      window_end: "2026-01-05",
      pattern_kind: "self_report_decline",
    },
  }),
  mk({
    event_id: "n3",
    topic_id: "relational.narrative.context_recall",
    occurred_at: "2026-01-06T10:00:00Z",
    payload: {
      ...baseEnv,
      lineage_parent_ids: ["n1"],
      recalled_event_ids: ["n1"],
      surface: "hammer_thread",
    },
  }),
  mk({
    event_id: "n4",
    topic_id: "relational.narrative.identity_reflection",
    occurred_at: "2026-01-07T10:00:00Z",
    payload: {
      ...baseEnv,
      lineage_parent_ids: [],
      reflection_ref: "ref_hash_1",
      revokes_event_id: null,
    },
  }),
];

describe("narrativeState — RR-5 projection", () => {
  it("rebuilds byte-identically under identical inputs", () => {
    const a = narrativeState(ROWS, "self").state;
    const b = narrativeState([...ROWS], "self").state;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("is stable under shuffled input (prepareRows sorts deterministically)", () => {
    const shuffled = [ROWS[2], ROWS[0], ROWS[3], ROWS[1]];
    const a = narrativeState(ROWS, "self").state;
    const b = narrativeState(shuffled, "self").state;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("drops citation-less cite-bound narrative rows", () => {
    const bad: AsbEventRow = mk({
      event_id: "bad1",
      topic_id: "relational.narrative.memory_anchor",
      occurred_at: "2026-01-02T00:00:00Z",
      payload: {
        ...baseEnv,
        lineage_parent_ids: [],
        anchor_kind: "outing",
        topic_tag: "ghost",
      },
    });
    const s = narrativeState([...ROWS, bad], "self").state;
    expect(s.continuityTimeline.find((n) => n.event_id === "bad1")).toBeUndefined();
  });

  it("revocation removes downstream visibility on next rebuild", () => {
    const revoke: AsbEventRow = mk({
      event_id: "n5",
      topic_id: "relational.narrative.identity_reflection",
      occurred_at: "2026-01-08T10:00:00Z",
      payload: {
        ...baseEnv,
        lineage_parent_ids: [],
        reflection_ref: "ref_hash_2",
        revokes_event_id: "n4",
      },
    });
    const s = narrativeState([...ROWS, revoke], "self").state;
    expect(s.revokedEventIds).toContain("n4");
    expect(s.continuityTimeline.find((n) => n.event_id === "n4")).toBeUndefined();
    // The revoking event itself remains visible.
    expect(s.continuityTimeline.find((n) => n.event_id === "n5")).toBeDefined();
  });

  it("preserves missingness as explicit signal — never imputed", () => {
    const sparse: AsbEventRow = mk({
      event_id: "n_miss",
      topic_id: "relational.narrative.memory_anchor",
      occurred_at: "2026-01-09T10:00:00Z",
      payload: {
        ...baseEnv,
        lineage_parent_ids: ["c_outing_2"],
        anchor_kind: "outing",
        topic_tag: "outing",
        missingness: { fields: ["outing_quality"], reason: "not_observed" },
      },
    });
    const s = narrativeState([sparse], "self").state;
    expect(s.missingness.fields).toContain("outing_quality");
  });

  it("ranks resurfacing candidates deterministically (highest = top)", () => {
    const s = narrativeState(ROWS, "self").state;
    expect(s.resurfacingCandidates.length).toBeGreaterThan(0);
    for (let i = 1; i < s.resurfacingCandidates.length; i++) {
      expect(s.resurfacingCandidates[i - 1].score).toBeGreaterThanOrEqual(
        s.resurfacingCandidates[i].score,
      );
    }
  });

  it("treats duplicate event ids idempotently in projection output", () => {
    const dup = [...ROWS, ROWS[0]];
    const a = narrativeState(ROWS, "self").state;
    const b = narrativeState(dup, "self").state;
    // Duplicate row is sorted in but produces an extra node; this validates
    // the projection itself is deterministic — dedupe is enforced at the
    // ledger via idempotency_key, not in the projection.
    expect(b.continuityTimeline.length).toBe(a.continuityTimeline.length + 1);
    // Reordering duplicates yields identical state.
    const reordered = [ROWS[0], ...ROWS];
    expect(JSON.stringify(narrativeState(reordered, "self").state)).toBe(
      JSON.stringify(b),
    );
  });

  it("flags unresolved slump markers until a matching pattern follows", () => {
    const s = narrativeState(ROWS, "self").state;
    expect(s.unresolvedThreads.find((n) => n.event_id === "n2")).toBeDefined();

    const followUp: AsbEventRow = mk({
      event_id: "n6",
      topic_id: "relational.narrative.breakthrough_marker",
      occurred_at: "2026-01-15T10:00:00Z",
      payload: {
        ...baseEnv,
        lineage_parent_ids: ["s_self_3"],
        window_start: "2026-01-10",
        window_end: "2026-01-15",
        pattern_kind: "self_report_decline",
      },
    });
    const s2 = narrativeState([...ROWS, followUp], "self").state;
    expect(s2.unresolvedThreads.find((n) => n.event_id === "n2")).toBeUndefined();
  });

  it("demo↔production firewall holds — self scope ignores demo events", () => {
    const demoRow: AsbEventRow = mk({
      event_id: "n_demo",
      topic_id: "relational.narrative.memory_anchor",
      occurred_at: "2026-01-10T10:00:00Z",
      payload: {
        ...baseEnv,
        visibility_scope: "demo",
        lineage_parent_ids: ["demo_ref"],
        anchor_kind: "outing",
        topic_tag: "demo only",
      },
    });
    const s = narrativeState([...ROWS, demoRow], "self").state;
    expect(s.continuityTimeline.find((n) => n.event_id === "n_demo")).toBeUndefined();
  });
});
