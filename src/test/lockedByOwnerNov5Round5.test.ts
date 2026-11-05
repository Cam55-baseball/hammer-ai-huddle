import { describe, expect, it } from "vitest";
import { buildHammerDailyPlan } from "@/lib/hammer/prescription/dailyPlan";
import { NORMAL_SIGNAL } from "@/lib/hammer/prescription/scheduleContext";
import { WARMUP_LIBRARY } from "@/lib/hammer/prescription/warmupLibrary";
import { throwKind } from "@/lib/hammer/prescription/throwPlacement";
import type { ContextVariable, HammerAthleteContext } from "@/lib/hammer/context/athleteContext";

/** Owner Nov 5 round 5 #1: a warm-up only holds warm-up roles — never a defense, hitting,
 *  pitching, baserunning or bunting SKILL drill. */
const SKILL_CATEGORIES = new Set(["position_skill", "windmill_circle", "intent", "pulldown", "overload"]);
const SKILL_AREAS = new Set(["defense", "fielding", "hitting", "pitching", "baserunning", "bunting", "catching"]);
const WARMUP_SLUGS = new Set(WARMUP_LIBRARY.map((d) => d.slug));

function ctx(values: Record<string, unknown>): HammerAthleteContext {
  const variables = Object.entries(values).map(([key, value]): ContextVariable => ({ key, value, label: key,
    domain: "identity", source: "test", confidence: "high", missing: false, lastUpdated: null,
    lineage: { owner: "test", source: "test", rawConfidence: "high" } }));
  return { variables, missing: [], missingCount: 0, isLoading: false, envelope: null,
    get<T>(key: string) { return variables.find((row) => row.key === key) as ContextVariable<T> | undefined; } };
}
const gear = ["tee", "gamer_bat", "net", "field", "glove", "ball", "baseballs", "softballs", "bands", "partner", "plyo_balls", "bucket", "bases", "cones"];

export function warmupSkillRows(drills: readonly Record<string, unknown>[]) {
  return drills.filter((d) => {
    const name = String(d.name ?? "");
    if (SKILL_CATEGORIES.has(String(d.eassCategory ?? ""))) return true;
    if (SKILL_AREAS.has(String(d.skillArea ?? ""))) return true;
    if (typeof d.slug === "string" && (WARMUP_SLUGS.has(d.slug) || d.slug.startsWith("wu_"))) return false;
    // Throwing warm-up → catch play section (and arm prep moved in by withWarmupThrows) is allowed.
    if (d.throwSection || /^(Arm prep|Warm-up throws) — /.test(name)) return throwKind(d as never) === "position";
    return throwKind(d as never) === "position" || /double[- ]play|quick[- ]release|pop[- ]time|crow[- ]hop|ground[- ]ball|bullpen|bunt|lead[- ]off|steal|tee work|front toss|soft toss/i.test(name);
  });
}

describe("locked by owner Nov 5: no skill-category drill in any warm-up (8-week simulations)", () => {
  for (const sport of ["baseball", "softball"] as const) {
    for (const [tier, pos, focus] of [["5tool", "SS", null], ["5tool", "2B", null], ["5tool", "CF", null], ["5tool", "C", null], ["golden2way", "SS", "position"], ["golden2way", "P", "pitcher"], ["pitcher", "P", null]] as const) {
      it(`${sport} ${tier} ${pos}: warm-ups hold only warm-up roles`, () => {
        let checked = 0;
        for (let n = 0; n < 56; n++) {
          const plan = buildHammerDailyPlan(ctx({ sport_primary: sport, position_primary: pos, season_phase: n < 28 ? "off" : "in", age_years: 20, lifecycle_band: "college",
            lifting_age_years: 2, development_priorities: ["throwing", "defense"], weekly_availability_days: 6, injury_history: [], equipment_effective: gear }),
            NORMAL_SIGNAL, null, null, undefined, new Date(2026, 5, 1 + n),
            { subscriptionModules: [`${sport}_${tier}`], ...(focus ? { pitcherOutings: { primaryFocus: focus } as never } : {}) });
          for (const w of plan.blocks.filter((b) => b.modality === "warmup")) {
            expect({ day: n, bad: warmupSkillRows(w.drills as never).map((d) => d.name) }).toEqual({ day: n, bad: [] });
            checked++;
          }
        }
        expect(checked).toBeGreaterThan(30);
      });
    }
  }
});
