import { describe, expect, it, vi } from "vitest";
import { factGuidelineWarnings, factsWithoutAdvisories, warningsAcknowledged, warningKeys, ADVISORY_PLAN_RULES } from "../../../supabase/functions/_shared/coach/guidelineWarnings";
import { checkPrescriptionReplace, type RxReplaceFacts } from "../../../supabase/functions/_shared/coach/prescriptionSafety";
import { runCoachWarningAction } from "@/lib/coachRx/warningAction";

const facts: RxReplaceFacts = { category: "hitting", date: "2026-10-27", intensity: "high", throwing: false, isRestDay: false, gameOnDate: false, gameNextDay: true, inSeason: true, nextThrowDate: null, injuryMode: false, hasCard: true };
describe("dated coaching warnings", () => {
  it("reports October 27 and its actual October 28 game", () => { expect(factGuidelineWarnings(facts)).toEqual([{ code: "before_game", date: "2026-10-27", rule: "This is the day before the game on 2026-10-28. Max-effort work is normally held that day." }]); });
  it("requires all exact current rules, dates and recipients", () => {
    const warnings = [{ ...factGuidelineWarnings(facts)[0], player_id: "one" }];
    expect(warningsAcknowledged(warnings, warningKeys(warnings))).toBe(true);
    expect(warningsAcknowledged(warnings, warningKeys([{ ...warnings[0], date: "2026-10-29" }]))).toBe(false);
    expect(warningsAcknowledged(warnings, warningKeys([{ ...warnings[0], player_id: "two" }]))).toBe(false);
    expect(warningsAcknowledged(warnings, [])).toBe(false);
  });
  it("does not clear injury protections", () => { expect(checkPrescriptionReplace(factsWithoutAdvisories({ ...facts, injuryMode: true })).verdict).toBe("alongside_only"); });
  it("does not clear pitch-count rest until October 29", () => { expect(checkPrescriptionReplace(factsWithoutAdvisories({ ...facts, throwing: true, nextThrowDate: "2026-10-29" })).verdict).toBe("alongside_only"); });
  it("cannot manufacture a same-category replacement", () => { expect(checkPrescriptionReplace(factsWithoutAdvisories({ ...facts, hasCard: false })).verdict).toBe("alongside_only"); });
  it("keeps medical and age plan rules out of the advisory allowlist", () => { for (const code of ["u13_pitch_smart", "u16_weighted_ball", "min_age", "growth_mode", "eccentric_in_season"]) expect(ADVISORY_PLAN_RULES.has(code)).toBe(false); });
  for (const action of ["send", "team send", "schedule", "edit", "resend", "use_instead", "add_alongside", "use_today"]) {
    it(`${action}: Cancel calls only the read/check phase, never the write`, async () => {
      const call = vi.fn(async (ack?: string[]) => ack ? { applied: true } : { warning_required: true, warnings: factGuidelineWarnings(facts) });
      expect(await runCoachWarningAction(call, async () => false)).toEqual({ applied: false, cancelled: true });
      expect(call).toHaveBeenCalledTimes(1); expect(call.mock.calls[0]).toEqual([]);
    });
    it(`${action}: Okay submits exact acknowledgement before writing`, async () => {
      const call = vi.fn(async (ack?: string[]) => ack ? { applied: true } : { warning_required: true, warnings: factGuidelineWarnings(facts) });
      expect((await runCoachWarningAction(call, async () => true)).applied).toBe(true);
      expect(call).toHaveBeenCalledTimes(2); expect(call.mock.calls[1][0]).toEqual(warningKeys(factGuidelineWarnings(facts)));
    });
  }
});