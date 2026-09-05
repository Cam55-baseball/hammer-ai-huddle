import { describe, it } from "vitest";
import { buildHammerDailyPlan } from "@/lib/hammer/prescription/dailyPlan";
import type { HammerAthleteContext, ContextVariable } from "@/lib/hammer/context/athleteContext";
function variable(key: string, value: unknown): ContextVariable {
  const missing = value == null || value === "";
  return { key, label: key, domain: "identity", value: missing ? null : value, source: "test", confidence: missing ? "missing" : "high", missing, lastUpdated: null, lineage: { owner: "test", source: "test", rawConfidence: missing ? "missing" : "high" } } as any;
}
function ctx(values: Record<string, unknown>): HammerAthleteContext {
  const variables = Object.entries(values).map(([k, v]) => variable(k, v));
  return { variables, missing: variables.filter(v=>v.missing), isLoading:false, missingCount:0, envelope:null, get(k:string){return variables.find(v=>v.key===k) as any;} } as any;
}
describe("dbg", () => { it("prints", () => {
  const plan = buildHammerDailyPlan(ctx({ sport_primary:"baseball", position_primary:"SS", equipment_effective:{equipment:["gamer_bat","tee","pitching_machine"],scope:"persistent"}, lifecycle_band:"u18", season_phase:"in", lifting_age_years:2, weekly_availability_days:6, development_priorities:["hitting"], injury_history:[] }));
  for (const b of plan.blocks) console.log(b.modality, "|", b.status, "|", b.title, "| drills:", b.drills.map(d=>d.name).join(", "));
}); });
