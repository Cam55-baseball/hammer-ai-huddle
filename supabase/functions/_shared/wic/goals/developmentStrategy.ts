/** ONE shared development strategy per player (owner Oct 26). Every consumer reads this output. Judged pillars only. */
import {naturalFirstStrategy,nutritionFocus,GOAL_SHARE_MIN,type Pillar,type PillarState} from './naturalFirst.ts';
export interface StrategyPillarFact {pillar:Pillar;status:string;grade:number|null;progress:number|null;sourceIds:readonly string[]}
export interface DevelopmentStrategy {
 mode:'secure_natural'|'goal_first'|'no_goal';primary:Pillar|null;chosenGoal:Pillar|null;goalShare:number;maintain:Pillar[];
 reason:string;nutrition:string[];sleep:string;sixWeekLine:string;sourceIds:string[];
}
const LABEL:Record<Pillar,string>={contact:'contact',power:'home-run power',speed:'speed',arm:'arm',defense:'defense',pitching:'pitching'};
/** Top-ranked saved category goal → pillar. Hitting splits by the saved power intent. */
export function chosenGoalPillar(goals:readonly {category?:unknown;intent?:unknown;rank?:unknown}[]):Pillar|null{
 const top=[...goals].sort((a,b)=>Number(a.rank??99)-Number(b.rank??99))[0];if(!top)return null;
 const c=String(top.category);
 return c==='hitting'?(top.intent==='power_hitting'?'power':'contact'):c==='speed'||c==='baserunning'?'speed':c==='fielding'?'defense':c==='throwing'?'arm':c==='pitching'?'pitching':null;
}
export function developmentStrategy(i:{chosen:Pillar|null;pillars:readonly StrategyPillarFact[];age:number|null;bodyMassTrend?:'heavier'|'lean'|null}):DevelopmentStrategy{
 const judged=i.pillars.filter(p=>p.status!=='Need more data'&&p.sourceIds.length>0);
 const maintain=judged.filter(p=>p.status==='Elite').map(p=>p.pillar);
 const minor=i.age==null||i.age<18;
 const sleep=`Sleep ${minor?'9–10':'8–9'} hours; recovery days stay soft so your work lands.`;
 if(!i.chosen){
  return {mode:'no_goal',primary:null,chosenGoal:null,goalShare:0,maintain,reason:'Pick a goal so your plan can lead with it.',nutrition:nutritionFocus('contact',i.age),sleep,sixWeekLine:'No goal chosen yet.',sourceIds:[]};
 }
 const states:PillarState[]=judged.map(p=>({pillar:p.pillar,grade:p.grade,statDistancePct:p.grade==null&&p.progress!=null?Math.max(0,1-p.progress):null,elite:p.status==='Elite'}));
 const s=naturalFirstStrategy({chosen:i.chosen,pillars:states,age:i.age,bodyMassTrend:i.bodyMassTrend??null});
 const primaryFact=judged.find(p=>p.pillar===s.primary);
 const keep=maintain.length?` Your elite ${maintain.map(p=>LABEL[p]).join(', ')} gets a maintenance dose.`:'';
 const reason=s.mode==='secure_natural'
  ?`We're securing your ${LABEL[s.primary]} first; you're close to elite. Your ${LABEL[i.chosen]} goal keeps at least ${Math.round(GOAL_SHARE_MIN*100)}% of the goal work every week.${keep}`
  :`Your ${LABEL[i.chosen]} goal leads your plan.${keep}`;
 return {mode:s.mode,primary:s.primary,chosenGoal:i.chosen,goalShare:s.goalShare,maintain,reason,
  nutrition:nutritionFocus(s.primary,i.age),sleep,sixWeekLine:reason,
  sourceIds:s.mode==='secure_natural'&&primaryFact?[...primaryFact.sourceIds]:[]};
}
