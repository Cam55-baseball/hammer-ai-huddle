import type { HammerDailyPlanResult } from './prescription/dailyPlan';
/** Only certified combined snapshots are authoritative; legacy saves keep existing handling. */
export function composedPlanReadback(plan: HammerDailyPlanResult, payload: unknown, sport: string, date: string): HammerDailyPlanResult {
  if(!payload||typeof payload!=='object')return plan;
  const saved=payload as Record<string,unknown>;
  if(saved.composition_version!=='sport_physical_v1'||saved.sport!==sport||saved.plan_date!==date||!Array.isArray(saved.blocks))return plan;
  const blocks=saved.blocks;
  if(!blocks.every(b=>b&&typeof b==='object'&&typeof b.modality==='string'&&Array.isArray(b.drills)&&Array.isArray(b.steps)&&Array.isArray(b.missing)&&Array.isArray(b.cues)&&Array.isArray(b.stopRules)))return plan;
  return {...plan,blocks:blocks as HammerDailyPlanResult['blocks'],
    ...(saved.roadmap&&typeof saved.roadmap==='object'?{roadmap:saved.roadmap as HammerDailyPlanResult['roadmap']}:{}),
    ...(saved.microcycle&&typeof saved.microcycle==='object'?{microcycle:saved.microcycle as HammerDailyPlanResult['microcycle']}:{}),
    ...(saved.weeklyTemplate&&typeof saved.weeklyTemplate==='object'?{weeklyTemplate:saved.weeklyTemplate as HammerDailyPlanResult['weeklyTemplate']}:{}),
    ...(Array.isArray(saved.weeklyRoadmap)?{weeklyRoadmap:saved.weeklyRoadmap as HammerDailyPlanResult['weeklyRoadmap']}:{}),
    seasonPhase:typeof saved.seasonPhase==='string'?saved.seasonPhase:plan.seasonPhase};
}