/**
 * RR-6 Wave 1 — injury visibility matrix (firewall + parent supremacy).
 */
import { describe, it, expect } from "vitest";
import { injuryRecoveryState } from "@/lib/runtime/projections/injuryRecoveryState";
import { INJURY_TOPICS } from "@/lib/runtime/relational/injurySchemas";
import { mk, ENV } from "./_fixtures";

function obs(
  eventId: string,
  occurredAt: string,
  over: Record<string, unknown> = {},
) {
  return mk({
    event_id: eventId,
    topic_id: INJURY_TOPICS.reported,
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

describe("injury visibility matrix — RR-6 Wave 1", () => {
  it("self scope sees self-authored row", () => {
    const d = obs("iv_self_a", "2026-06-01T10:00:00Z");
    expect(injuryRecoveryState([d], "self").state.visibleRecoveryTimeline).toHaveLength(1);
  });

  it("parent-scoped row visible only to parent (Wave 1D guard)", () => {
    const d = obs("iv_par_a", "2026-06-02T10:00:00Z", {
      visibility_scope: "parent",
      authority: "parent",
    });
    expect(injuryRecoveryState([d], "self").state.visibleRecoveryTimeline).toHaveLength(0);
    expect(injuryRecoveryState([d], "coach").state.visibleRecoveryTimeline).toHaveLength(0);
    expect(injuryRecoveryState([d], "parent").state.visibleRecoveryTimeline).toHaveLength(1);
  });

  it("external / org scopes never see injury rows", () => {
    const d = obs("iv_ext_a", "2026-06-03T10:00:00Z", { visibility_scope: "self" });
    expect(injuryRecoveryState([d], "external").state.visibleRecoveryTimeline).toHaveLength(0);
    expect(injuryRecoveryState([d], "org").state.visibleRecoveryTimeline).toHaveLength(0);
  });

  it("demo bidirectional firewall", () => {
    const d = obs("iv_demo_a", "2026-06-04T10:00:00Z", { visibility_scope: "demo" });
    expect(injuryRecoveryState([d], "self").state.visibleRecoveryTimeline).toHaveLength(0);
    expect(injuryRecoveryState([d], "demo").state.visibleRecoveryTimeline).toHaveLength(1);
    const nonDemo = obs("iv_demo_b", "2026-06-04T11:00:00Z", { visibility_scope: "self" });
    expect(injuryRecoveryState([nonDemo], "demo").state.visibleRecoveryTimeline).toHaveLength(0);
  });
});
