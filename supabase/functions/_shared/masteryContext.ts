// Uses caller-scoped reads; the canonical RPC rechecks training and health access.
import {createClient} from 'npm:@supabase/supabase-js@2';
import {projectMasterySources} from './generated/hammerBlockBuilder.mjs';
export async function masteryContext(authHeader:string,date:string){
 const url=Deno.env.get('SUPABASE_URL');const key=Deno.env.get('SUPABASE_ANON_KEY');
 if(!url||!key)return {status:'Need more data',reason:'Identity evidence unavailable.'};
 const db=createClient(url,key,{global:{headers:{Authorization:authHeader}},auth:{persistSession:false}});
 const {data:auth,error}=await db.auth.getUser();if(error||!auth.user)return {status:'Need more data'};
 const context=await db.from('athlete_context').select('sport_primary').eq('user_id',auth.user.id).maybeSingle();
 const sport=context.data?.sport_primary;if(context.error||!['baseball','softball'].includes(sport))return {status:'Need more data'};
 const [settings,evidence]=await Promise.all([db.from('mastery_identity_settings').select('*').eq('sport',sport).maybeSingle(),db.rpc('mastery_identity_evidence',{p_sport:sport,p_date:date,p_athlete:auth.user.id})]);
 if(settings.error||evidence.error)return {status:'Need more data',reason:'Identity source read failed; do not judge from partial recall.'};
 const p=projectMasterySources({...evidence.data,date},sport,settings.data);
 return {sport,level:p.level,window:p.batting.latest,contact:p.contact,power:p.power,speed:p.speed,arm:p.arm,defense:p.defensePillar,pitching:p.pitching,steering:p.steering,guidance:p.guidance,standardsSource:p.standardsSource};
}