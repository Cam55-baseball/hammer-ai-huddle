import { expect, it } from 'vitest';
import { buildHammerDailyPlan } from './dailyPlan';
import { NORMAL_SIGNAL } from './scheduleContext';
import type { ContextVariable, HammerAthleteContext } from '../context/contextProjection';
import { selectConditioning } from '../../../../supabase/functions/_shared/wic/conditioning/selectConditioning';
import { splitBaserunning } from '@/components/hammer/cards/todayPresentation';
const gear=['tee','gamer_bat','net','field','glove','ball'];
function context(sport:string,position:string):HammerAthleteContext {
  const values={sport_primary:sport,position_primary:position,lifecycle_band:'adult',season_phase:'off',lifting_age_years:2,weekly_availability_days:6,injury_history:[],equipment_effective:gear};
  const variables=Object.entries(values).map(([key,value]):ContextVariable=>({key,value,label:key,domain:'identity',source:'simulation',confidence:'high',missing:false,lastUpdated:null,lineage:{owner:'simulation',source:'simulation',rawConfidence:'high'}}));
  return {variables,missing:[],missingCount:0,isLoading:false,envelope:null,get<T>(key:string){return variables.find(v=>v.key===key) as ContextVariable<T>|undefined;}};
}
for(const sport of ['baseball','softball']) for(const tier of ['pitcher','5tool','golden2way']) {
  it(`${sport}/${tier}: four weekly actual-builder running blocks and existing conditioning`,()=>{
    const weeks:number[]=[];
    for(let week=0;week<4;week++) {
      let count=0;
      for(let day=0;day<7;day++) {
        const plan=buildHammerDailyPlan(context(sport,tier==='pitcher'?'P':'SS'),NORMAL_SIGNAL,null,null,undefined,new Date(2026,9,5+week*7+day),{subscriptionModules:[`${sport}_${tier}`]});
        const block=plan.blocks.find(b=>b.modality==='baserunning'&&b.status==='ready');
        if(!block)continue;count++;
        expect(block.drills.some(d=>/reads?/.test(d.name.toLowerCase()))).toBe(true);
        expect(block.drills.some(d=>/footwork/.test(d.name.toLowerCase()))).toBe(true);
        expect(block.drills.some(d=>d.executionKind==='baserunning_scenarios')).toBe(true);
        expect(splitBaserunning([block]).mental.every(b=>b.route==='/practice?module=baserunning')).toBe(true);
      }
      weeks.push(count);expect(count).toBeGreaterThanOrEqual(1);
    }
    const cond=selectConditioning({sport:sport as 'baseball'|'softball',position:tier==='pitcher'?'pitcher':'SS',phase:'offseason',isTournamentDay:false,hoursToNearestGame:null,pitcherStartedYesterday:false,returningAfterGap:false,dialDownReasons:[],isPitcher:tier!=='5tool',outingSource:'schedule'});
    expect(cond.slugs).toEqual(sport==='baseball'?['repeat_90ft_bb','bases_home_2nd']:['repeat_43ft_sb','bases_double_sb']);
    console.log('RUNNING_MATRIX',JSON.stringify({sport,tier,weeks,conditioning:cond.slugs}));
  });
}