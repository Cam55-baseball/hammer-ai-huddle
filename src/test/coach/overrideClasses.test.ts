import { describe, expect, it } from "vitest";
import { runCoachWarningAction } from "@/lib/coachRx/warningAction";
import { missingCoachFactWarning, type CoachGuidelineWarning } from "../../../supabase/functions/_shared/coach/guidelineWarnings";

// Every safety class is a warning: Okay proceeds, Cancel saves nothing.
const classes: Array<[string, boolean]> = [
  ["injury_flag", true], ["arm_limit", true], ["age_gate", true], ["season_rule", false],
  ["recovery_intensity", false], ["workload_cap", false], ["dose_range", false], ["missing_equipment", false],
  ["missing_check_in", false], ["missing_workload_limit", false], ["eccentric_in_season", false],
];
function server(w: CoachGuidelineWarning) {
  const saved: unknown[] = [];
  const call = async (ack?: string[], reason?: string) => {
    if (!ack) return { applied: false, warning_required: true, warnings: [w] };
    if (w.requires_reason && (!reason || reason.trim().length < 10)) return { applied: false, reason_required: true, warnings: [w] };
    saved.push({ ack, reason }); return { applied: true };
  };
  return { saved, call };
}
for (const side of ["coach send", "player use instead"]) for (const [code, medical] of classes) for (const minor of [true, false]) {
  describe(`${side} · ${code} · ${minor ? "under 18" : "adult"}`, () => {
    const w: CoachGuidelineWarning = { ...(code === "missing_check_in" || code === "missing_workload_limit" ? missingCoachFactWarning("2026-10-26", code === "missing_check_in" ? "check_in" : "workload_limit") : { code, date: "2026-10-26", rule: `${code} rule on 2026-10-26` }), player_id: "p", medical, requires_reason: medical && minor };
    it("Cancel saves nothing", async () => { const s = server(w); const r = await runCoachWarningAction(s.call, async () => null); expect(r).toMatchObject({ cancelled: true }); expect(s.saved).toHaveLength(0); });
    it("Okay proceeds (with a reason when required)", async () => {
      const s = server(w); const r = await runCoachWarningAction(s.call, async () => "Coach reviewed with trainer");
      expect(r).toMatchObject({ applied: true }); expect(s.saved).toHaveLength(1);
    });
    if (w.requires_reason) it("a short reason never saves", async () => { const s = server(w); await runCoachWarningAction(s.call, async () => "short"); expect(s.saved).toHaveLength(0); });
  });
}
