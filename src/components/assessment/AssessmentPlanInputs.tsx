import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { PhysioHealthIntakeDialog } from '@/components/physio/PhysioHealthIntakeDialog';
import { usePhysioProfile } from '@/hooks/usePhysioProfile';
import { useSeasonStatus } from '@/hooks/useSeasonStatus';
import { SeasonDatesDialog } from '@/components/hammer/SeasonDatesDialog';
import { SeasonStatusSelector } from '@/components/calendar/SeasonStatusSelector';
import type { RegisterDraftFlush } from '@/lib/assessment/draftFlush';
/** Assessment reviews saved identity and opens the same season and health editors. */
export function AssessmentPlanInputs({registerFlush,onBack}:{registerFlush?:RegisterDraftFlush;onBack:()=>void}) {
 const {user}=useAuth(); const {setupCompleted}=usePhysioProfile();const season=useSeasonStatus();
 const [healthOpen,setHealthOpen]=useState(false);const [datesOpen,setDatesOpen]=useState(false);
 const query=useQuery({queryKey:['assessment-plan-inputs',user?.id],enabled:!!user,queryFn:async()=>{
  if(!user)throw new Error('Sign in first');
  const result=await supabase.from('athlete_context').select('sport_primary,position_primary,competition_level,bats_hand,throws_hand').eq('user_id',user.id).maybeSingle();
  if(result.error)throw result.error;return result.data;
 }});
 useEffect(()=>{registerFlush?.(async()=>!healthOpen&&!datesOpen);return()=>registerFlush?.(null);},[registerFlush,healthOpen,datesOpen]);
 if(query.isError)return <p role="alert">Couldn't load your saved answers. Close and try again.</p>;
 if(!query.isSuccess)return <p role="status">Loading your saved answers…</p>;
 const c=query.data;
 return <section className="space-y-5"><h3 className="text-lg font-semibold">Your saved details</h3><dl className="grid grid-cols-2 gap-3 text-sm">{[['Sport',c?.sport_primary],['Position',c?.position_primary],['Playing level',c?.competition_level],['Bats',c?.bats_hand],['Throws',c?.throws_hand]].map(([label,value])=><div key={label}><dt className="text-muted-foreground">{label}</dt><dd>{value||'Not saved yet'}</dd></div>)}</dl><Button asChild variant="link"><Link to="/profile">Change profile details</Link></Button>
 <div className="space-y-3 border-y border-border py-4"><p className="font-medium">Season</p><p className="text-sm text-muted-foreground">{season.seasonStatus.replace(/_/g,' ')}</p><SeasonStatusSelector/><Button variant="outline" onClick={()=>setDatesOpen(true)}>Season dates · optional</Button></div>
 <Button variant="outline" onClick={()=>setHealthOpen(true)}>{setupCompleted?'Review saved health & nutrition':'Health & nutrition setup'}</Button>
 <Button className="w-full" onClick={onBack} disabled={healthOpen||datesOpen}>Return</Button>
 <PhysioHealthIntakeDialog open={healthOpen} onOpenChange={setHealthOpen} isEditMode={setupCompleted}/><SeasonDatesDialog open={datesOpen} onOpenChange={setDatesOpen}/></section>;
}
