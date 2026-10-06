import { describe, it, expect } from "vitest";
import { resolveWkPhase } from "@/lib/hammer/workout/phaseQuarter";
import { readFileSync } from "fs";

describe("warm-up crossover primer season label", () => {
  it("no fixed In-season badge remains", () => {
    const src = readFileSync("src/components/hammer/HammerDailyPlan.tsx", "utf8");
    expect(src).not.toMatch(/>In-season<\/Badge>/);
    expect(src).toMatch(/Season: \{seasonLabel\}/);
  });
  it("off-season and in-season players resolve to their own labels", () => {
    const off = resolveWkPhase({ season_status: "off_season" } as any);
    const inn = resolveWkPhase({ season_status: "in_season" } as any);
    expect(off.phase).not.toBe("in_season");
    expect(inn.phase).toBe("in_season");
    console.log("off:", off.displayName, "| in:", inn.displayName);
  });
});
