import { describe, it } from "vitest";
import { buildHammerDailyPlan } from "@/lib/hammer/prescription/dailyPlan";
function variable(key: string, value: unknown) {
  const missing = value == null || value === "";
  return { key, label: key, domain: "identity", value: missing ? null : value, source: "t", confidence: missing ? "missing" : "high", missing, lastUpdated: null, lineage: { owner: "t", source: "t", rawConfidence: "high" } } as any;
}
function ctx(values: Record<string, unknown>) {
  const variables = Object.entries(values).map(([k, v]) => variable(k, v));
  return { variables, missing: variables.filter(v=>v.missing), isLoading: false, missingCount: 0, envelope: null, get(k: string){ return variables.find(v=>v.key===k); } } as any;
}
describe("dbg", () => { it("x", () => {
  const plan = buildHammerDailyPlan(ctx({ sport_primary:"baseball", position_primary:"SS", lifecycle_band:"u18", season_phase:"in", lifting_age_years:2, weekly_availability_days:6, development_priorities:["hitting","defense"], injury_history:[], equipment_effective:["gamer_bat","tee","pitching_machine"] }));
  for (const b of plan.blocks) console.log(b.modality, "|", b.status, "|", b.title, "| drills:", b.drills.length, "| steps:", b.steps.length, "| assumption:", b.assumption, "| missingKeys:", JSON.stringify((b as any).missingContextKeys));
}); });
