/**
 * RR-5 — narrative emitter legality tests.
 *
 * Constitutional checks at the emission boundary:
 *   • cite-bound topics require ≥1 lineage_parent_ids
 *   • identity_reflection requires actor_role === 'athlete' and authority === 'self'
 *   • safeguarding lockdown suppresses emission
 *
 * We mock the canonical emit surface to avoid network and assert that
 * forbidden emissions throw BEFORE reaching emitAsbEvent.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/asb/emit", () => ({
  emitAsbEvent: vi.fn(async () => undefined),
  emitAsbLineage: vi.fn(async () => undefined),
}));

import {
  emitMemoryAnchor,
  emitIdentityReflection,
  emitContextRecall,
  emitSlumpMarker,
  NarrativeEmissionError,
} from "@/lib/runtime/relational/narrativeEmitters";
import { emitAsbEvent } from "@/lib/asb/emit";

const ctx = {
  athleteId: "ath_1",
  actorId: "u_1",
  actorRole: "athlete" as const,
  occurredAt: "2026-01-01T10:00:00Z",
};

const baseEnv = {
  visibility_scope: "self" as const,
  authority: "self" as const,
  confidence: 0.5,
  missingness: { fields: [], reason: "not_observed" as const },
};

beforeEach(() => {
  (emitAsbEvent as unknown as ReturnType<typeof vi.fn>).mockClear();
});

describe("narrativeEmitters — RR-5 legality", () => {
  it("rejects memory_anchor without cited antecedents", async () => {
    await expect(
      emitMemoryAnchor(
        ctx,
        {
          ...baseEnv,
          lineage_parent_ids: [],
          anchor_kind: "outing",
          topic_tag: "first bullpen",
        },
        { safeguardingLockdown: false },
      ),
    ).rejects.toThrow();
    expect(emitAsbEvent).not.toHaveBeenCalled();
  });

  it("rejects any narrative emission under safeguarding lockdown", async () => {
    await expect(
      emitMemoryAnchor(
        ctx,
        {
          ...baseEnv,
          lineage_parent_ids: ["c1"],
          anchor_kind: "outing",
          topic_tag: "ok",
        },
        { safeguardingLockdown: true },
      ),
    ).rejects.toBeInstanceOf(NarrativeEmissionError);
    expect(emitAsbEvent).not.toHaveBeenCalled();
  });

  it("rejects identity_reflection from non-athlete actor (RR-5 invariant 7)", async () => {
    await expect(
      emitIdentityReflection(
        { ...ctx, actorRole: "coach" },
        {
          ...baseEnv,
          lineage_parent_ids: [],
          reflection_ref: "h1",
          revokes_event_id: null,
        },
        { safeguardingLockdown: false },
      ),
    ).rejects.toBeInstanceOf(NarrativeEmissionError);
    expect(emitAsbEvent).not.toHaveBeenCalled();
  });

  it("accepts an athlete-authored identity_reflection with no parents", async () => {
    await expect(
      emitIdentityReflection(
        ctx,
        {
          ...baseEnv,
          lineage_parent_ids: [],
          reflection_ref: "h1",
          revokes_event_id: null,
        },
        { safeguardingLockdown: false },
      ),
    ).resolves.toBeTypeOf("string");
    expect(emitAsbEvent).toHaveBeenCalledTimes(1);
  });

  it("accepts a cited slump_marker", async () => {
    await expect(
      emitSlumpMarker(
        ctx,
        {
          ...baseEnv,
          lineage_parent_ids: ["s1", "s2"],
          window_start: "2026-01-01",
          window_end: "2026-01-05",
          pattern_kind: "self_report_decline",
        },
        { safeguardingLockdown: false },
      ),
    ).resolves.toBeTypeOf("string");
  });

  it("accepts a cited context_recall", async () => {
    await expect(
      emitContextRecall(
        ctx,
        {
          ...baseEnv,
          lineage_parent_ids: ["n1"],
          recalled_event_ids: ["n1"],
          surface: "hammer_thread",
        },
        { safeguardingLockdown: false },
      ),
    ).resolves.toBeTypeOf("string");
  });
});
