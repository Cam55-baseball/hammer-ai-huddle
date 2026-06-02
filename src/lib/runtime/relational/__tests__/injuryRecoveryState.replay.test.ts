/**
 * RR-6 Wave 1 — injuryRecoveryState replay + determinism tests.
 *
 * Per Wave 1C convention: per-test event_id prefixes (`ir_*`) + disjoint
 * occurred_at bands to keep the module-scope memoize cache disjoint.
 */
import { describe, it, expect } from "vitest";
import { injuryRecoveryState } from "@/lib/runtime/projections/injuryRecoveryState";
import { INJURY_TOPICS } from "@/lib/runtime/relational/injurySchemas";
import { mk, ENV } from "./_fixtures";

function obs(
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
      body_region: "shoulder",
      severity_band: "light",
      participation_status: "modified",
      reported_symptoms: ["soreness"],
      ...over,
    },
  });
}

describe("injuryRecoveryState — RR-6 Wave 1 replay invariants", () => {
  it("rebuilds deterministically regardless of input order", () => {
    const a = obs("ir_det_a", INJURY_TOPICS.reported, "2026-05-01T10:00:00Z");
    const b = obs("ir_det_b", INJURY_TOPICS.updated, "2026-05-01T11:00:00Z", {
      updates_event_id: "ir_det_a",
      severity_band: "moderate",
    });
    const r1 = injuryRecoveryState([a, b], "self").state;
    const r2 = injuryRecoveryState([b, a], "self").state;
    expect(r1).toEqual(r2);
  });

  it("idempotent on duplicate ids", () => {
    const a = obs("ir_dup_a", INJURY_TOPICS.reported, "2026-05-05T10:00:00Z");
    const r1 = injuryRecoveryState([a], "self").state;
    const r2 = injuryRecoveryState([a, a], "self").state;
    expect(r1).toEqual(r2);
  });

  it("revocation removes downstream visibility on rebuild (invariant 10)", () => {
    const d = obs("ir_rev_a", INJURY_TOPICS.reported, "2026-05-10T10:00:00Z");
    const rev = mk({
      event_id: "ir_rev_b",
      topic_id: INJURY_TOPICS.visibility_revoked,
      occurred_at: "2026-05-10T11:00:00Z",
      payload: {
        ...ENV,
        authority: "self",
        visibility_scope: "self",
        confidence: null,
        revokes_event_id: "ir_rev_a",
      },
    });
    const before = injuryRecoveryState([d], "self").state;
    expect(before.visibleRecoveryTimeline).toHaveLength(1);
    const after = injuryRecoveryState([d, rev], "self").state;
    expect(after.visibleRecoveryTimeline).toHaveLength(0);
    expect(after.revokedEventIds).toContain("ir_rev_a");
  });

  it("demo firewall — self scope never reads demo rows", () => {
    const d = obs("ir_demo_a", INJURY_TOPICS.reported, "2026-05-15T10:00:00Z", {
      visibility_scope: "demo",
    });
    const { state, meta } = injuryRecoveryState([d], "self");
    expect(meta.sourceCount).toBe(0);
    expect(state.visibleRecoveryTimeline).toHaveLength(0);
  });

  it("safeguarding_category flips safeguardingHeld (invariant 9)", () => {
    const d = obs("ir_safe_a", INJURY_TOPICS.reported, "2026-05-20T10:00:00Z", {
      visibility_scope: "parent",
      authority: "parent",
      safeguarding_category: true,
    });
    const parent = injuryRecoveryState([d], "parent").state;
    expect(parent.safeguardingHeld).toBe(true);
    const coach = injuryRecoveryState([d], "coach").state;
    expect(coach.visibleRecoveryTimeline).toHaveLength(0);
  });

  it("rtp_authorized only flips rtp_authorized when explicitly emitted (invariant 5)", () => {
    const rep = obs(
      "ir_rtp_a",
      INJURY_TOPICS.reported,
      "2026-05-25T10:00:00Z",
      { participation_status: "limited" },
    );
    const before = injuryRecoveryState([rep], "self").state;
    expect(before.activeRecoveryState["shoulder"]?.rtp_authorized).toBe(false);

    const rtp = mk({
      event_id: "ir_rtp_b",
      topic_id: INJURY_TOPICS.rtp_authorized,
      occurred_at: "2026-05-25T11:00:00Z",
      payload: {
        ...ENV,
        authority: "parent",
        visibility_scope: "self",
        confidence: null,
        body_region: "shoulder",
        authorizes_event_id: "ir_rtp_a",
        participation_status: "full",
      },
    });
    const after = injuryRecoveryState([rep, rtp], "self").state;
    expect(after.activeRecoveryState["shoulder"]?.rtp_authorized).toBe(true);
    expect(after.activeRecoveryState["shoulder"]?.rtp_event_id).toBe("ir_rtp_b");
  });

  it("missingness fields preserved, never imputed (invariant 6)", () => {
    const d = obs("ir_miss_a", INJURY_TOPICS.reported, "2026-05-28T10:00:00Z", {
      missingness: { fields: ["sleep"], reason: "not_observed" },
    });
    const { state } = injuryRecoveryState([d], "self");
    expect(state.missingness.fields).toContain("sleep");
  });
});
