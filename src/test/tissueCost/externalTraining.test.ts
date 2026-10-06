import { describe, it, expect } from "vitest";
import { mergeExternal } from "../../../supabase/functions/_shared/wic/schedule/externalTraining";
import { finalRuleCheck } from "../../../supabase/functions/_shared/wic/schedule/finalCheck";
import { startPlanItems, playerRole } from "@/lib/hammer/startPlanItems";

const lift = (slug: string) => ({ slot: "lift", sequence_role: "main", movement_slug: slug, status: "planned" } as any);

describe("other-program training counts toward Hammers Today rules", () => {
  it("an Iron Bambino lift yesterday blocks today's lift (2 rest days)", () => {
    const m = mergeExternal([{ day: "2026-10-05", kind: "lift", intensity: "moderate", source: "Iron Bambino" }], "2026-10-06", [], {});
    const r = finalRuleCheck([lift("back_squat")], {
      planDate: "2026-10-06", phase: "off_season", age: 17, priorLiftDates: m.priorLiftDates,
      restDaysBetweenLifts: 2, weeklyLiftMax: null, liftRemoved: false, catalog: new Map(),
    });
    expect(r.swaps.map((s) => s.rule)).toContain("lift_spacing");
  });
  it("a lift completed today elsewhere removes today's lift", () => {
    const m = mergeExternal([{ day: "2026-10-06", kind: "lift", intensity: "moderate", source: "Heat Factory" }], "2026-10-06", [], {});
    const r = finalRuleCheck([lift("back_squat")], {
      planDate: "2026-10-06", phase: "off_season", age: 17, priorLiftDates: m.priorLiftDates,
      restDaysBetweenLifts: 2, weeklyLiftMax: null, liftRemoved: false, sameDayExternal: m.sameDayExternal, catalog: new Map(),
    });
    expect(r.swaps[0]?.rule).toBe("trained_elsewhere_today");
  });
  it("a Speed Lab session yesterday is a hard running day", () => {
    const m = mergeExternal([{ day: "2026-10-05", kind: "hard_run", intensity: "high", source: "Speed Lab" }], "2026-10-06", [], {});
    expect(m.priorKindDates.hard_run).toContain("2026-10-05");
  });
});

describe("start card lists this player's cards", () => {
  it("pitcher / position / 2-Way", () => {
    expect(playerRole(["P"])).toBe("pitcher");
    expect(playerRole(["SS"])).toBe("position");
    expect(playerRole(["P", "CF"])).toBe("two_way");
    expect(startPlanItems({ positions: ["SS"] }).some((i) => i.key === "pitching")).toBe(false);
    expect(startPlanItems({ positions: ["P"] }).some((i) => i.key === "pitching")).toBe(true);
    expect(startPlanItems({ positions: ["SS"], sport: "softball" }).find((i) => i.key === "speed")?.detail).toMatch(/60-foot/);
  });
});
