import { describe, it, expect } from "vitest";
import { buildPoseTileFindings, BACK_LEG_CAUSE_FAULT_KEY } from "../../../../supabase/functions/_shared/faultFindings";
const a = { userId: "u", videoId: "v", runId: null, sport: "baseball" };
describe("back-leg root pattern reads as ONE finding", () => {
  it("no fails → no rows", () => expect(buildPoseTileFindings({ ...a, verdicts: { hip_load: "pass", head_discipline: null } })).toEqual([]));
  it("four downstream fails → one row, all listed as evidence, P1 cause key", () => {
    const r = buildPoseTileFindings({ ...a, verdicts: { head_discipline: "fail", head_path_through_stride: "fail", back_hip_socket_hold: "fail", post_landing_hip_drift: "fail" } });
    expect(r).toHaveLength(1);
    expect(r[0].fault_key).toBe(BACK_LEG_CAUSE_FAULT_KEY);
    expect(r[0].root_pattern_key).toBe("back_leg_did_not_hold_load");
    for (const w of ["past your centre of mass", "drifted forward through the stride", "back hip", "after the front foot landed"]) expect(r[0].evidence).toContain(w);
  });
  it("never says weight was measured", () => {
    const r = buildPoseTileFindings({ ...a, verdicts: { hip_load: "fail" } });
    expect(r[0].evidence).toContain("position-based estimate"); expect(r[0].evidence).not.toMatch(/\bweight\b/i);
  });
});
