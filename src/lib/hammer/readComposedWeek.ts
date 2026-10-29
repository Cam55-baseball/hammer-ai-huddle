import {supabase}from '@/integrations/supabase/client';
import {certifyComposedWeek,type ComposedDayEvidence}from './composedWeek';
export async function readComposedWeek(userId:string,firstDate:string,lastDate:string,sport:'baseball'|'softball',bunting:boolean){
  const [snapshots,physical]=await Promise.all([
    supabase.from('athlete_plan_snapshots').select('plan_date,sport,payload').eq('user_id',userId).eq('sport',sport).gte('plan_date',firstDate).lte('plan_date',lastDate),
    supabase.from('wk_prescriptions').select('plan_date,slot,phase,movement_slug').eq('user_id',userId).gte('plan_date',firstDate).lte('plan_date',lastDate).limit(1000),
  ]);
  if(snapshots.error)throw snapshots.error;if(physical.error)throw physical.error;
  if(!physical.data||physical.data.length>=1000||!snapshots.data)throw new Error('Complete saved week unavailable');
  const days:ComposedDayEvidence[]=snapshots.data.flatMap(row=>{
    const p=row.payload as unknown as Record<string,unknown>;
    if(p.composition_version!=='sport_physical_v1'||!Array.isArray(p.blocks)||typeof p.physicalPhase!=='string'||typeof p.restDay!=='boolean')return [];
    return [{date:row.plan_date,sport:row.sport,phase:p.physicalPhase,restDay:p.restDay,blocks:p.blocks as ComposedDayEvidence['blocks'],physical:physical.data.filter(r=>r.plan_date===row.plan_date).map(r=>({slot:r.slot,phase:r.phase,slug:r.movement_slug}))}];
  });
  return {days,...certifyComposedWeek(days,sport,bunting)};
}