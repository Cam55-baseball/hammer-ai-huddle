import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { WkRx } from "./useWkDailyPrescriptions";

const mocks = vi.hoisted(() => ({ query: vi.fn(), from: vi.fn(), user: { id: "first" } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
vi.mock("@tanstack/react-query", () => ({ useQuery: mocks.query, useMutation: vi.fn(), useQueryClient: vi.fn() }));
import { useSwapLadder } from "./useLiftSubstitution";

const source = { slug: "source", name: "Source", is_active: true, sport_scope: "both", movement_category: "carry",
  substitution_family: "carry", dosage_unit: "reps", season_legality: { os_q1: true },
  training_age_legality: { beginner: true }, equipment_requirements: ["db"], min_age_years: 13 };
const target = { ...source, slug: "target", name: "Target", equipment_requirements: [] };
const rx = { id: "row", movement_slug: "source", phase: "os_q1", dosage_unit: "reps", why_payload: {
  training_age_context: { classification: "beginner" }, lift_governance: { movement_category: "carry",
    substitution_ladder: { equipment_unavailable: ["target"] } } } } as unknown as WkRx;
function chain(data: unknown, error: unknown = null) {
  const c = { select: vi.fn(), in: vi.fn(), eq: vi.fn(), then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data, error }).then(resolve) };
  c.select.mockReturnValue(c); c.in.mockReturnValue(c); c.eq.mockReturnValue(c); return c;
}
beforeEach(() => { vi.clearAllMocks(); mocks.user = { id: "first" }; mocks.query.mockReturnValue({ isSuccess: true, data: { ladder: {}, options: {} } }); });
describe("existing alternative catalog read", () => {
  it("filters actual ladder query through explicit family, active, age and category checks", async () => {
    mocks.from.mockReturnValue(chain([source, target, { ...target, slug: "inactive", is_active: false },
      { ...target, slug: "other", substitution_family: "unrelated" }]));
    renderHook(() => useSwapLadder(rx, true));
    const value = await mocks.query.mock.calls[0][0].queryFn();
    expect(Object.keys(value.options)).toEqual(["source", "target"]);
  });
  it("missing substitution family does not offer unrelated work with the same category", async () => {
    mocks.from.mockReturnValue(chain([{ ...source, substitution_family: null }, { ...target, substitution_family: null }]));
    renderHook(() => useSwapLadder({ ...rx, why_payload: { ...rx.why_payload,
      lift_governance: { movement_category: "carry", substitution_ladder: {} } } }, true));
    expect(await mocks.query.mock.calls[0][0].queryFn()).toEqual({ ladder: { equipment_unavailable: [],
      facility_unavailable: [], injury_restriction: [], time_restriction: [], coach_override: [] }, options: {} });
  });
  it("missing training-age context gives no alternative instead of approving unknown legality", async () => {
    mocks.from.mockReturnValue(chain([source, target]));
    renderHook(() => useSwapLadder({ ...rx, why_payload: { lift_governance: rx.why_payload.lift_governance } }, true));
    expect((await mocks.query.mock.calls[0][0].queryFn()).options).toEqual({});
  });
  it("failed refetch does not expose cached candidates as currently checked", () => {
    const error = new Error("catalog unavailable");
    mocks.query.mockReturnValue({ isSuccess: false, data: { ladder: { equipment_unavailable: ["target"] },
      options: { target } }, error, isFetched: true });
    const { result } = renderHook(() => useSwapLadder(rx, true));
    expect(result.current.hasOptions).toBe(false);
    expect(result.current.options).toEqual({});
    expect(result.current.error).toBe(error);
  });
  it("catalog errors reach the failure state rather than becoming an empty successful read", async () => {
    const error = new Error("catalog failed"); mocks.from.mockReturnValue(chain(null, error));
    renderHook(() => useSwapLadder(rx, true));
    await expect(mocks.query.mock.calls[0][0].queryFn()).rejects.toBe(error);
  });
  it("account, movement, unit, phase and training age changes never reuse the previous eligibility query", () => {
    const { rerender } = renderHook(({ prescription }) => useSwapLadder(prescription, true), { initialProps: { prescription: rx } });
    const first = mocks.query.mock.lastCall?.[0].queryKey;
    mocks.user = { id: "second" }; rerender({ prescription: rx });
    expect(mocks.query.mock.lastCall?.[0].queryKey).not.toEqual(first);
    const second = mocks.query.mock.lastCall?.[0].queryKey;
    rerender({ prescription: { ...rx, movement_slug: "replacement", phase: "in_season", dosage_unit: "seconds" } });
    expect(mocks.query.mock.lastCall?.[0].queryKey).not.toEqual(second);
  });
});