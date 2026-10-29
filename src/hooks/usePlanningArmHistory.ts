import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { readPlanningArmHistory } from '../../supabase/functions/_shared/wic/pitching/readPlanningArmHistory';
export function usePlanningArmHistory(userId:string|undefined,date:string,sport:string,enabled:boolean){
  return useQuery({queryKey:['planning-arm-history',userId,date,sport],enabled:!!userId&&enabled,refetchOnMount:'always',queryFn:()=>{
    if(!userId)throw new Error('Sign in to check arm history');
    return readPlanningArmHistory(supabase,userId,date,sport);
  }});
}