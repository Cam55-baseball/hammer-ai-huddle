/**
 * RR-8 — lifeContextState replay & determinism tests.
 *
 * Wave 1C — per-test event_id prefixes + disjoint occurred_at bands so no
 * two `it` blocks share a `(scope, lastEventId, sourceCount)` triple in the
 * module-scope memoize cache. Production projection logic unchanged.
 */
import { describe, it, expect } from "vitest";
import { lifeContextState } from "@/lib/runtime/projections/lifeContextState";
import { LIFE_CONTEXT_TOPICS } from "@/lib/runtime/relational/lifeContextSchemas";
import { mk, ENV } from "./_fixtures";

function disclosure(
  eventId: string,
  topic: string,
  occurredAt: string,
  over: Partial<Record<string, unknown>> = {},
) {
  return mk({
    event_id: eventId,
    topic_id: topic,
    occurred_at: occurredAt,
    payload: {
      ...ENV,
      authority: "self",
      visibility_scope: "self",
      confidence: null,
      window_start: occurredAt,
      window_end: occurredAt,
      intensity_band: "moderate",
      topic_tag: "week",
      ...over,
    },
  });
}

describe("lifeContextState — RR-8 replay invariants", () => {
  it("rebuilds deterministically regardless of input order", () => {
    const a = disclosure(
      "lc_det_a",
      LIFE_CONTEXT_TOPICS.academic_load,
      "2026-03-01T10:00:00Z",
    );
    const b = disclosure(
      "lc_det_b",
      LIFE_CONTEXT_TOPICS.travel_load,
      "2026-03-01T11:00:00Z",
    );
    const r1 = lifeContextState([a, b], "self").state;
    const r2 = lifeContextState([b, a], "self").state;
    expect(r1).toEqual(r2);
  });

  it("preserves missingness — categories without disclosures listed", () => {
    const a = disclosure(
      "lc_miss_a",
      LIFE_CONTEXT_TOPICS.academic_load,
      "2026-03-05T10:00:00Z",
    );
    const { state } = lifeContextState([a], "self");
    expect(state.missingness.categoriesWithoutDisclosure).toContain("family_context");
    expect(state.missingness.categoriesWithoutDisclosure).not.toContain("academic_load");
  });

  it("revocation removes downstream visibility on next rebuild (invariant 2)", () => {
    const d = disclosure(
      "lc_rev_a",
      LIFE_CONTEXT_TOPICS.travel_load,
      "2026-03-10T10:00:00Z",
    );
    const rev = mk({
      event_id: "lc_rev_b",
      topic_id: LIFE_CONTEXT_TOPICS.disclosure_revocation,
      occurred_at: "2026-03-10T11:00:00Z",
      payload: {
        ...ENV,
        authority: "self",
        visibility_scope: "self",
        confidence: null,
        revokes_event_id: "lc_rev_a",
      },
    });
    const before = lifeContextState([d], "self").state;
    expect(before.continuityTimeline).toHaveLength(1);
    const after = lifeContextState([d, rev], "self").state;
    expect(after.continuityTimeline).toHaveLength(0);
    expect(after.revokedEventIds).toContain("lc_rev_a");
  });

  it("safeguarding_category flips safeguardingHeld (invariant 8)", () => {
    const d = disclosure(
      "lc_safe_a",
      LIFE_CONTEXT_TOPICS.family_context,
      "2026-03-15T10:00:00Z",
      {
        safeguarding_category: true,
        visibility_scope: "parent",
        authority: "parent",
      },
    );
    const { state } = lifeContextState([d], "parent");
    expect(state.safeguardingHeld).toBe(true);
  });

  it("demo firewall — self scope never reads demo disclosures", () => {
    const d = disclosure(
      "lc_demo_a",
      LIFE_CONTEXT_TOPICS.academic_load,
      "2026-03-20T10:00:00Z",
      { visibility_scope: "demo" },
    );
    const { state, meta } = lifeContextState([d], "self");
    expect(meta.sourceCount).toBe(0);
    expect(state.continuityTimeline).toHaveLength(0);
  });

  it("currentContext returns most-recent per category", () => {
    const a = disclosure(
      "lc_curr_a",
      LIFE_CONTEXT_TOPICS.travel_load,
      "2026-03-25T10:00:00Z",
      { intensity_band: "light" },
    );
    const b = disclosure(
      "lc_curr_b",
      LIFE_CONTEXT_TOPICS.travel_load,
      "2026-03-25T11:00:00Z",
      { intensity_band: "heavy" },
    );
    const { state } = lifeContextState([a, b], "self");
    expect(state.currentContext.travel_load?.intensity_band).toBe("heavy");
  });
});
