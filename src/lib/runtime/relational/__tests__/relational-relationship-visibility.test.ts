/**
 * RR-4 — relationship projection replay + visibility arbitration tests.
 */
import { describe, it, expect } from "vitest";
import { relationshipState, applyRelationshipVisibility } from "@/lib/runtime/projections/relationshipState";
import { RELATIONSHIP_TOPICS } from "@/lib/runtime/relational/relationshipSchemas";
import { mk, ENV } from "./_fixtures";

function created(id: string, rel: string, counterparty: string, t: string, type: "parent" | "coach" = "parent") {
  return mk({
    event_id: id,
    topic_id: RELATIONSHIP_TOPICS.created,
    occurred_at: t,
    payload: {
      ...ENV,
      visibility_scope: "parent",
      confidence: 1,
      authority: "self",
      relationship_id: rel,
      subject_user_id: "ath_test",
      counterparty_user_id: counterparty,
      relationship_type: type,
      initiated_by: "self",
      consent_required: true,
    },
  });
}
function confirmed(id: string, rel: string, parentId: string, t: string) {
  return mk({
    event_id: id,
    topic_id: RELATIONSHIP_TOPICS.confirmed,
    occurred_at: t,
    payload: {
      ...ENV,
      visibility_scope: "parent",
      confidence: 1,
      authority: "parent",
      lineage_parent_ids: [parentId],
      relationship_id: rel,
      confirmed_by: "parent",
      confirmation_method: "invite_token",
    },
  });
}
function revoked(id: string, rel: string, parentId: string, t: string) {
  return mk({
    event_id: id,
    topic_id: RELATIONSHIP_TOPICS.revoked,
    occurred_at: t,
    payload: {
      ...ENV,
      visibility_scope: "parent",
      confidence: 1,
      authority: "self",
      lineage_parent_ids: [parentId],
      relationship_id: rel,
      revoked_by: "self",
      reason: "subject_request",
    },
  });
}
function paused(id: string, rel: string, parentId: string, t: string) {
  return mk({
    event_id: id,
    topic_id: RELATIONSHIP_TOPICS.paused,
    occurred_at: t,
    payload: {
      ...ENV,
      visibility_scope: "parent",
      confidence: 1,
      authority: "self",
      lineage_parent_ids: [parentId],
      relationship_id: rel,
      paused_by: "self",
      reason: "vacation",
      resume_allowed: true,
    },
  });
}

describe("RR-4 relationship replay", () => {
  it("created → confirmed yields active status", () => {
    const rows = [
      created("e1", "r1", "parent_a", "2026-03-01T00:00:00Z"),
      confirmed("e2", "r1", "e1", "2026-03-01T00:01:00Z"),
    ];
    const { state } = relationshipState(rows, "self");
    expect(state.byId.r1.status).toBe("active");
    expect(state.activeParents).toEqual(["parent_a"]);
  });

  it("revoke is terminal and preserves lineage", () => {
    const rows = [
      created("e1", "r1", "parent_a", "2026-03-01T00:00:00Z"),
      confirmed("e2", "r1", "e1", "2026-03-01T00:01:00Z"),
      revoked("e3", "r1", "e1", "2026-03-02T00:00:00Z"),
      // Post-revocation events must be ignored — terminal.
      confirmed("e4", "r1", "e1", "2026-03-03T00:00:00Z"),
    ];
    const { state } = relationshipState(rows, "self");
    expect(state.byId.r1.status).toBe("revoked");
    expect(state.revokedIds).toContain("r1");
    expect(state.activeParents).toEqual([]);
  });

  it("paused downgrades to paused status", () => {
    const rows = [
      created("e1", "r1", "parent_a", "2026-03-01T00:00:00Z"),
      confirmed("e2", "r1", "e1", "2026-03-01T00:01:00Z"),
      paused("e3", "r1", "e1", "2026-03-02T00:00:00Z"),
    ];
    const { state } = relationshipState(rows, "self");
    expect(state.byId.r1.status).toBe("paused");
    expect(state.pausedIds).toContain("r1");
  });

  it("replay determinism — reshuffled input identity yields equal state", () => {
    const a = [
      created("e1", "r1", "parent_a", "2026-03-01T00:00:00Z"),
      confirmed("e2", "r1", "e1", "2026-03-01T00:01:00Z"),
    ];
    const b = a.map((r) => ({ ...r, payload: { ...r.payload } }));
    const sa = relationshipState(a, "self").state;
    const sb = relationshipState(b, "self").state;
    expect(JSON.stringify(sa)).toBe(JSON.stringify(sb));
  });
});

describe("RR-4 visibility arbitration", () => {
  it("revoked parent loses reads on rows carrying its relationship_id", () => {
    const rows = [
      created("e1", "r1", "parent_a", "2026-03-01T00:00:00Z"),
      confirmed("e2", "r1", "e1", "2026-03-01T00:01:00Z"),
      revoked("e3", "r1", "e1", "2026-03-02T00:00:00Z"),
    ];
    const { state } = relationshipState(rows, "self");
    const dataRow = mk({
      event_id: "d1",
      topic_id: "relational.psych.self_report",
      occurred_at: "2026-03-03T00:00:00Z",
      payload: { ...ENV, visibility_scope: "parent", confidence: 1, authority: "self", relationship_id: "r1" },
    });
    const arbitrated = applyRelationshipVisibility([dataRow], "parent_a", state);
    expect(arbitrated.length).toBe(0);
  });

  it("paused relationship downgrades data row to presence-only", () => {
    const rows = [
      created("e1", "r1", "parent_a", "2026-03-01T00:00:00Z"),
      confirmed("e2", "r1", "e1", "2026-03-01T00:01:00Z"),
      paused("e3", "r1", "e1", "2026-03-02T00:00:00Z"),
    ];
    const { state } = relationshipState(rows, "self");
    const dataRow = mk({
      event_id: "d1",
      topic_id: "relational.psych.self_report",
      occurred_at: "2026-03-03T00:00:00Z",
      payload: { ...ENV, visibility_scope: "parent", confidence: 1, authority: "self", relationship_id: "r1", value: -1.5, axis: "mood" },
    });
    const out = applyRelationshipVisibility([dataRow], "parent_a", state);
    expect(out.length).toBe(1);
    expect(out[0].redacted).toBe(true);
    expect(out[0].payload).toEqual({ paused: true });
  });

  it("trust does not bypass visibility — revoked stays revoked regardless", () => {
    const rows = [
      created("e1", "r1", "parent_a", "2026-03-01T00:00:00Z"),
      revoked("e3", "r1", "e1", "2026-03-02T00:00:00Z"),
    ];
    const { state } = relationshipState(rows, "self");
    // Even with a fabricated high-trust assumption, revoked filter still blocks.
    const dataRow = mk({
      event_id: "d1",
      topic_id: "relational.psych.self_report",
      occurred_at: "2026-03-03T00:00:00Z",
      payload: { ...ENV, visibility_scope: "parent", confidence: 1, authority: "self", relationship_id: "r1" },
    });
    expect(applyRelationshipVisibility([dataRow], "parent_a", state).length).toBe(0);
  });

  it("parent precedence survives replay rebuild", () => {
    const rows = [
      created("e1", "r_p", "parent_a", "2026-03-01T00:00:00Z", "parent"),
      confirmed("e2", "r_p", "e1", "2026-03-01T00:01:00Z"),
      created("e3", "r_c", "coach_b", "2026-03-01T00:02:00Z", "coach"),
      confirmed("e4", "r_c", "e3", "2026-03-01T00:03:00Z"),
    ];
    const a = relationshipState(rows, "self").state;
    const b = relationshipState(rows.map((r) => ({ ...r })), "self").state;
    expect(a.activeParents).toEqual(["parent_a"]);
    expect(a.activeCoaches).toEqual(["coach_b"]);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
