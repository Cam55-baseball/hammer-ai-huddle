import { it } from "vitest";
import { commandDayPlan } from "./pitcherRolePlan";
import { resolveOutingFacts } from "../../../../supabase/functions/_shared/wic/pitching/outingFacts";
it("dbg", () => {
  const rows:any[] = []; for (const d of ["2026-06-05","2026-06-12","2026-06-19"]) rows.push({ id:d, outing_type:"start", planned_date:d, actual_date: d<"2026-06-08"?d:null, status: d<"2026-06-08"?"thrown":"planned" });
  const facts = resolveOutingFacts({ planDate:"2026-06-08", settings:{ role:"starter", rotation_anchor_date:"2026-06-05", rotation_every_days:7, rotation_active:true, pitching_role:"starter", primary_focus:null, limit_pitching:false } as any, outings: rows, availability: [] });
  console.log(JSON.stringify(facts));
  console.log(JSON.stringify(commandDayPlan({ sport:"baseball", role:"starter", facts, evidence:{walkRate:0.18,walkMax:0.1}, day:new Date(2026,5,8) })));
});
