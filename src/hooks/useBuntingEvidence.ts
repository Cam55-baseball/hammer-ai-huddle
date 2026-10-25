import {useQuery} from '@tanstack/react-query';
import {supabase} from '@/integrations/supabase/client';
import {useAuth} from '@/hooks/useAuth';
import {projectBuntingEvidence} from '@/lib/hammer/prescription/buntingEvidence';
import type {BuntCatalogItem} from '@/lib/hammer/prescription/buntingPlan';
/** Complete, self/sport-scoped source reads. An unavailable history never means no failures. */
export function useBuntingEvidence(sport:string,date:string,enabled:boolean){
 const {user}=useAuth();
 return useQuery({queryKey:['bunting-evidence',user?.id,sport,date],enabled:enabled&&!!user,staleTime:60_000,queryFn:async()=>{
  if(!user)throw new Error('Sign in first');
  const from=new Date(`${date}T12:00:00Z`);from.setUTCDate(from.getUTCDate()-56);const since=from.toISOString().slice(0,10);
  const [sessions,games,catalog,tasks]=await Promise.all([
   supabase.from('performance_sessions').select('id,module,drill_blocks,micro_layer_data').eq('user_id',user.id).eq('sport',sport).in('module',['hitting','bunting']).is('deleted_at',null).gte('session_date',since).lt('session_date',date).limit(1000),
   supabase.from('gp_games').select('id').eq('user_id',user.id).eq('sport',sport).is('deleted_at',null).eq('ignored_for_training',false).gte('game_date',since).lt('game_date',date).in('status',['completed','final']).limit(1000),
   supabase.from('wk_movement_catalog').select('slug,name,cue,is_active,dosage_unit,equipment_requirements,equipment,equipment_alternatives,sport_scope,min_age_years,season_eligibility,visible_to').like('slug','bunt_%').eq('is_active',true).limit(1000),
   supabase.from('hammer_daily_task_completions').select('id,payload').eq('user_id',user.id).eq('source','block_drill').gte('plan_date',since).lt('plan_date',date).limit(1000),
  ]);
  for(const result of [sessions,games,catalog,tasks]){if(result.error)throw result.error;if(!result.data||result.data.length>=1000)throw new Error('Could not read complete bunting history. Try again.');}
  const ids=(games.data??[]).map(g=>g.id);
  const [abs,pitches]=ids.length?await Promise.all([
   supabase.from('gp_at_bats').select('id,game_id,result').eq('user_id',user.id).in('game_id',ids).limit(1000),
   supabase.from('gp_pitches').select('id,bunt_side,bunt_type,bunt_success').eq('user_id',user.id).eq('perspective','hitter').in('game_id',ids).in('result',['bunt_foul','bunt_in_play']).limit(1000),
  ]):[{data:[],error:null},{data:[],error:null}];
  for(const result of [abs,pitches]){if(result.error)throw result.error;if(!result.data||result.data.length>=1000)throw new Error('Could not read complete game bunting history. Try again.');}
  return {evidence:projectBuntingEvidence(sessions.data??[],abs.data??[],pitches.data??[],tasks.data??[],sport),catalog:(catalog.data??[]) as BuntCatalogItem[]};
 }});
}