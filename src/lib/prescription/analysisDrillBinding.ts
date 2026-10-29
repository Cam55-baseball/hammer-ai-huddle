import type { EliteDrill } from '@/data/drills/eliteDrillCatalog';
import { matchGoalDrills } from './analysisGoals';
import { taggedPracticeChecks } from './practiceCheckDrills';

/** Exact stored report/library identities only; never infer an issue from prose. */
export function analysisDrillBinding(drill: EliteDrill, report: unknown, goals: string[], findings: readonly {fault_key:string}[] = []) {
  const r=report&&typeof report==='object'?report as Record<string,unknown>:{};
  const violations=r.violations_detected&&typeof r.violations_detected==='object'?r.violations_detected as Record<string,unknown>:{};
  const keys=new Set<string>(Object.entries(violations).filter(([,v])=>v===true).map(([k])=>k));
  for(const f of findings)keys.add(f.fault_key);
  if(Array.isArray(r.improvements))for(const f of r.improvements){if(f&&typeof f==='object'&&typeof f.fault_key==='string'&&f.fault_key!=='other')keys.add(f.fault_key);}
  for(const check of taggedPracticeChecks(r))if(Array.isArray(check.finding_tags))for(const key of check.finding_tags)if(typeof key==='string')keys.add(key.trim());
  const fault=drill.violationKeys.find(key=>keys.has(key));
  if(fault)return {issue_key:`fault:${fault}`,fault_key:fault,goal_label:null};
  const goal=matchGoalDrills([drill],goals,drill.category,drill.sports[0])[0]?.reasons[0]?.replace(/^Your goal: /,'');
  return goal?{issue_key:`goal:${goal}`,fault_key:null,goal_label:goal}:null;
}