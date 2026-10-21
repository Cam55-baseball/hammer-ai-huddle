import { describe, expect, it, vi } from "vitest";
import { commitAtomicSwap, type AtomicSwapResult, type AtomicSwapSnapshot } from "./atomicSwap";
import { answerSwapConversation, startSwapConversation } from "./swapConversation";

const rx: AtomicSwapSnapshot = { id: "rx", user_id: "athlete", plan_date: "2026-10-21", movement_slug: "machine",
  slot: "hitting", phase: "os_q1", sequence_order: 1, sequence_role: "skill", cns_cost: 1, cns_clamped: false,
  density_target_seconds: null, intensity_mode: null, rir_low: null, rir_high: null, intent_tag: "timing",
  execution_note: null, per_side: null, open_ended: null, set_range_max: null, adaptation: null,
  asymmetry_rule: null, engine: null, generator_version: null, rationale: null, cue_ids: null,
  validator_report: null, why_v2: null, why_payload: { rest_seconds: 30 },
  updated_at: "2026-10-21T05:00:00Z", status: "planned", sets: 3, reps: 10, total_reps: 30,
  dosage_unit: "reps", duration_seconds: null, distance_feet: null, tempo: null, load_pct: null };
function draft(scope: "today" | "always" = "today") {
  let value = startSwapConversation("athlete", "rx", "2026-10-21");
  value = answerSwapConversation(value, { step: "missing", items: ["pitching_machine"] });
  value = answerSwapConversation(value, { step: "available", items: ["partner", "screen", "ball", "net"] });
  return answerSwapConversation(value, { step: "scope", scope });
}
const result: AtomicSwapResult = { state: "saved", requestId: "op", row: { ...rx, movement_slug: "flips", updated_at: "2026-10-21T05:01:00Z" },
  memorySaved: true, reason: "Partner flips keep the same timing work and 30 swings." };
describe("staged single-transaction Swap adapter", () => {
  it("sends all 30 reps, exact version and confirmed answers in one transaction", async () => {
    const transport = vi.fn().mockResolvedValue(result);
    expect(await commitAtomicSwap(draft("always"), rx, "flips", "op", transport)).toEqual(result);
    expect(transport).toHaveBeenCalledTimes(1);
    expect(transport.mock.calls[0][0]).toMatchObject({ expected: rx, memoryScope: "always", requestId: "op",
      availability: { confirmed: true, lacks: ["pitching_machine"], have: ["partner", "screen", "ball", "net"] } });
  });
  it("refusal, missing endpoint and timeout never call a second or legacy save", async () => {
    for (const fail of [false, true]) {
      const transport = fail ? vi.fn().mockRejectedValue(new Error("Endpoint unavailable")) : vi.fn().mockResolvedValue({ ...result, state: "refused" });
      await expect(commitAtomicSwap(draft(), rx, "flips", "op", transport)).rejects.toThrow();
      expect(transport).toHaveBeenCalledTimes(1);
    }
  });
  it("requires confirmed prescription AND memory, same operation, owner, day and reason", async () => {
    for (const patch of [{ memorySaved: false }, { requestId: "old" }, { reason: "" }, { row: null },
      { row: { ...rx, movement_slug: "flips", user_id: "other" } },
      { row: { ...rx, movement_slug: "flips", plan_date: "2026-10-20" } }]) {
      await expect(commitAtomicSwap(draft(), rx, "flips", "op", vi.fn().mockResolvedValue({ ...result, ...patch }))).rejects.toThrow();
    }
  });
  it("rejects changed work in each of the eight returned dose fields", async () => {
    for (const patch of [{ sets: 4 }, { reps: 11 }, { total_reps: 33 }, { duration_seconds: 60 },
      { distance_feet: 90 }, { dosage_unit: "seconds" }, { tempo: "3010" }, { load_pct: 65 }]) {
      await expect(commitAtomicSwap(draft(), rx, "flips", "op", vi.fn().mockResolvedValue({ ...result,
        row: { ...result.row, ...patch } }))).rejects.toThrow(/changed the work/);
    }
  });
  it("marked work and an unfinished or foreign visit fail before transport", async () => {
    const transport = vi.fn();
    for (const value of [{ ...rx, status: "completed" }, { ...rx, user_id: "other" }]) {
      await expect(commitAtomicSwap(draft(), value, "flips", "op", transport)).rejects.toThrow();
    }
    await expect(commitAtomicSwap(startSwapConversation("athlete", "rx", "2026-10-21"), rx, "flips", "op", transport)).rejects.toThrow();
    expect(transport).not.toHaveBeenCalled();
  });
  it("refuses unchanged, older or malformed response versions even with otherwise matching work", async () => {
    for (const updated_at of [rx.updated_at, "2026-10-20T05:00:00Z", "not-a-date"]) {
      await expect(commitAtomicSwap(draft(), rx, "flips", "op", vi.fn().mockResolvedValue({ ...result,
        row: { ...result.row, updated_at } }))).rejects.toThrow(/confirm/);
    }
  });
  it("missing saved context fails before any write, and returned rest cannot change from 30 seconds", async () => {
    const incomplete = { ...rx }; delete (incomplete as Partial<AtomicSwapSnapshot>).phase;
    const transport = vi.fn().mockResolvedValue(result);
    await expect(commitAtomicSwap(draft(), incomplete, "flips", "op", transport)).rejects.toThrow(/incomplete/);
    expect(transport).not.toHaveBeenCalled();
    await expect(commitAtomicSwap(draft(), rx, "flips", "op", vi.fn().mockResolvedValue({ ...result,
      row: { ...result.row, why_payload: { rest_seconds: 5 } } }))).rejects.toThrow(/changed the work/);
  });
  it("transport mutation cannot rewrite the private expected dose to validate changed work", async () => {
    const transport = vi.fn().mockImplementation(request => {
      request.expected.total_reps = 33;
      return Promise.resolve({ ...result, row: { ...result.row, total_reps: 33 } });
    });
    await expect(commitAtomicSwap(draft(), rx, "flips", "op", transport)).rejects.toThrow(/changed the work/);
    expect(rx.total_reps).toBe(30);
  });
});