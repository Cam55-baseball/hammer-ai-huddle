import { it } from "vitest";
import { buildHammerDailyPlan } from "@/lib/hammer/prescription/dailyPlan";
import { NORMAL_SIGNAL } from "@/lib/hammer/prescription/scheduleContext";
function ctx(values: Record<string, unknown>): any {
  const variables = Object.entries(values).map(([key, value]) => ({ key, value, label: key, domain: "identity", source: "test", confidence: "high", missing: false, lastUpdated: null, lineage: { owner: "test", source: "test", rawConfidence: "high" } }));
  return { variables, missing: [], missingCount: 0, isLoading: false, envelope: null, get(key: string) { return variables.find((r) => r.key === key); } };
}
it("peek", () => {
  for (const n of [0,1,2,3]) {
  const plan = buildHammerDailyPlan(ctx({ sport_primary: "baseball", position_primary: "SS", season_phase: "in", age_years: 20, lifecycle_band: "college", lifting_age_years: 2, development_priorities: ["throwing","defense"], weekly_availability_days: 6, injury_history: [], equipment_effective: ["glove","ball","baseballs","bands","partner","field"] }), NORMAL_SIGNAL, null, null, undefined, new Date(2026, 5, 1+n), { subscriptionModules: ["baseball_5tool"] });
  console.log(n, plan.blocks.filter(b=>b.modality==='warmup').flatMap(b=>b.drills.slice(18).map(d=>d.name+' :: '+d.dosage)).join('
'));
  }
});
