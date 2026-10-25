import { describe, expect, it, vi } from "vitest";
import { factGuidelineWarnings, factsWithoutAdvisories, factsWithoutWarnings, medicalFactWarnings, overrideReasonOk, warningsAcknowledged, warningKeys, workloadWarning, ADVISORY_PLAN_RULES, MIN_OVERRIDE_REASON, isCoachPrescriptionDate } from "../../../supabase/functions/_shared/coach/guidelineWarnings";
import { checkPrescriptionReplace, type RxReplaceFacts } from "../../../supabase/functions/_shared/coach/prescriptionSafety";
import { runCoachWarningAction } from "@/lib/coachRx/warningAction";

const facts: RxReplaceFacts = { category: "hitting", date: "2026-10-27", intensity: "high", throwing: false, isRestDay: false, gameOnDate: false, gameNextDay: true, inSeason: true, nextThrowDate: null, injuryMode: false, hasCard: true };
describe("dated coaching warnings", () => {
  it("binds the 118-percent workload result to its actual daily cap and date", () => {
    const warning = workloadWarning("2026-10-25", 118, 100);
    expect(warning.date).toBe("2026-10-25");
    expect(warning.rule).toContain("118%");
    expect(warningsAcknowledged([warning], warningKeys([workloadWarning("2026-10-25", 119, 100)]))).toBe(false);
  });
  it("does not invent a percentage when the measured cap is zero", () => {
    expect(workloadWarning("2026-10-25", 2, 0).rule).toContain("2 units — above the 0-unit");
  });
  it("rejects February 30 and invalid months rather than silently moving the prescription", () => {
    expect(isCoachPrescriptionDate("2026-02-30")).toBe(false);
    expect(isCoachPrescriptionDate("2026-13-27")).toBe(false);
    expect(isCoachPrescriptionDate("2026-10-27")).toBe(true);
    expect(isCoachPrescriptionDate("2028-02-29")).toBe(true);
  });
  it("reports October 27 and its actual October 28 game", () => { expect(factGuidelineWarnings(facts)).toEqual([{ code: "before_game", date: "2026-10-27", rule: "This is the day before the game on 2026-10-28. Max-effort work is normally held that day." }]); });
  it("includes every applicable rule on a rest day with games on October 27 and 28", () => {
    expect(factGuidelineWarnings({ ...facts, isRestDay: true, gameOnDate: true }).map(w => [w.code, w.date])).toEqual([
      ["rest_day", "2026-10-27"], ["game_day", "2026-10-27"], ["before_game", "2026-10-27"],
    ]);
  });
  it("does not repeat Okay indefinitely when the same findings remain unacknowledged", async () => {
    const call = vi.fn(async () => ({ applied: false, warning_required: true, warnings: factGuidelineWarnings(facts) }));
    const confirm = vi.fn(async () => "");
    expect((await runCoachWarningAction(call, confirm)).applied).toBe(false);
    expect(call).toHaveBeenCalledTimes(2);
    expect(confirm).toHaveBeenCalledTimes(1);
  });
  it("requires another decision when the warning date changes to October 29", async () => {
    const call = vi.fn().mockResolvedValueOnce({ warning_required: true, warnings: factGuidelineWarnings(facts) })
      .mockResolvedValueOnce({ warning_required: true, warnings: factGuidelineWarnings({ ...facts, date: "2026-10-29" }) })
      .mockResolvedValueOnce({ applied: true });
    const confirm = vi.fn(async () => "");
    expect((await runCoachWarningAction(call, confirm)).applied).toBe(true);
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(call.mock.calls[2][0]).toEqual(warningKeys(factGuidelineWarnings({ ...facts, date: "2026-10-29" })));
  });
  it("requires all exact current rules, dates and recipients", () => {
    const warnings = [{ ...factGuidelineWarnings(facts)[0], player_id: "one" }];
    expect(warningsAcknowledged(warnings, warningKeys(warnings))).toBe(true);
    expect(warningsAcknowledged(warnings, warningKeys([{ ...warnings[0], date: "2026-10-29" }]))).toBe(false);
    expect(warningsAcknowledged(warnings, warningKeys([{ ...warnings[0], player_id: "two" }]))).toBe(false);
    expect(warningsAcknowledged(warnings, [])).toBe(false);
  });
  it("keeps medical and age plan rules out of the advisory allowlist", () => { for (const code of ["u13_pitch_smart", "u16_weighted_ball", "min_age", "growth_mode", "eccentric_in_season"]) expect(ADVISORY_PLAN_RULES.has(code)).toBe(false); });
  it("cannot manufacture a same-category replacement", () => { expect(checkPrescriptionReplace(factsWithoutAdvisories({ ...facts, hasCard: false })).verdict).toBe("alongside_only"); });
  for (const action of ["send", "team send", "schedule", "edit", "resend", "use_instead", "add_alongside", "use_today"]) {
    it(`${action}: Cancel calls only the read/check phase, never the write`, async () => {
      const call = vi.fn(async (ack?: string[]) => ack ? { applied: true } : { warning_required: true, warnings: factGuidelineWarnings(facts) });
      expect(await runCoachWarningAction(call, async () => null)).toEqual({ applied: false, cancelled: true });
      expect(call).toHaveBeenCalledTimes(1); expect(call.mock.calls[0]).toEqual([]);
    });
    it(`${action}: Okay submits exact acknowledgement before writing`, async () => {
      const call = vi.fn(async (ack?: string[]) => ack ? { applied: true } : { warning_required: true, warnings: factGuidelineWarnings(facts) });
      expect((await runCoachWarningAction(call, async () => "")).applied).toBe(true);
      expect(call).toHaveBeenCalledTimes(2); expect(call.mock.calls[1][0]).toEqual(warningKeys(factGuidelineWarnings(facts)));
    });
  }
});

describe("under-18 medical carve-out (arm health and active pain/injury)", () => {
  it("reports the exact arm-rest date from the pitch-count judge", () => {
    expect(medicalFactWarnings({ ...facts, throwing: true, nextThrowDate: "2026-10-29" })).toEqual([
      { code: "arm_rest", date: "2026-10-27", medical: true, rule: "Arm-health rest: throwing is normally held until 2026-10-29 based on recent pitch counts." },
    ]);
  });
  it("reports an active pain or injury flag with the card date", () => {
    expect(medicalFactWarnings({ ...facts, injuryMode: true })).toEqual([
      { code: "injury_flag", date: "2026-10-27", medical: true, rule: "An active pain or injury flag is recorded for this player. Training is normally held until it clears." },
    ]);
  });
  it("lists every medical finding together when both apply", () => {
    expect(medicalFactWarnings({ ...facts, injuryMode: true, throwing: true, nextThrowDate: "2026-10-29" }).map(w => w.code)).toEqual(["injury_flag", "arm_rest"]);
  });
  it("ignores a throw date that has already passed", () => {
    expect(medicalFactWarnings({ ...facts, throwing: true, nextThrowDate: "2026-10-26" })).toEqual([]);
  });
  it("medical findings no longer hard-block once acknowledged, but the same-category rule still does", () => {
    const cleared = factsWithoutWarnings({ ...facts, injuryMode: true, nextThrowDate: "2026-10-29" });
    expect(checkPrescriptionReplace(cleared).verdict).toBe("allow");
    expect(checkPrescriptionReplace({ ...cleared, hasCard: false }).verdict).toBe("alongside_only");
  });
  it("a reason needs at least 10 real characters", () => {
    expect(overrideReasonOk("sore but ok")).toBe(true);
    expect(overrideReasonOk("  short  ")).toBe(false);
    expect(overrideReasonOk("")).toBe(false);
    expect(overrideReasonOk(null)).toBe(false);
    expect(MIN_OVERRIDE_REASON).toBe(10);
  });
  it("Okay passes the typed reason to the server with the acknowledgement", async () => {
    const medical = [{ code: "arm_rest", date: "2026-10-27", medical: true, requires_reason: true, rule: "Arm-health rest: throwing is normally held until 2026-10-29 based on recent pitch counts." }];
    const call = vi.fn(async (ack?: string[], reason?: string) => ack && reason ? { applied: true } : { warning_required: true, warnings: medical });
    expect((await runCoachWarningAction(call, async () => "Player felt good in warmups")).applied).toBe(true);
    expect(call.mock.calls[1]).toEqual([warningKeys(medical), "Player felt good in warmups"]);
  });
  it("Cancel on a medical warning saves nothing", async () => {
    const medical = [{ code: "injury_flag", date: "2026-10-27", medical: true, requires_reason: true, rule: "An active pain or injury flag is recorded for this player. Training is normally held until it clears." }];
    const call = vi.fn(async (ack?: string[]) => ack ? { applied: true } : { warning_required: true, warnings: medical });
    expect(await runCoachWarningAction(call, async () => null)).toEqual({ applied: false, cancelled: true });
    expect(call).toHaveBeenCalledTimes(1);
  });
  it("a missing reason on a minor's medical override is not a silent pass", async () => {
    const medical = [{ code: "arm_rest", date: "2026-10-27", medical: true, requires_reason: true, rule: "Arm-health rest." }];
    const call = vi.fn()
      .mockResolvedValueOnce({ warning_required: true, warnings: medical })
      .mockResolvedValueOnce({ reason_required: true, warnings: medical })
      .mockResolvedValueOnce({ applied: true });
    const result = await runCoachWarningAction(call, async () => "too short");
    expect(call).toHaveBeenCalledTimes(3);
    expect(result.applied).toBe(true);
  });
});
