/** "Secure what's natural first" — owner development philosophy (Oct 26). Only judged pillars count. */
export type Pillar='contact'|'power'|'speed'|'arm'|'defense'|'pitching';
export interface PillarState {pillar:Pillar;grade?:number|null;statDistancePct?:number|null;elite:boolean|null}
export interface StrategyInput {chosen:Pillar;pillars:readonly PillarState[];age:number|null;bodyMassTrend?:'heavier'|'lean'|null}
export const NEAR_GRADE=[55,60] as const;export const NEAR_STAT_PCT=.20;export const GOAL_SHARE_MIN=.30;export const ELITE_GRADE=65;
export function distanceToElite(p:PillarState){
 if(p.elite)return 0;
 if(typeof p.grade==='number')return Math.max(0,ELITE_GRADE-p.grade)/ELITE_GRADE;
 return typeof p.statDistancePct==='number'?p.statDistancePct:null;
}
export function isNear(p:PillarState){
 if(p.elite)return false;
 if(typeof p.grade==='number')return p.grade>=NEAR_GRADE[0]&&p.grade<=NEAR_GRADE[1];
 return typeof p.statDistancePct==='number'&&p.statDistancePct<=NEAR_STAT_PCT;
}
export function naturalFirstStrategy(i:StrategyInput){
 const goal=i.pillars.find(p=>p.pillar===i.chosen);const goalFar=!goal||!goal.elite&&!isNear(goal);
 let near=i.pillars.filter(p=>p.pillar!==i.chosen&&isNear(p));
 // Body composition: a heavier player on the power cusp secures power first.
 if(i.bodyMassTrend==='heavier')near=[...near].sort((a,b)=>(b.pillar==='power'?1:0)-(a.pillar==='power'?1:0));
 near=near.length>1&&i.bodyMassTrend!=='heavier'?[...near].sort((a,b)=>(distanceToElite(a)??1)-(distanceToElite(b)??1)):near;
 const maintain=i.pillars.filter(p=>p.elite).map(p=>p.pillar);
 if(goalFar&&near.length){const primary=near[0].pillar;
  return {mode:'secure_natural' as const,primary,goalShare:GOAL_SHARE_MIN,maintain,
   message:`We're securing your ${primary} first; you're close to elite. Your ${i.chosen} work continues every week.`};}
 return {mode:'goal_first' as const,primary:i.chosen,goalShare:1,maintain,message:`Your ${i.chosen} goal leads your plan.`};
}
/** Minor safeguard: under-18 (or unknown age) never gets weight-loss or calorie-restriction guidance. */
const restrict=/\b(lose weight|weight loss|cut(ting)? calories|calorie (deficit|restriction)|diet down|drop (pounds|weight))\b/i;
export function nutritionFocus(primary:Pillar,age:number|null){
 const minor=age==null||age<18;
 const lines=primary==='power'?['Eat enough protein at every meal to support lean muscle.','Fuel training days fully.']
  :primary==='speed'?(minor?['Eat balanced meals that fuel growth and sprint work.']:['Keep a lean body composition with balanced meals.'])
  :['Fuel training with balanced meals.'];
 if(minor)lines.push('Talk with a parent or professional before changing how you eat.');
 return lines.filter(l=>!(minor&&restrict.test(l)));
}
export function isSafeForMinor(text:string){return !restrict.test(text);}
export const NATURAL_FIRST_PRINCIPLE="Owner principle: if a pillar you didn't choose is close to elite while your goal is far, we secure that pillar first. Your goal always keeps at least 30% of the goal work with weekly progress shown. Once the close pillar is elite, your goal leads and the elite pillar gets a maintenance dose. If nothing is close, your goal leads. Players under 18 never get weight-loss or calorie-cutting advice.";
