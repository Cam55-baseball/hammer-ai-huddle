/**
 * RR-8 — life context emitter constitutional checks.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/asb/emit", () => ({
  emitAsbEvent: vi.fn().mockResolvedValue({ ok: true, event_id: "x" }),
  emitAsbLineage: vi.fn().mockResolvedValue(undefined),
}));

import {
  emitLifeContextDisclosure,
  LifeContextEmissionError,
} from "@/lib/runtime/relational/lifeContextEmitters";

const baseCtx = {
  athleteId: "ath_1",
  actorId: "u_1",
  actorRole: "athlete" as const,
  occurredAt: "2026-01-01T10:00:00Z",
};

const basePayload = {
  visibility_scope: "self" as const,
  authority: "self" as const,
  confidence: null,
  missingness: { fields: [] as string[], reason: "not_observed" as const },
  lineage_parent_ids: [] as string[],
  window_start: "2026-01-01T00:00:00Z",
  window_end: "2026-01-07T00:00:00Z",
  intensity_band: "moderate" as const,
};

describe("emitLifeContextDisclosure — RR-8 gate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("emits a clean athlete-authored disclosure", async () => {
    const id = await emitLifeContextDisclosure(
      baseCtx,
      "travel_load",
      basePayload as never,
      { safeguardingLockdown: false, isMinor: false },
    );
    expect(typeof id).toBe("string");
  });

  it("blocks coach actor (RR-8 invariant 1)", async () => {
    await expect(
      emitLifeContextDisclosure(
        { ...baseCtx, actorRole: "coach" as never },
        "academic_load",
        basePayload as never,
        { safeguardingLockdown: false, isMinor: false },
      ),
    ).rejects.toBeInstanceOf(LifeContextEmissionError);
  });

  it("for minor + coach visibility requires parent authority", async () => {
    await expect(
      emitLifeContextDisclosure(
        baseCtx,
        "schedule_stress",
        { ...basePayload, visibility_scope: "coach" } as never,
        { safeguardingLockdown: false, isMinor: true },
      ),
    ).rejects.toBeInstanceOf(LifeContextEmissionError);
  });

  it("safeguarding lockdown reroutes to parent scope + flags category", async () => {
    const { emitAsbEvent } = await import("@/lib/asb/emit");
    await emitLifeContextDisclosure(
      baseCtx,
      "family_context",
      basePayload as never,
      { safeguardingLockdown: true, isMinor: false },
    );
    const call = (emitAsbEvent as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]?.[0] as {
      payload: { visibility_scope: string; safeguarding_category: boolean };
    };
    expect(call.payload.visibility_scope).toBe("parent");
    expect(call.payload.safeguarding_category).toBe(true);
  });
});
