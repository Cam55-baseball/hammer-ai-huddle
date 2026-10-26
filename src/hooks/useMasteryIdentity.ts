import {useQuery} from '@tanstack/react-query';
import {supabase} from '@/integrations/supabase/client';
import {useAuth} from '@/hooks/useAuth';
import {battingIdentity,OWNER_WINDOW_POLICY,speedIdentity,masteryBuntingTraits,type BattingEvent,type SpeedEvidence} from '../../supabase/functions/_shared/wic/masteryIdentity';
import {rawToGrade} from '@/lib/gradeEngine';
export function useMasteryIdentity(sport:'baseball'|'softball',date:string,enabled=true){
 const {user}=useAuth();
 return useQuery({queryKey:['mastery-identity',user?.id,sport,date],enabled:enabled&&!!user,staleTime:60_000,queryFn:async()=>{
  if(!user)throw new Error('Sign in first');
  const settings=await supabase.from('mastery_identity_settings').select('*').eq('sport',sport).maybeSingle();if(settings.error)throw settings.error;
  const policy=settings.data?{initialSize:settings.data.initial_window,transitionAt:settings.data.transition_at,laterSize:settings.data.later_window}:OWNER_WINDOW_POLICY;
  // All history is paginated: identity windows must never be a capped recent-game sample.
  const games:{id:string;game_date:string}[]=[];
  for(let offset=0;;offset+=500){const page=await supabase.from('gp_games').select('id,game_date').eq('user_id',user.id).eq('sport',sport).is('deleted_at',null).eq('ignored_for_training',false).in('status',['completed','final']).lt('game_date',date).order('game_date').order('id').range(offset,offset+499);if(page.error)throw page.error;games.push(...page.data);if(page.data.length<500)break;}
  const events:BattingEvent[]=[];const gameMap=new Map(games.map((g,i)=>[g.id,{date:g.game_date,index:i}]));
  for(let chunk=0;chunk<games.length;chunk+=100){const ids=games.slice(chunk,chunk+100).map(g=>g.id);
   for(let offset=0;;offset+=500){const page=await supabase.from('gp_at_bats').select('id,game_id,result,ab_order,inning,created_at,entry_source').eq('user_id',user.id).in('game_id',ids).order('created_at').order('id').range(offset,offset+499);if(page.error)throw page.error;
    events.push(...page.data.map(e=>({id:e.id,result:e.result,date:gameMap.get(e.game_id)?.date??'',order:(gameMap.get(e.game_id)?.index??0)*1000000+(e.inning??0)*10000+(e.ab_order??0),source:e.entry_source??'Game at-bat — source not recorded'})));if(page.data.length<500)break;
   }
  }
  const batting=battingIdentity(events,policy);
  const tests=[];
  for(let offset=0;;offset+=500){const page=await supabase.from('vault_performance_tests').select('id,test_date,test_type,results').eq('user_id',user.id).eq('sport',sport).lt('test_date',date).order('test_date').order('id').range(offset,offset+499);if(page.error)throw page.error;tests.push(...page.data);if(page.data.length<500)break;}
  const speedEvidence:SpeedEvidence[]=[];const speedKeys=new Set(['ten_yard_dash','seven_yard_dash','sixty_yard_dash','forty_yard_dash','thirty_yard_dash','vertical_jump','broad_jump','sl_3x_bound_left','sl_3x_bound_right']);
  for(const test of tests){const results=test.results&&typeof test.results==='object'&&!Array.isArray(test.results)?test.results:{};
   for(const [measure,value] of Object.entries(results)){if(!speedKeys.has(measure)||typeof value!=='number'||!Number.isFinite(value)||value<=0)continue;
    speedEvidence.push({id:`test:${test.id}:${measure}`,source:`Entered performance test · ${test.test_type}`,date:test.test_date,measure,unit:measure.includes('dash')?'seconds':measure==='vertical_jump'?'inches':'feet',value,grade:rawToGrade(measure,value,sport),kind:'measured',sample:1,minimum:settings.data?.speed_minimum_samples??null});
   }
  }
  // Sprint logs require explicit sport provenance; old untagged work isn't borrowed into a sport.
  for(let offset=0;;offset+=500){const page=await supabase.from('wk_session_logs').select('id,plan_date,metrics,distance_feet_completed').eq('user_id',user.id).eq('metrics->>kind','sprint_time').eq('metrics->>sport',sport).lt('plan_date',date).order('plan_date').order('id').range(offset,offset+499);if(page.error)throw page.error;
   for(const row of page.data){const metrics=row.metrics&&typeof row.metrics==='object'&&!Array.isArray(row.metrics)?row.metrics:{};const seconds='time' in metrics?metrics.time:'seconds' in metrics?metrics.seconds:null;
    if(typeof seconds==='number'&&seconds>0&&row.distance_feet_completed){speedEvidence.push({id:`sprint:${row.id}`,source:'Logged sprint',date:row.plan_date,measure:`sprint ${row.distance_feet_completed} feet`,unit:'seconds',value:seconds,grade:null,kind:'measured',sample:1,minimum:settings.data?.speed_minimum_samples??null});}
   }if(page.data.length<500)break;
  }
  const methodCounts=new Map<string,number>();for(const e of speedEvidence){const key=`${e.source}:${e.measure}:${e.unit}`;methodCounts.set(key,(methodCounts.get(key)??0)+1);}
  const speed=speedIdentity(speedEvidence.map(e=>({...e,sample:methodCounts.get(`${e.source}:${e.measure}:${e.unit}`)??0})));
  const traits=masteryBuntingTraits(batting.latest,speed,{eliteHomeRuns:settings.data?.elite_home_runs??null,lackingPowerHomeRuns:settings.data?.lacking_power_home_runs??null,eliteGrade:65});
  return {batting,speed,traits,policy,settings:settings.data,sport,recordedSpeedEvidence:speedEvidence};
 }});
}