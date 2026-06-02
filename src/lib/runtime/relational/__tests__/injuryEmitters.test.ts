/**
 * RR-6 Wave 1 — injury emitter constitutional checks.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/asb/emit", () => ({
  emitAsbEvent: vi.fn().mockResolvedValue({ ok: true, event_id: "x" }),
  emitAsbLineage: vi.fn().mockResolvedValue(undefined),
}));

import {
  emitInjuryReported,
  emitRtpAuthorized,
  InjuryEmissionError,
} from "@/lib/runtime/relational/injuryEmitters";

const baseCtx = {
  athleteId: "ath_inj",
  actorId: "u_inj",
  actorRole: "athlete" as const,
  occurredAt: "2026-04-01T10:00:00Z",
};

const basePayload = {
  visibility_scope: "self" as const,
  authority: "self" as const,
  confidence: null,
  missingness: { fields: [] as string[], reason: "not_observed" as const },
  lineage_parent_ids: [] as string[],
  body_region: "shoulder",
  severity_band: "light" as const,
  participation_status: "modified" as const,
  reported_symptoms: ["soreness" as const],
};

const rtpPayload = {
  visibility_scope: "self" as const,
  authority: "parent" as const,
  confidence: null,
  missingness: { fields: [] as string[], reason: "not_observed" as const },
  lineage_parent_ids: [] as string[],
  body_region: "shoulder",
  authorizes_event_id: "is_rep_1",
  participation_status: "full" as const,
};

describe("emitInjuryReported — RR-6 gate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("emits a clean athlete-authored observation", async () => {
    const id = await emitInjuryReported(baseCtx, basePayload as never, {
      safeguardingLockdown: false,
      isMinor: false,
    });
    expect(typeof id).toBe("string");
  });

  it("blocks ai actor (RR-6 invariant 8)", async () => {
    await expect(
      emitInjuryReported(
        { ...baseCtx, actorRole: "ai" as never },
        basePayload as never,
        { safeguardingLockdown: false, isMinor: false },
      ),
    ).rejects.toBeInstanceOf(InjuryEmissionError);
  });

  it("blocks coach actor (RR-6 invariant 4)", async () => {
    await expect(
      emitInjuryReported(
        { ...baseCtx, actorRole: "coach" as never },
        basePayload as never,
        { safeguardingLockdown: false, isMinor: false },
      ),
    ).rejects.toBeInstanceOf(InjuryEmissionError);
  });

  it("rejects diagnostic denylist tokens in recovery_focus", async () => {
    await expect(
      emitInjuryReported(
        baseCtx,
        { ...basePayload, recovery_focus: "diagnosed tendinitis" } as never,
        { safeguardingLockdown: false, isMinor: false },
      ),
    ).rejects.toBeInstanceOf(InjuryEmissionError);
  });

  it("safeguarding lockdown reroutes visibility to parent + flags category", async () => {
    const { emitAsbEvent } = await import("@/lib/asb/emit");
    await emitInjuryReported(baseCtx, basePayload as never, {
      safeguardingLockdown: true,
      isMinor: false,
    });
    const call = (
      emitAsbEvent as unknown as { mock: { calls: unknown[][] } }
    ).mock.calls[0]?.[0] as {
      payload: { visibility_scope: string; safeguarding_category: boolean };
    };
    expect(call.payload.visibility_scope).toBe("parent");
    expect(call.payload.safeguarding_category).toBe(true);
  });

  it("coach cannot authorize RTP (RR-6 invariant 5)", async () => {
    await expect(
      emitRtpAuthorized(
        { ...baseCtx, actorRole: "coach" as never },
        rtpPayload as never,
        { safeguardingLockdown: false, isMinor: false },
      ),
    ).rejects.toBeInstanceOf(InjuryEmissionError);
  });

  it("parent can authorize RTP", async () => {
    const id = await emitRtpAuthorized(
      { ...baseCtx, actorRole: "parent" },
      rtpPayload as never,
      { safeguardingLockdown: false, isMinor: false },
    );
    expect(typeof id).toBe("string");
  });
});
