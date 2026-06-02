/**
 * RR-8 Wave 1B — life-context visibility matrix completion test.
 *
 * Event IDs namespaced (`lcv*`) + 2026-02-* dates to avoid projection
 * memoization-cache collisions with sibling test fixtures.
 */
import { describe, it, expect } from "vitest";
import { lifeContextState } from "@/lib/runtime/projections/lifeContextState";
import { LIFE_CONTEXT_TOPICS } from "@/lib/runtime/relational/lifeContextSchemas";
import { mk, ENV } from "./_fixtures";

function disc(
  eventId: string,
  topic: string,
  occurredAt: string,
  over: Record<string, unknown> = {},
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

function revocation(
  eventId: string,
  occurredAt: string,
  revokes: string,
  visibility: "self" | "coach" | "parent" = "self",
  authority: "self" | "parent" = "self",
) {
  return mk({
    event_id: eventId,
    topic_id: LIFE_CONTEXT_TOPICS.disclosure_revocation,
    occurred_at: occurredAt,
    payload: {
      ...ENV,
      authority,
      visibility_scope: visibility,
      confidence: null,
      revokes_event_id: revokes,
    },
  });
}

describe("life-context visibility matrix — RR-8 Wave 1B", () => {
  it("1. self scope sees self-authored life-context rows", () => {
    const d = disc("lcv1_a", LIFE_CONTEXT_TOPICS.academic_load, "2026-02-01T10:00:00Z");
    const { state, meta } = lifeContextState([d], "self");
    expect(meta.sourceCount).toBe(1);
    expect(state.continuityTimeline).toHaveLength(1);
  });

  it("2. demo scope never sees self-authored rows", () => {
    const d = disc("lcv2_a", LIFE_CONTEXT_TOPICS.academic_load, "2026-02-02T10:00:00Z", {
      visibility_scope: "self",
    });
    const { state, meta } = lifeContextState([d], "demo");
    expect(meta.sourceCount).toBe(0);
    expect(state.continuityTimeline).toHaveLength(0);
  });

  it("3. self scope never sees demo-authored rows (bidirectional firewall)", () => {
    const d = disc("lcv3_a", LIFE_CONTEXT_TOPICS.academic_load, "2026-02-03T10:00:00Z", {
      visibility_scope: "demo",
    });
    const { state, meta } = lifeContextState([d], "self");
    expect(meta.sourceCount).toBe(0);
    expect(state.continuityTimeline).toHaveLength(0);
  });

  it("4. recruiter-equivalent (external) scope sees no self-authored rows", () => {
    const rows = [
      disc("lcv4_a", LIFE_CONTEXT_TOPICS.academic_load, "2026-02-04T10:00:00Z", {
        visibility_scope: "self",
      }),
      disc("lcv4_b", LIFE_CONTEXT_TOPICS.sleep_disruption, "2026-02-04T11:00:00Z", {
        visibility_scope: "self",
      }),
    ];
    const { state } = lifeContextState(rows, "external");
    expect(state.continuityTimeline).toHaveLength(0);
  });

  it("5. safeguarding-only rows excluded from coach scope (routed parent-only)", () => {
    const d = disc("lcv5_a", LIFE_CONTEXT_TOPICS.family_context, "2026-02-05T10:00:00Z", {
      visibility_scope: "parent",
      authority: "parent",
      safeguarding_category: true,
    });
    const coachView = lifeContextState([d], "coach").state;
    expect(coachView.safeguardingHeld).toBe(false);
    expect(coachView.continuityTimeline).toHaveLength(0);
    const parentView = lifeContextState([d], "parent").state;
    expect(parentView.safeguardingHeld).toBe(true);
    expect(parentView.continuityTimeline).toHaveLength(1);
  });

  it("6. revoked life-context event removed on replay rebuild", () => {
    const d = disc("lcv6_a", LIFE_CONTEXT_TOPICS.travel_load, "2026-02-06T10:00:00Z");
    const r = revocation("lcv6_b", "2026-02-06T11:00:00Z", "lcv6_a");
    const before = lifeContextState([d], "self").state;
    expect(before.continuityTimeline).toHaveLength(1);
    const after = lifeContextState([d, r], "self").state;
    expect(after.continuityTimeline).toHaveLength(0);
    expect(after.revokedEventIds).toContain("lcv6_a");
  });

  it("7. paused relationship — revoked coach-scoped disclosure downgrades", () => {
    const d = disc("lcv7_a", LIFE_CONTEXT_TOPICS.schedule_stress, "2026-02-07T10:00:00Z", {
      visibility_scope: "coach",
    });
    const r = revocation("lcv7_b", "2026-02-07T11:00:00Z", "lcv7_a", "coach");
    const coachBefore = lifeContextState([d], "coach").state;
    expect(coachBefore.continuityTimeline).toHaveLength(1);
    const coachAfter = lifeContextState([d, r], "coach").state;
    expect(coachAfter.continuityTimeline).toHaveLength(0);
    expect(coachAfter.revokedEventIds).toContain("lcv7_a");
  });

  it("8. parent supremacy — parent-authored row visible to parent; self stays self-only", () => {
    const selfRow = disc("lcv8_a", LIFE_CONTEXT_TOPICS.academic_load, "2026-02-08T10:00:00Z");
    const parentRow = disc("lcv8_b", LIFE_CONTEXT_TOPICS.family_context, "2026-02-08T11:00:00Z", {
      visibility_scope: "parent",
      authority: "parent",
    });
    const parentView = lifeContextState([selfRow, parentRow], "parent").state;
    const parentIds = parentView.continuityTimeline.map((n) => n.event_id);
    expect(parentIds).not.toContain("lcv8_a");
    expect(parentIds).toContain("lcv8_b");
    const selfView = lifeContextState([selfRow, parentRow], "self").state;
    expect(selfView.continuityTimeline.map((n) => n.event_id)).toContain("lcv8_a");
  });
});
