import { describe, expect, it, vi } from "vitest";
import { loadPrescriptionEnvelope } from "../../../supabase/functions/_shared/coach/loadPrescriptionEnvelope";

const phase = { date: "2026-10-25", season: "off_season", sub_block: "os_q1", lighter_week: null, growth: false };
vi.mock("../../../supabase/functions/_shared/phaseState.ts", () => ({ resolvePhaseState: () => phase }));
vi.mock("../../../supabase/functions/_shared/wic/schedule/tissueCost/shadow/run.ts", () => ({
  fetchShadowData: async () => ({ heights: [], games: [], quizzes: [], dailyLogs: [], prescriptions: [] }),
  decideFromRaw: () => ({ decision: {} }),
}));
vi.mock("../../../supabase/functions/_shared/wic/schedule/tissueCost/apply.ts", () => ({
  applyDecision: () => ({ cnsCap: 100, blockedIntensityClasses: [], removeLift: false }),
}));
vi.mock("../../../supabase/functions/_shared/wic/exposure/ledger.ts", () => ({
  buildLedger: () => [], classify: () => null, computeRm28: () => ({}), wasBuildDay: () => false,
}));
vi.mock("../../../supabase/functions/_shared/wic/schedule/externalTraining.ts", () => ({ mergeExternal: () => ({}) }));
vi.mock("../../../supabase/functions/_shared/wic/phases/u13ThrowGate.ts", () => ({ loadU13ThrowBlock: async () => false }));
vi.mock("../../../supabase/functions/_shared/coach/savedDayCoverage.ts", () => ({ savedDayCoverage: () => true }));
vi.mock("../../../supabase/functions/_shared/coach/prescriptionEnvelope.ts", () => ({
  judgeCoachEnvelope: () => ({ allowed: true, reasons: [], warnings: [] }),
}));

function database(ledger: unknown) {
  const tables: Record<string, unknown> = {
    profiles: { date_of_birth: "2005-08-01", positions: ["OF"] },
    athlete_context: { sport_primary: "baseball", lifting_age_years: 2, injury_history: [] },
    athlete_mpi_settings: {},
    wk_prescriptions: [{ slot: "lift", movement_slug: "test_lift", movement_name: "Test lift", cns_cost: 2, why_payload: { phase_state: phase } }],
    wk_movement_catalog: [{ slug: "test_lift", cns_cost: 2 }],
    wk_cns_ledger: ledger,
  };
  function query(data: unknown): any {
    const q: any = new Proxy({}, { get: (_target, key) => key === "then"
      ? (resolve: (result: unknown) => void) => Promise.resolve({ data, error: null }).then(resolve)
      : () => q });
    return q;
  }
  return { from: (table: string) => query(tables[table] ?? []), rpc: () => query([]) };
}

describe("real coach loader preserves missing facts as warnings", () => {
  it("a missing October 25 check-in permits the warning decision, not a readiness claim", async () => {
    const result = await loadPrescriptionEnvelope(database({ units_cap: 100, units_spent: 2 }), "player", "2026-10-25", "lift", [], false);
    expect(result.allowed).toBe(true);
    if (!("warnings" in result) || !("cnsResult" in result)) throw new Error("Missing facts must return an overridable envelope");
    expect(result.warnings).toContainEqual(expect.objectContaining({ code: "missing_facts", date: "2026-10-25", requires_reason: false }));
    expect(result.cnsResult).toBe(2);
  });
  it("a missing workload limit permits acknowledgement without inventing a ledger total", async () => {
    const result = await loadPrescriptionEnvelope(database(null), "player", "2026-10-25", "lift", [], false);
    expect(result.allowed).toBe(true);
    if (!("warnings" in result) || !("cnsResult" in result)) throw new Error("Missing workload must return an overridable envelope");
    expect(result.warnings?.filter(w => w.code === "missing_facts")).toHaveLength(2);
    expect(result.cnsResult).toBeNull();
    expect(result.warnings?.some(w => w.code === "workload_cap")).toBe(false);
  });
});