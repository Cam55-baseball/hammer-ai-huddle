import { describe, it, expect } from "vitest";
import { resolveOutingFacts, projectRotation } from "../../supabase/functions/_shared/wic/pitching/outingFacts";

const D = "2026-10-08";
const base = { planDate: D, settings: null, outings: [], availability: [] };

describe("pitcher outing facts — actual beats planned", () => {
  it("no rows = no schedule (falls back to old behaviour)", () => {
    expect(resolveOutingFacts(base).hasSchedule).toBe(false);
  });
  it("a planned start that passed unconfirmed is unknown, never thrown", () => {
    const f = resolveOutingFacts({ ...base, outings: [{ id: "a", outing_type: "start", planned_date: "2026-10-07", actual_date: null, status: "planned" }] });
    expect(f.pitchedYesterday).toBe(false);
    expect(f.unconfirmed.map((u) => u.id)).toEqual(["a"]);
  });
  it("scheduled Tuesday, threw Wednesday: counts on Wednesday only", () => {
    const f = resolveOutingFacts({ ...base, outings: [{ id: "a", outing_type: "start", planned_date: "2026-10-06", actual_date: "2026-10-07", status: "thrown" }] });
    expect(f.pitchedYesterday).toBe(true);
    expect(f.thrownDates).toEqual(["2026-10-07"]);
    expect(f.unconfirmed).toEqual([]);
  });
  it("skipped never counts; bullpens don't trigger the day-after flush", () => {
    expect(resolveOutingFacts({ ...base, outings: [{ id: "a", outing_type: "start", planned_date: "2026-10-07", actual_date: null, status: "skipped" }] }).pitchedYesterday).toBe(false);
    expect(resolveOutingFacts({ ...base, outings: [{ id: "b", outing_type: "bullpen", planned_date: null, actual_date: "2026-10-07", status: "thrown" }] }).pitchedYesterday).toBe(false);
  });
  it("planned start tomorrow → day-before priming", () => {
    expect(resolveOutingFacts({ ...base, outings: [{ id: "a", outing_type: "start", planned_date: "2026-10-09", actual_date: null, status: "planned" }] }).startsTomorrow).toBe(true);
  });
  it("rotation projects forward and re-bases on the latest real start", () => {
    const settings = { role: "starter" as const, rotation_anchor_date: "2026-10-01", rotation_every_days: 5, rotation_active: true };
    expect(projectRotation(settings, null, "2026-10-01", "2026-10-12")).toEqual(["2026-10-01", "2026-10-06", "2026-10-11"]);
    // Real start moved to the 7th → next is the 12th, not the 11th.
    expect(projectRotation(settings, "2026-10-07", "2026-10-08", "2026-10-13")).toEqual(["2026-10-12"]);
  });
  it("reliever availability today/tomorrow only for relievers", () => {
    const av = [{ date: "2026-10-09", available: true }];
    expect(resolveOutingFacts({ ...base, settings: { role: "reliever", rotation_anchor_date: null, rotation_every_days: null, rotation_active: false }, availability: av }).relieverAvailableSoon).toBe(true);
    expect(resolveOutingFacts({ ...base, settings: { role: "starter", rotation_anchor_date: null, rotation_every_days: null, rotation_active: false }, availability: av }).relieverAvailableSoon).toBe(false);
  });
});
