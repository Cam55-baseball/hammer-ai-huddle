// Release 0b: the ledger-backed read path stays invisible while ledger_unify_v1 is off, swaps in ledger
// numbers only when on, and never blanks a screen when the ledger read fails.
import { describe, it, expect, vi } from "vitest";
import { viaLedger, viaLedgerOne, ledgerUnifyOn, projectable } from "../../../supabase/functions/_shared/ledger/ledgerRead";
import { METRICS, ALIASES } from "../../../supabase/functions/_shared/ledger/metricDictionary";

const rows = [{ id: "a", user_id: "u1", inches: 70, measured_on: "2026-10-01" }];

function dbWith(rpcImpl: (...a: unknown[]) => unknown, switchRow: unknown = null) {
  const rpc = vi.fn(rpcImpl);
  const maybeSingle = vi.fn(async () => ({ data: switchRow, error: null }));
  const from = vi.fn(() => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }));
  return { db: { from, rpc }, rpc, from };
}

describe("ledger read path (ledger_unify_v1)", () => {
  it("switch off: rows come back unchanged and the ledger is never queried", async () => {
    const { db, rpc } = dbWith(async () => ({ data: [{ ...rows[0], inches: 99 }], error: null }));
    expect(await viaLedger(db, "athlete_height_checks", rows, false)).toBe(rows);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("switch on: the measurement numbers come from the ledger projection", async () => {
    const { db, rpc } = dbWith(async () => ({ data: [{ ...rows[0], inches: 71 }], error: null }));
    const out = await viaLedger(db, "athlete_height_checks", rows, true);
    expect(rpc).toHaveBeenCalledWith("ledger_project_rows", { _table: "athlete_height_checks", _rows: rows });
    expect(out[0].inches).toBe(71);
  });

  it("a failed ledger read keeps the stored rows and is logged, never hidden", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { db } = dbWith(async () => ({ data: null, error: { message: "boom" } }));
    expect(await viaLedger(db, "athlete_height_checks", rows, true)).toBe(rows);
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it("a projection with the wrong number of rows is refused (stored rows kept)", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { db } = dbWith(async () => ({ data: [], error: null }));
    expect(await viaLedger(db, "athlete_height_checks", rows, true)).toBe(rows);
    err.mockRestore();
  });

  it("rows without id/user_id are never sent to the ledger", async () => {
    const { db, rpc } = dbWith(async () => ({ data: [], error: null }));
    const bare = [{ inches: 70 }];
    expect(projectable(bare)).toBe(false);
    expect(await viaLedger(db, "athlete_height_checks", bare, true)).toBe(bare);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("single-row readers: null stays null; a row is projected", async () => {
    const { db } = dbWith(async () => ({ data: [{ id: "h", user_id: "u1", readiness_score: 64 }], error: null }));
    expect(await viaLedgerOne(db, "hie_snapshots", null, true)).toBeNull();
    expect((await viaLedgerOne(db, "hie_snapshots", { id: "h", user_id: "u1", readiness_score: 64 }, true))?.readiness_score).toBe(64);
  });

  it("the switch is read per athlete: off/missing row = off, allowlisted athlete = on", async () => {
    expect(await ledgerUnifyOn(dbWith(async () => ({})).db, "u1")).toBe(false);
    expect(await ledgerUnifyOn(dbWith(async () => ({}), { feature_key: "ledger_unify_v1", mode: "off", allowlist: [] }).db, "u1")).toBe(false);
    expect(await ledgerUnifyOn(dbWith(async () => ({}), { feature_key: "ledger_unify_v1", mode: "pilot", allowlist: ["u1"] }).db, "u1")).toBe(true);
    expect(await ledgerUnifyOn(dbWith(async () => ({}), { feature_key: "ledger_unify_v1", mode: "pilot", allowlist: ["u1"] }).db, "u2")).toBe(false);
    expect(await ledgerUnifyOn(dbWith(async () => ({})).db, null)).toBe(false);
  });
});

describe("dictionary fixes found by the parity check (Release 0b)", () => {
  it("perceived recovery is the 1–10 check-in answer, not 1–5", () => {
    const d = METRICS.find((m) => m.key === "perceived_recovery")!;
    expect(d.unit).toBe("score_1_10");
    expect(d.physMax).toBe(10);
  });
  it("practice sprint times and the practice effort answer map to one key each", () => {
    const m = new Map(ALIASES.map((a) => [a.alias, a.key]));
    expect(m.get("practice.sprint_10y")).toBe("sprint_10yd_s");
    expect(m.get("practice.sprint_60y")).toBe("sprint_60yd_s");
    expect(m.get("practice.session_rpe")).toBe("session_rpe");
  });
});
