/**
 * Phase D — safeguarding delivery dedupe + replay parity.
 */
import { describe, it, expect } from "vitest";
import { projectDeliveries } from "@/lib/runtime/relational/safeguardingDelivery";
import { mk, ENV } from "./_fixtures";

function psychLow(eventId: string, occurred: string) {
  return mk({
    event_id: eventId,
    topic_id: "relational.psych.self_report",
    occurred_at: occurred,
    payload: { ...ENV, visibility_scope: "self", confidence: 1, authority: "self", axis: "mood", value: -2 },
  });
}

describe("Phase D — projectDeliveries", () => {
  it("dedupes by (source_event_id, route)", () => {
    const rows = [
      psychLow("pd1", "2026-03-01T00:00:00Z"),
      psychLow("pd1", "2026-03-01T00:00:00Z"),
      psychLow("pd2", "2026-03-02T00:00:00Z"),
    ];
    const out = projectDeliveries(rows, { is_minor: true });
    expect(out).toHaveLength(2);
    expect(out.map((d) => d.classification.source_event_id)).toEqual(["pd1", "pd2"]);
  });

  it("replay parity — same row prefix produces identical decisions", () => {
    const rows = [
      psychLow("pr1", "2026-03-01T00:00:00Z"),
      psychLow("pr2", "2026-03-02T00:00:00Z"),
    ];
    const a = projectDeliveries(rows, { is_minor: true });
    const b = projectDeliveries([...rows], { is_minor: true });
    expect(a).toEqual(b);
  });

  it("noop events are excluded", () => {
    const benign = mk({
      event_id: "pb1",
      topic_id: "relational.conversation.turn",
      occurred_at: "2026-03-01T00:00:00Z",
      payload: { ...ENV, visibility_scope: "self", confidence: 1, authority: "self", thread_id: "t1" },
    });
    expect(projectDeliveries([benign], { is_minor: false })).toEqual([]);
  });
});
