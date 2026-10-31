import { describe, it, expect } from "vitest";
import { activeInjuryAreas, addInjuryCheck, cooldownCareDue, detectFullGoPhrasing, injuryProgressLine, markAreaHealed, painRegionsFromLocations } from "../../../supabase/functions/_shared/health/fullGo";

const ankle = { region: "ankle", severity: "managing", note: "ORIF", reported_at: "2026-08-15" };
const shoulder = { region: "shoulder", severity: "moderate", reported_at: "2026-09-24" };

describe("healed / full go (owner Fix 7/8)", () => {
  it("only entered, still-active injuries get the step", () => {
    expect(activeInjuryAreas([ankle, shoulder, { region: "knee", recovery_status: "healed" }, "sore back"])).toEqual(["ankle", "shoulder"]);
  });
  it("marks the EXISTING active ankle entries healed without adding a row", () => {
    const { next, changed } = markAreaHealed([ankle, shoulder, { ...ankle, reported_at: "2026-09-01" }], "ankle", "self", "2026-10-31T00:00:00Z");
    expect(next).toHaveLength(3);
    expect(changed).toBe(2);
    expect(activeInjuryAreas(next)).toEqual(["shoulder"]);
    expect((next[0] as any).recovery_status).toBe("healed");
  });
  it("after healing the step is gone for that area", () => {
    const { next } = markAreaHealed([ankle], "ankle", "self", "x");
    expect(activeInjuryAreas(next)).toEqual([]);
    expect(markAreaHealed(next, "ankle", "self", "y").changed).toBe(0);
  });
  it("shows a 7-day progress line from the player's own answers", () => {
    let h: unknown[] = [ankle];
    h = addInjuryCheck(h, "ankle", { date: "2026-10-25", pain: 5, function: 6 });
    h = addInjuryCheck(h, "ankle", { date: "2026-10-31", pain: 2, function: 8 });
    expect(injuryProgressLine(h, "ankle", "2026-10-31")).toBe("Ankle: pain 2/10, trending down over 7 days.");
  });
  it("healed or full go words are detected, negations are not", () => {
    expect(detectFullGoPhrasing("I'm fully rehabbed and full go from my ankle")).toEqual({ matched: true, region: "ankle" });
    expect(detectFullGoPhrasing("my ankle is not healed yet").matched).toBe(false);
    expect(detectFullGoPhrasing("my ankle hurts").matched).toBe(false);
  });
  it("check-in body-map pain maps to the healed area for the caution watch", () => {
    expect(painRegionsFromLocations(["left_ankle_inside", "lower_back"])).toEqual(["ankle", "back"]);
  });
  it("cool-down care is occasional: one day in three", () => {
    const days = ["2026-11-01", "2026-11-02", "2026-11-03"].filter(cooldownCareDue);
    expect(days).toHaveLength(1);
  });
});
