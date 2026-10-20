/**
 * Owner binding rule (Oct 20): NO CATEGORY SPILL-OVER. A planted flag in one
 * category may only change work in that category's own card, and the drill it
 * brings must belong to that category. Checked for both sports, hitter and
 * pitcher, every season, and every flag category. The daily plan takes no
 * subscription argument (access is gated elsewhere), so these runs cover every
 * subscription.
 */
import { describe, expect, it } from "vitest";
import { buildHammerDailyPlan, type PrescribedBlock } from "./dailyPlan";
import type { HammerAthleteContext, ContextVariable } from "@/lib/hammer/context/athleteContext";
import { NORMAL_SIGNAL } from "@/lib/hammer/prescription/scheduleContext";
import { applyFaultPlanInfluence } from "@/lib/prescription/applyFaultPlanInfluence";
import type { EliteDrill } from "@/data/drills/eliteDrillCatalog";
import type { RankedFault } from "@/lib/wic/faultLedger/ranking";

function ctx(values: Record<string, unknown>): HammerAthleteContext {
  const variables = Object.entries(values).map(([key, value]) => ({
    key, label: key, domain: "identity", value, source: "test", confidence: "high", missing: false,
    lastUpdated: null, lineage: { owner: "test", source: "test", rawConfidence: "high" },
  })) as unknown as ContextVariable[];
  return {
    variables, missing: [], isLoading: false, missingCount: 0, envelope: null,
    get<T = unknown>(key: string) { return variables.find((v) => v.key === key) as ContextVariable<T> | undefined; },
  };
}

type Lane = "hitting" | "pitching" | "throwing" | "fielding" | "running";
const LANE_BLOCK: Record<Lane, PrescribedBlock["modality"]> = {
  hitting: "hitting", pitching: "throwing", throwing: "throwing", fielding: "defense", running: "baserunning",
};
const FAULT_KEY = "planted_fault";
const CATS: EliteDrill["category"][] = ["hitting", "pitching", "throwing", "fielding", "running"] as EliteDrill["category"][];
const catalog = (sport: string): EliteDrill[] => CATS.map((category) => ({
  id: `spill.${category}`, name: `Planted ${category} drill`, category, sports: [sport],
  subSkill: "x", level: "feel", fixes: "x", setup: "x", steps: ["x"], cues: ["x"], dosage: "3 x 6",
  equipment: [], violationKeys: [FAULT_KEY], pieV2Signals: [], movementPatterns: [],
} as unknown as EliteDrill));
const fault = (lane: Lane): RankedFault[] => [{
  rootPatternId: "planted", family: null, score: 1, sources: ["video_analysis"], disciplines: [lane],
  totalSampleSize: 1, latestObservedAt: "2026-06-01T00:00:00.000Z", says: "Planted", fades: [], clearedByCleanClips: false,
  signals: [{ id: "s1", user_id: "a1", source: "video_analysis", fault_key: FAULT_KEY, root_pattern_id: "planted",
    discipline: lane, confidence: 0.8, sample_size: 1, severity: 0.5, evidence: "x", observed_at: "2026-06-01T00:00:00.000Z" }],
} as unknown as RankedFault];

const DAYS = Array.from({ length: 14 }, (_, i) => new Date(2026, 5, 1 + i));
const cases: Array<{ sport: string; position: string; season: string }> = [];
for (const sport of ["baseball", "softball"]) for (const position of ["SS", "P"]) for (const season of ["off", "pre", "in"]) cases.push({ sport, position, season });

describe("no category spill-over", () => {
  for (const c of cases) for (const lane of CATS as Lane[]) {
    it(`${c.sport} ${c.position} ${c.season}-season: a ${lane} flag only changes ${lane} work`, () => {
      const C = ctx({
        sport_primary: c.sport, position_primary: c.position, lifecycle_band: "u18", season_phase: c.season,
        lifting_age_years: 2, weekly_availability_days: 6, development_priorities: ["hitting", "defense"],
        injury_history: [], equipment_effective: ["tee", "gamer_bat", "net", "glove", "baseball"],
      });
      for (const day of DAYS) {
        const base = buildHammerDailyPlan(C, NORMAL_SIGNAL, null, null, undefined, day).blocks;
        const after = applyFaultPlanInfluence({
          blocks: base, rankedFaults: fault(lane), sport: c.sport as "baseball", ownedEquipment: new Set(),
          catalog: catalog(c.sport), circulation: { servedToUser: {}, usage: {} }, now: day,
        });
        after.forEach((b, i) => {
          const before = base[i];
          const added = b.drills.filter((d) => !before.drills.some((o) => o.name === d.name));
          if (b.modality !== LANE_BLOCK[lane]) {
            expect(b.drills, `${b.modality} changed by ${lane} flag`).toEqual(before.drills);
          }
          for (const d of added) expect(d.name).toBe(`Planted ${lane} drill`);
        });
      }
    });
  }
});
