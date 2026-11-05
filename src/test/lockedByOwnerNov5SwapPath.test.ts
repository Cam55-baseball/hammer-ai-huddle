import { describe, expect, it } from "vitest";
// The exact packaged builder that plan-swap (via _shared/composeSportDay) runs when Swap rebuilds a day.
import { buildHammerDailyPlan } from "../../supabase/functions/_shared/generated/hammerBlockBuilder.mjs";
import { NORMAL_SIGNAL } from "@/lib/hammer/prescription/scheduleContext";
import type { ContextVariable, HammerAthleteContext } from "@/lib/hammer/context/athleteContext";

function ctx(values: Record<string, unknown>): HammerAthleteContext {
  const variables = Object.entries(values).map(([key, value]): ContextVariable => ({ key, value, label: key,
    domain: "identity", source: "test", confidence: "high", missing: false, lastUpdated: null,
    lineage: { owner: "test", source: "test", rawConfidence: "high" } }));
  return { variables, missing: [], missingCount: 0, isLoading: false, envelope: null,
    get<T>(key: string) { return variables.find((row) => row.key === key) as ContextVariable<T> | undefined; } };
}
const gear = ["tee", "gamer_bat", "net", "field", "glove", "ball", "baseballs", "softballs", "bands", "partner", "plyo_balls", "bucket", "bases", "cones"];

describe("locked by owner Nov 5: Swap-path rebuild keeps position_skill drills on Defense", () => {
  for (const sport of ["baseball", "softball"] as const) {
    it(`${sport}: position_skill drills land on Defense, never in the warm-up`, () => {
      let skillOnDefense = 0;
      for (let n = 0; n < 14; n++) {
        const plan = (buildHammerDailyPlan as any)(ctx({ sport_primary: sport, position_primary: "SS", season_phase: "off", age_years: 20,
          lifecycle_band: "college", lifting_age_years: 2, development_priorities: ["throwing", "defense"], weekly_availability_days: 6,
          injury_history: [], equipment_effective: gear }), NORMAL_SIGNAL, null, null, undefined, new Date(2026, 10, 5 + n),
          { subscriptionModules: [`${sport}_5tool`] });
        for (const b of plan.blocks as any[]) {
          const skill = (b.drills ?? []).filter((d: any) => d.eassCategory === "position_skill");
          if (b.modality === "warmup") expect({ day: n, warmupSkill: skill.map((d: any) => d.name) }).toEqual({ day: n, warmupSkill: [] });
          if (b.modality === "defense") skillOnDefense += skill.length;
        }
      }
      expect(skillOnDefense).toBeGreaterThan(0);
    });
  }
});
