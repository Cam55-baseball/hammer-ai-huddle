/**
 * RR-5 — narrativeState projection tests.
 *
 * Wave 1C — per-test event_id prefixes + disjoint occurred_at bands so no
 * two `it` blocks collide in the module-scope memoize cache. The original
 * shared `ROWS` constant is replaced with a `makeRows(prefix)` builder that
 * stamps every event id with a suite-local prefix, while preserving the
 * same logical narrative shape per test. Production projection logic
 * unchanged.
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

/** Build the 4-event narrative corpus under a unique prefix + date band. */
function makeRows(prefix: string, dateBand: string): AsbEventRow[] {
  // dateBand example: "2026-04-01" → events stamped on 01..04 of that month.
  const day = (d: number) =>
    `${dateBand.slice(0, 7)}-${String(d).padStart(2, "0")}T10:00:00Z`;
  return [
    mk({
      event_id: `${prefix}_n1`,
      topic_id: "relational.narrative.memory_anchor",
      occurred_at: day(1),
      payload: {
        ...baseEnv,
        lineage_parent_ids: [`${prefix}_c_outing_1`],
        anchor_kind: "outing",
        topic_tag: "first bullpen",
      },
    }),
    mk({
      event_id: `${prefix}_n2`,
      topic_id: "relational.narrative.slump_marker",
      occurred_at: day(5),
      payload: {
        ...baseEnv,
        lineage_parent_ids: [`${prefix}_s_self_1`, `${prefix}_s_self_2`],
        window_start: dateBand.slice(0, 7) + "-01",
        window_end: dateBand.slice(0, 7) + "-05",
        pattern_kind: "self_report_decline",
      },
    }),
    mk({
      event_id: `${prefix}_n3`,
      topic_id: "relational.narrative.context_recall",
      occurred_at: day(6),
      payload: {
        ...baseEnv,
        lineage_parent_ids: [`${prefix}_n1`],
        recalled_event_ids: [`${prefix}_n1`],
        surface: "hammer_thread",
      },
    }),
    mk({
      event_id: `${prefix}_n4`,
      topic_id: "relational.narrative.identity_reflection",
      occurred_at: day(7),
      payload: {
        ...baseEnv,
        lineage_parent_ids: [],
        reflection_ref: `${prefix}_ref_hash_1`,
        revokes_event_id: null,
      },
    }),
  ];
}

describe("narrativeState — RR-5 projection", () => {
  it("rebuilds byte-identically under identical inputs", () => {
    const rows = makeRows("narr_det", "2026-04-01");
    const a = narrativeState(rows, "self").state;
    const b = narrativeState([...rows], "self").state;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("is stable under shuffled input (prepareRows sorts deterministically)", () => {
    const rows = makeRows("narr_shuffle", "2026-04-08");
    const shuffled = [rows[2], rows[0], rows[3], rows[1]];
    const a = narrativeState(rows, "self").state;
    const b = narrativeState(shuffled, "self").state;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("drops citation-less cite-bound narrative rows", () => {
    const rows = makeRows("narr_cite", "2026-04-15");
    const bad: AsbEventRow = mk({
      event_id: "narr_cite_bad1",
      topic_id: "relational.narrative.memory_anchor",
      occurred_at: "2026-04-15T02:00:00Z",
      payload: {
        ...baseEnv,
        lineage_parent_ids: [],
        anchor_kind: "outing",
        topic_tag: "ghost",
      },
    });
    const s = narrativeState([...rows, bad], "self").state;
    expect(
      s.continuityTimeline.find((n) => n.event_id === "narr_cite_bad1"),
    ).toBeUndefined();
  });

  it("revocation removes downstream visibility on next rebuild", () => {
    const rows = makeRows("narr_rev", "2026-04-22");
    const revoke: AsbEventRow = mk({
      event_id: "narr_rev_n5",
      topic_id: "relational.narrative.identity_reflection",
      occurred_at: "2026-04-22T11:00:00Z",
      payload: {
        ...baseEnv,
        lineage_parent_ids: [],
        reflection_ref: "narr_rev_ref_hash_2",
        revokes_event_id: "narr_rev_n4",
      },
    });
    const s = narrativeState([...rows, revoke], "self").state;
    expect(s.revokedEventIds).toContain("narr_rev_n4");
    expect(s.continuityTimeline.find((n) => n.event_id === "narr_rev_n4")).toBeUndefined();
    expect(s.continuityTimeline.find((n) => n.event_id === "narr_rev_n5")).toBeDefined();
  });

  it("preserves missingness as explicit signal — never imputed", () => {
    const sparse: AsbEventRow = mk({
      event_id: "narr_miss_n1",
      topic_id: "relational.narrative.memory_anchor",
      occurred_at: "2026-05-01T10:00:00Z",
      payload: {
        ...baseEnv,
        lineage_parent_ids: ["narr_miss_c_outing_2"],
        anchor_kind: "outing",
        topic_tag: "outing",
        missingness: { fields: ["outing_quality"], reason: "not_observed" },
      },
    });
    const s = narrativeState([sparse], "self").state;
    expect(s.missingness.fields).toContain("outing_quality");
  });

  it("ranks resurfacing candidates deterministically (highest = top)", () => {
    const rows = makeRows("narr_rank", "2026-05-08");
    const s = narrativeState(rows, "self").state;
    expect(s.resurfacingCandidates.length).toBeGreaterThan(0);
    for (let i = 1; i < s.resurfacingCandidates.length; i++) {
      expect(s.resurfacingCandidates[i - 1].score).toBeGreaterThanOrEqual(
        s.resurfacingCandidates[i].score,
      );
    }
  });

  it("treats duplicate event ids idempotently in projection output", () => {
    const rows = makeRows("narr_dup", "2026-05-15");
    const dup = [...rows, rows[0]];
    const a = narrativeState(rows, "self").state;
    const b = narrativeState(dup, "self").state;
    expect(b.continuityTimeline.length).toBe(a.continuityTimeline.length + 1);
    const reordered = [rows[0], ...rows];
    expect(JSON.stringify(narrativeState(reordered, "self").state)).toBe(
      JSON.stringify(b),
    );
  });

  it("flags unresolved slump markers until a matching pattern follows", () => {
    const rows = makeRows("narr_unres", "2026-05-22");
    const s = narrativeState(rows, "self").state;
    expect(s.unresolvedThreads.find((n) => n.event_id === "narr_unres_n2")).toBeDefined();

    const followUp: AsbEventRow = mk({
      event_id: "narr_unres_n6",
      topic_id: "relational.narrative.breakthrough_marker",
      occurred_at: "2026-05-29T10:00:00Z",
      payload: {
        ...baseEnv,
        lineage_parent_ids: ["narr_unres_s_self_3"],
        window_start: "2026-05-25",
        window_end: "2026-05-29",
        pattern_kind: "self_report_decline",
      },
    });
    const s2 = narrativeState([...rows, followUp], "self").state;
    expect(s2.unresolvedThreads.find((n) => n.event_id === "narr_unres_n2")).toBeUndefined();
  });

  it("demo↔production firewall holds — self scope ignores demo events", () => {
    const rows = makeRows("narr_demo", "2026-06-01");
    const demoRow: AsbEventRow = mk({
      event_id: "narr_demo_extra",
      topic_id: "relational.narrative.memory_anchor",
      occurred_at: "2026-06-10T10:00:00Z",
      payload: {
        ...baseEnv,
        visibility_scope: "demo",
        lineage_parent_ids: ["narr_demo_ref"],
        anchor_kind: "outing",
        topic_tag: "demo only",
      },
    });
    const s = narrativeState([...rows, demoRow], "self").state;
    expect(
      s.continuityTimeline.find((n) => n.event_id === "narr_demo_extra"),
    ).toBeUndefined();
  });
});
