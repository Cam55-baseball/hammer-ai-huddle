import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil, Save } from 'lucide-react';
import { CoachExerciseAuthoring } from '@/components/custom-activities/CoachExerciseAuthoring';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { runCoachWarningAction } from '@/lib/coachRx/warningAction';
import { cardEditSource } from '@/lib/coachRx/dayEditor';
import { validateEditedExercises } from '../../../supabase/functions/_shared/coach/dayEdit';
import type { WeekCard, WeekDay } from '@/lib/coach/playerWeek';
import type { Exercise } from '@/types/customActivity';
import { getTodayDate } from '@/utils/dateUtils';
import { toast } from 'sonner';

export function CoachDayEditor({athleteId,day,card,sport}:{athleteId:string;day:WeekDay;card:WeekCard;sport:string}) {
  const source=cardEditSource(day,card);
  const [open,setOpen]=useState(false);
  const [title,setTitle]=useState(card.title);
  const [items,setItems]=useState<Exercise[]>([]);
  const [name,setName]=useState('');
  const [intensity,setIntensity]=useState('light');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const {user}=useAuth();const qc=useQueryClient();
  if(!source || day.date<getTodayDate() || card.status==='removed')return null;
  const save=async(templateOnly:boolean)=>{
    const invalid=validateEditedExercises(items);if(invalid){setError(invalid);return;}
    if(!user || (templateOnly && !name.trim())){setError('Name your template.');return;}
    setBusy(true);setError('');
    try{
      if(templateOnly){
        const result=await supabase.from('custom_activity_templates').insert({user_id:user.id,title:name.trim(),activity_type:source.category==='recovery'?'recovery':'workout',sport,exercises:items as never,intensity:intensity==='standard'?'moderate':intensity,coach_card_category:source.category,display_on_game_plan:false}).select('id').single();
        if(result.error)throw result.error;
        await qc.invalidateQueries({queryKey:['coach-card-templates']});toast.success('Template saved in Send workouts.');
      }else{
        const result=await runCoachWarningAction(async(ack,reason)=>{const r=await supabase.functions.invoke('coach-rx-safety',{body:{mode:'edit_day',athlete_id:athleteId,plan_date:day.date,category:source.category,target:source.target,title,exercises:items,intensity,warning_acknowledgement:ack,override_reason:reason}});if(r.error)throw r.error;return r.data;});
        if(result.cancelled)return;
        if(!result.applied){setError(result.reasons?.[0] ?? result.error ?? 'Nothing changed. Refresh and try again.');return;}
        await qc.invalidateQueries({queryKey:['coach-player-week']});toast.success('This day’s card was replaced. The player was notified.');setOpen(false);
      }
    }catch(e){setError(e instanceof Error?e.message:'Could not save.');}finally{setBusy(false);}
  };
  return <><Button size="sm" variant="outline" onClick={()=>{setItems(source.exercises);setTitle(card.title);setError('');setOpen(true);}}><Pencil className="mr-1 h-4 w-4"/>Edit this day</Button>
    <Dialog open={open} onOpenChange={value=>{if(!busy)setOpen(value);}}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Edit this day · {day.date}</DialogTitle></DialogHeader>
      <Label>Card name<Input value={title} onChange={e=>setTitle(e.target.value)}/></Label>
      <Label>Intensity<select aria-label="Edited card intensity" className="w-full rounded-md border border-input bg-background p-2" value={intensity} onChange={e=>setIntensity(e.target.value)}><option value="light">Light</option><option value="standard">Standard</option><option value="high">High</option></select></Label>
      <CoachExerciseAuthoring exercises={items} onChange={setItems}/>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="border-t border-border pt-3"><Label>Template name<Input value={name} onChange={e=>setName(e.target.value)}/></Label><Button className="mt-2" size="sm" variant="outline" disabled={busy} onClick={()=>void save(true)}><Save className="mr-1 h-4 w-4"/>Save as template</Button></div>
      <div className="flex justify-end gap-2"><Button variant="ghost" disabled={busy} onClick={()=>setOpen(false)}>Cancel</Button><Button disabled={busy || !title.trim()} onClick={()=>void save(false)}>{busy?'Checking…':'Save this day'}</Button></div>
    </DialogContent></Dialog></>;
}