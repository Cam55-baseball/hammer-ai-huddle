import { describe, it, expect } from "vitest";
import { baselineSignal } from "../../supabase/functions/_shared/wic/recovery/baselineSignal";
import { athleteNoticeCopy } from "@/lib/hammer/notices/athleteNoticeCopy";

const row = (metric_key: string, status: string, observed_at: string | null = "2026-10-05T08:00:00Z", computed_at = "2026-10-05T09:00:00Z") =>
  ({ metric_key, status, n_used: 10, computed_at, observed_at });
const base = { planDate: "2026-10-06", checkInAlreadyStepped: false };

describe("Stage 7 — baselines in the plan", () => {
  it("no baseline → coverage none, nothing changes", () => {
    const r = baselineSignal({ ...base, rows: [] });
    expect(r).toMatchObject({ coverage: "none", applied: false, reason: null });
  });
  it("still learning never moves the plan", () => {
    const r = baselineSignal({ ...base, rows: [row("readiness.readiness_score", "still_learning")] });
    expect(r).toMatchObject({ coverage: "learning", applied: false });
  });
  it("check-in below their own usual → one lighter step, coach language, no numbers", () => {
    const r = baselineSignal({ ...base, rows: [row("readiness.readiness_score", "below")] });
    expect(r.applied).toBe(true);
    expect(r.reason).toMatch(/lower than your usual/);
    expect(r.reason).not.toMatch(/\d/);
  });
  it("never stacks on a check-in step", () => {
    expect(baselineSignal({ ...base, checkInAlreadyStepped: true, rows: [row("readiness.readiness_score", "well_below")] }).applied).toBe(false);
  });
  it("old observations do not count", () => {
    expect(baselineSignal({ ...base, rows: [row("readiness.readiness_score", "well_below", "2026-09-20T08:00:00Z")] }).applied).toBe(false);
  });
  it("above usual readiness or merely 'above' effort never lightens or adds", () => {
    expect(baselineSignal({ ...base, rows: [row("readiness.readiness_score", "well_above"), row("lifting.session_rpe", "above")] }).applied).toBe(false);
  });
  it("lift felt far harder than usual → lighter", () => {
    expect(baselineSignal({ ...base, rows: [row("lifting.session_rpe", "well_above")] }).applied).toBe(true);
  });
  it("latest verdict wins", () => {
    const r = baselineSignal({ ...base, rows: [row("readiness.readiness_score", "below", undefined, "2026-10-04T09:00:00Z"), row("readiness.readiness_score", "usual")] });
    expect(r.applied).toBe(false);
  });
  it("athlete notice passes the line through", () => {
    const line = "Your check-in is lower than your usual, so today is lighter.";
    expect(athleteNoticeCopy("baseline", line)).toBe(line);
  });
});
