import {useQuery} from '@tanstack/react-query';
import {supabase} from '@/integrations/supabase/client';
import {useAuth} from '@/hooks/useAuth';
import {projectMasterySources} from '@/lib/intelligence/masteryProjection';
export function useMasteryIdentity(sport:'baseball'|'softball',date:string,enabled=true,athleteId?:string){
 const {user}=useAuth();
 return useQuery({queryKey:['mastery-identity',user?.id,athleteId??user?.id,sport,date],enabled:enabled&&!!user,staleTime:60_000,queryFn:async()=>{
  if(!user)throw new Error('Sign in first');
  const settings=await supabase.from('mastery_identity_settings').select('*').eq('sport',sport).maybeSingle();if(settings.error)throw settings.error;
   const sources=await supabase.rpc('mastery_identity_evidence',{p_sport:sport,p_date:date,p_athlete:athleteId??user.id});if(sources.error)throw sources.error;
   return projectMasterySources({...sources.data as object,date},sport,settings.data);
 }});
}