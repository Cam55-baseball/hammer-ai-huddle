import {useQuery,useQueryClient}from '@tanstack/react-query';
import {useAuth}from '@/hooks/useAuth';
import {supabase}from '@/integrations/supabase/client';
import {AddAnalysisDrill}from '@/components/analyze/AddAnalysisDrill';
import {ELITE_DRILL_CATALOG}from '@/data/drills/eliteDrillCatalog';
import{mergeCatalog}from '@/lib/prescription/ownerDrills';
import {useDrillCirculation}from '@/hooks/useDrillCirculation';
export function AnalysisRotationNotice({sport,date}:{sport:string;date:string}){
 const {user}=useAuth();const qc=useQueryClient();const circulation=useDrillCirculation();
 const query=useQuery({queryKey:['analysis-drill-rotation',user?.id,sport,date],enabled:!!user&&circulation.ready,
  queryFn:async()=>{const {data,error}=await supabase.functions.invoke('plan-swap',{body:{action:'analysis_rotation',sport,planDate:date}});if(error||data?.error)throw new Error(data?.error??'Your fix-it choices could not be checked.');if(data?.rotated)await qc.invalidateQueries({queryKey:['saved-block-day',user?.id,date]});return data as {pending?:Array<{drillId:string;videoId:string;planDate:string;message:string}>};},staleTime:60_000});
 if(query.isError)return <p role="alert" className="text-sm text-destructive">Your fix-it choices could not be checked. Your saved plan is unchanged.</p>;
 const pending=query.data?.pending?.filter(p=>p&&typeof p==='object'&&typeof p.drillId==='string')??[];
 return <>{pending.map(p=>{const drill=circulation.catalog.find(d=>d.id===p.drillId);if(!drill)return null;return <div key={p.drillId} className="border-l-2 border-primary pl-3 space-y-2"><p className="text-sm">{drill.name} — {p.message}</p><AddAnalysisDrill drill={drill} videoId={p.videoId} sport={sport} planDate={date} rotation/></div>;})}</>;
}