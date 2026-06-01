/**
 * RR-4 — parent invite token round-trip + safeguarding classifier tests.
 */
import { describe, it, expect } from "vitest";
import {
  encodeInviteToken,
  decodeInviteToken,
} from "@/lib/runtime/relational/parentLinking";
import { classifySafeguardingSignal } from "@/lib/runtime/relational/safeguardingRoute";
import { mk, ENV } from "./_fixtures";

describe("parent invite token", () => {
  it("encode → decode is lossless", () => {
    const t = {
      relationship_id: "rel-1",
      athlete_id: "ath-1",
      issued_at: "2026-03-01T00:00:00.000Z",
    };
    const enc = encodeInviteToken(t);
    expect(decodeInviteToken(enc)).toEqual(t);
  });

  it("invalid tokens decode to null", () => {
    expect(decodeInviteToken("not-a-token")).toBe(null);
    expect(decodeInviteToken("")).toBe(null);
  });
});

describe("safeguarding route classifier", () => {
  function row(topic: string, payload: Record<string, unknown>) {
    return mk({
      event_id: "e1",
      topic_id: topic,
      occurred_at: "2026-03-01T00:00:00Z",
      payload: { ...ENV, visibility_scope: "self", confidence: 1, authority: "self", ...payload },
    });
  }

  it("low psych value for minor routes to notify_parent", () => {
    const r = row("relational.psych.self_report", { axis: "mood", value: -2 });
    const c = classifySafeguardingSignal(r, { is_minor: true });
    expect(c.route).toBe("notify_parent");
    expect(c.reasons).toContain("psych_self_report_low_value");
  });

  it("low psych value for adult routes to arbitration_required", () => {
    const r = row("relational.psych.self_report", { axis: "mood", value: -2 });
    expect(classifySafeguardingSignal(r, { is_minor: false }).route).toBe("arbitration_required");
  });

  it("commercial scope on minor routes to lockdown_commercial", () => {
    const r = row("relational.exposure.observed", { visibility_scope: "external" });
    expect(classifySafeguardingSignal(r, { is_minor: true }).route).toBe("lockdown_commercial");
  });

  it("explicit flag + psych crisis routes to arbitration_required", () => {
    const r = row("relational.psych.self_report", { axis: "mood", value: -2, safeguarding_category: true });
    expect(classifySafeguardingSignal(r, { is_minor: true }).route).toBe("arbitration_required");
  });

  it("benign event routes to none", () => {
    const r = row("relational.conversation.turn", { thread_id: "t1" });
    expect(classifySafeguardingSignal(r, { is_minor: false }).route).toBe("none");
  });
});
