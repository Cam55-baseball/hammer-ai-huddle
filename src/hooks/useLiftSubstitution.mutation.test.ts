import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { WkRx } from "./useWkDailyPrescriptions";
import { swapOrigin } from "@/lib/prescription/swapReceipt";

const mocks = vi.hoisted(() => ({ user: { id: "athlete" } as { id: string } | null,
  from: vi.fn(), mutation: vi.fn(), invalidate: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
vi.mock("@tanstack/react-query", () => ({ useMutation: mocks.mutation,
  useQuery: vi.fn(), useQueryClient: () => ({ invalidateQueries: mocks.invalidate }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import { useLiftSubstitution, type SwapCandidate } from "./useLiftSubstitution";

const rx = { id: "row", plan_date: "2026-10-21", movement_slug: "original", movement_name: "Original",
  substituted_from_slug: null, status: "planned", sets: 4, reps: 5, total_reps: 20,
  duration_seconds: null, distance_feet: null, tempo: "3010", load_pct: 70,
  dosage_unit: "reps", rest_seconds: 180, intensity: "RPE 7", substitution_reason: null,
  slot: "lift", phase: "os_q1", sequence_order: 1, sequence_role: "compound",
  why_payload: { cue: "Original cue" } } as WkRx;
const candidate: SwapCandidate = { slug: "replacement", name: "Replacement", cue: null, dosage_unit: "reps",
  movement_category: "squat", default_sets: 2, default_reps: 8, default_duration_seconds: null,
  default_distance_feet: null, default_total_reps: null, equipment_requirements: [] };

function setup(data: unknown = [{ id: "row", movement_slug: "replacement" }], error: unknown = null) {
  const chain = { update: vi.fn(), eq: vi.fn(), is: vi.fn(), select: vi.fn().mockResolvedValue({ data, error }) };
  chain.update.mockReturnValue(chain); chain.eq.mockReturnValue(chain); chain.is.mockReturnValue(chain);
  mocks.from.mockReturnValue(chain);
  renderHook(() => useLiftSubstitution("2026-10-21"));
  const apply = mocks.mutation.mock.calls[0][0].mutationFn;
  const undo = mocks.mutation.mock.calls[1][0].mutationFn;
  return { chain, apply, undo };
}
beforeEach(() => { vi.clearAllMocks(); mocks.user = { id: "athlete" };
  mocks.mutation.mockImplementation((config) => config); });
describe("actual existing Swap mutation boundary", () => {
  it("writes exact dose and compares self/date/movement/status/receipt before claiming success", async () => {
    const { chain, apply } = setup();
    await apply({ rx, candidate, reason: "equipment_unavailable" });
    const payload = chain.update.mock.calls[0][0];
    expect(payload).toMatchObject({ movement_slug: "replacement", sets: 4, reps: 5, total_reps: 20,
      duration_seconds: null, distance_feet: null, tempo: "3010", load_pct: 70, dosage_unit: "reps" });
    expect(payload.why_payload).not.toHaveProperty("cue");
    expect(payload.why_payload.athlete_substitution).toMatchObject(swapOrigin(rx));
    for (const pair of [["id", "row"], ["user_id", "athlete"], ["plan_date", "2026-10-21"],
      ["movement_slug", "original"], ["status", "planned"], ["why_payload", JSON.stringify(rx.why_payload)]]) {
      expect(chain.eq).toHaveBeenCalledWith(...pair);
    }
  });
  it("chained swap and Undo restore the first identity/name/cue/dose, never current catalog defaults", async () => {
    const { chain, apply, undo } = setup();
    const origin = swapOrigin(rx);
    const second = { ...rx, movement_slug: "second", movement_name: "Second", substituted_from_slug: "original",
      why_payload: { cue: "Second cue", athlete_substitution: { ...origin, to_slug: "second",
        reason: "equipment_unavailable", reason_label: "No equipment", at: "2026-10-21T04:00:00Z" } } };
    await apply({ rx: second, candidate, reason: "equipment_unavailable" });
    expect(chain.update.mock.calls[0][0].why_payload.athlete_substitution).toMatchObject(origin);
    await undo({ rx: second, original: { ...candidate, slug: "original", name: "Catalog renamed", cue: "Catalog changed" } });
    expect(chain.update.mock.calls[1][0]).toMatchObject({ movement_slug: "original", movement_name: "Original",
      ...origin.from_dose, why_payload: { cue: "Original cue" }, substituted_from_slug: null });
  });
  it("refuses a stale or hidden row when no single saved result comes back", async () => {
    const { apply } = setup([]);
    await expect(apply({ rx, candidate, reason: "equipment_unavailable" })).rejects.toThrow(/plan changed/);
  });
  it("a receipt changed concurrently cannot report success", async () => {
    const { chain, apply } = setup([]);
    await expect(apply({ rx, candidate, reason: "equipment_unavailable" })).rejects.toThrow();
    expect(chain.eq).toHaveBeenCalledWith("why_payload", JSON.stringify(rx.why_payload));
  });
  it("compares all eight dose fields so a concurrent 4-to-3-set edit cannot be overwritten", async () => {
    const { chain, apply } = setup([]);
    await expect(apply({ rx, candidate, reason: "equipment_unavailable" })).rejects.toThrow(/plan changed/);
    for (const [field, value] of Object.entries({ sets: 4, reps: 5, total_reps: 20,
      tempo: "3010", load_pct: 70, dosage_unit: "reps" })) expect(chain.eq).toHaveBeenCalledWith(field, value);
    for (const field of ["duration_seconds", "distance_feet"]) expect(chain.is).toHaveBeenCalledWith(field, null);
  });
  it("guards 180-second rest, intensity, slot and sequence without rewriting their values", async () => {
    const { chain, apply } = setup();
    await apply({ rx, candidate, reason: "equipment_unavailable" });
    for (const [field, value] of Object.entries({ rest_seconds: 180, intensity: "RPE 7", slot: "lift",
      phase: "os_q1", sequence_order: 1, sequence_role: "compound", movement_name: "Original" })) {
      expect(chain.eq).toHaveBeenCalledWith(field, value);
      if (field !== "movement_name") expect(chain.update.mock.calls[0][0]).not.toHaveProperty(field);
    }
    expect(chain.is).toHaveBeenCalledWith("substituted_from_slug", null);
    expect(chain.is).toHaveBeenCalledWith("substitution_reason", null);
  });
  it("Undo also refuses concurrent dose/rest edits and compares the currently displayed replacement", async () => {
    const origin = swapOrigin(rx);
    const second = { ...rx, movement_slug: "replacement", substituted_from_slug: "original",
      why_payload: { athlete_substitution: origin } };
    const { chain, undo } = setup([]);
    await expect(undo({ rx: second, original: { ...candidate, slug: "original" } })).rejects.toThrow(/plan changed/);
    expect(chain.eq).toHaveBeenCalledWith("sets", 4);
    expect(chain.eq).toHaveBeenCalledWith("rest_seconds", 180);
    expect(chain.eq).toHaveBeenCalledWith("substituted_from_slug", "original");
  });
  it("rejects a different day's plan before an apply or Undo write", async () => {
    const { chain, apply, undo } = setup();
    const other = { ...rx, plan_date: "2026-10-20" };
    await expect(apply({ rx: other, candidate, reason: "equipment_unavailable" })).rejects.toThrow(/different day's/);
    await expect(undo({ rx: other, original: candidate })).rejects.toThrow(/different day's/);
    expect(chain.update).not.toHaveBeenCalled();
  });
  it("missing or non-finite recorded dose fails before either write", async () => {
    const { chain, apply, undo } = setup();
    for (const sets of [undefined, Number.NaN]) {
      await expect(apply({ rx: { ...rx, sets }, candidate, reason: "equipment_unavailable" })).rejects.toThrow(/dose is incomplete/);
      await expect(undo({ rx: { ...rx, sets }, original: candidate })).rejects.toThrow(/dose is incomplete/);
    }
    expect(chain.update).not.toHaveBeenCalled();
  });
  it("does not write marked work or another signed-out account", async () => {
    const { apply, undo } = setup();
    await expect(apply({ rx: { ...rx, status: "completed" }, candidate, reason: "equipment_unavailable" })).rejects.toThrow(/already been marked/);
    await expect(undo({ rx: { ...rx, status: "skipped" }, original: candidate })).rejects.toThrow(/already been marked/);
    mocks.user = null; mocks.mutation.mockClear();
    const signedOut = setup();
    await expect(signedOut.apply({ rx, candidate, reason: "equipment_unavailable" })).rejects.toThrow(/Sign in/);
    expect(chainUpdateCalls(signedOut.chain)).toBe(0);
  });
});
function chainUpdateCalls(chain: { update: ReturnType<typeof vi.fn> }) { return chain.update.mock.calls.length; }