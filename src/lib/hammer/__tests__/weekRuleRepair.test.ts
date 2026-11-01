import { describe, expect, it } from "vitest";
import { weekRuleBreaks, datesToRebuild, blockedReason } from "../weekRuleRepair";
import { certifyComposedWeek, type ComposedDayEvidence } from "../composedWeek";

const day = (date: string, restDay: boolean): ComposedDayEvidence => ({
  date, sport: "baseball", phase: "os_q1", restDay,
  blocks: restDay ? [] : [{ modality: "hitting", status: "ready", drills: [{}] }, { modality: "defense", status: "ready", drills: [{}] }, { modality: "baserunning", status: "ready", drills: [{}] }],
  physical: restDay ? [] : [{ slot: "conditioning", phase: "os_q1" }],
});
const week = (rest: number[]) => Array.from({ length: 7 }, (_, i) => day(`2026-11-0${i + 2}`, rest.includes(i)));

describe("saved week rule repair (round 2 item 4)", () => {
  it("a week with exactly one rest day and the floors met needs no rebuild", () => {
    expect(weekRuleBreaks(certifyComposedWeek(week([6]), "baseball", false).issues)).toEqual([]);
  });
  it("a week with no rest day is a rule break", () => {
    expect(weekRuleBreaks(certifyComposedWeek(week([]), "baseball", false).issues)).toContain("rest_days:0/1");
  });
  it("a week with two rest days is a rule break", () => {
    expect(weekRuleBreaks(certifyComposedWeek(week([2, 6]), "baseball", false).issues)).toContain("rest_days:2/1");
  });
  it("a missed weekly minimum (defense 4) is a rule break", () => {
    const w = week([6]).map((d, i) => (i < 3 ? { ...d, blocks: d.blocks.filter((b) => b.modality !== "defense") } : d));
    expect(weekRuleBreaks(certifyComposedWeek(w, "baseball", false).issues)).toContain("Defense:3/4");
  });
  it("logged or marked days are never rebuilt", () => {
    expect(datesToRebuild(["2026-11-02", "2026-11-03", "2026-11-04"], new Set(["2026-11-03"]))).toEqual(["2026-11-02", "2026-11-04"]);
  });
  it("a week the rebuild can't fix is blocked with a plain reason", () => {
    expect(blockedReason(["rest_days:0/1", "Defense:3/4"])).toBe("Hammer couldn't fix your week: no rest day, defense 3 of 4 days. Days you already logged or marked stay as they are, and your equipment, injury and schedule limits still apply.");
  });
});
