import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { usePhysioProfile } from '@/hooks/usePhysioProfile';
import { useAthleteGoals } from '@/hooks/useAthleteGoals';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { suggestNutritionTargets, midpoint } from '@/lib/nutrition/targetSuggestions';
import { enteredTargets, healthNutritionGoals, safeNutritionGoal } from '@/lib/nutrition/healthSetup';
import { recordPain } from '@/lib/hammer/injury/recordPain';
import { REPORT_INJURY_REGIONS, type ReportInjuryRegionKey } from '@/lib/hammer/injury/reportInjury';
import { getTodayDate } from '@/utils/dateUtils';

const TARGETS = [['calorie_goal','Calories (kcal)'],['protein_goal','Protein (g)'],['carbs_goal','Carbs (g)'],['fats_goal','Fat (g)'],['hydration_goal','Water (oz)']] as const;
const split = (s:string) => s.split(',').map(v=>v.trim()).filter(Boolean);
/** One shared health setup, with optional suggestions rather than recalled targets. */
export function PhysioHealthIntakeDialog({open,onOpenChange,isEditMode=false}:{open:boolean;onOpenChange:(v:boolean)=>void;isEditMode?:boolean}) {
  const {user}=useAuth(); const qc=useQueryClient();
  const {profile,computedAge,saveProfile,isLoading}=usePhysioProfile();
  const {activeGoal,createGoal,updateGoal,loading:goalLoading}=useAthleteGoals();
  const [step,setStep]=useState(0); const [busy,setBusy]=useState(false); const [error,setError]=useState<string|null>(null);
  const [goal,setGoal]=useState(''); const [foods,setFoods]=useState(''); const [allergies,setAllergies]=useState(''); const [meals,setMeals]=useState('');
  const [meds,setMeds]=useState(''); const [pastArea,setPastArea]=useState(''); const [pastNote,setPastNote]=useState('');
  const [pain,setPain]=useState<boolean|null>(null); const [area,setArea]=useState<ReportInjuryRegionKey|null>(null); const [painDirty,setPainDirty]=useState(false);
  const [targets,setTargets]=useState<Record<string,string>>({}); const [suggested,setSuggested]=useState(false); const [note,setNote]=useState('');
  const facts=useQuery({queryKey:['health-setup-facts',user?.id],enabled:open&&!!user,queryFn:async()=>{
    if(!user)throw new Error('Sign in first');
    const [c,p,n,e]=await Promise.all([
      supabase.from('athlete_context').select('anthropometrics').eq('user_id',user.id).maybeSingle(),
      supabase.from('profiles').select('sex,activity_level').eq('id',user.id).maybeSingle(),
      supabase.from('vault_nutrition_goals').select('*').eq('user_id',user.id).maybeSingle(),
      supabase.from('athlete_events').select('event_type').eq('user_id',user.id).eq('event_date',getTodayDate()).limit(1).maybeSingle(),
    ]);
    for(const r of [c,p,n,e])if(r.error)throw r.error;
    return {body:c.data?.anthropometrics as Record<string,unknown>|null,profile:p.data,nutrition:n.data,day:e.data?.event_type};
  }});
  useEffect(()=>{if(!open)return;setStep(0);setError(null);setSuggested(false);setPainDirty(false);setPastArea('');setPastNote('');},[open]);
  useEffect(()=>{if(!open||isLoading||goalLoading)return;
    setGoal(safeNutritionGoal(activeGoal?.goalType??null,computedAge)??'');
    setFoods((profile?.food_intolerances??[]).join(', '));setAllergies((profile?.allergies??[]).join(', '));setMeals(profile?.meals_per_day?String(profile.meals_per_day):'');
    setMeds((profile?.medications??[]).join(', '));setPain(profile?.current_pain_answer??null);setArea((profile?.current_pain_area??null) as ReportInjuryRegionKey|null);
  },[open,isLoading,goalLoading,profile,activeGoal?.id,computedAge]);
  const suggest=()=>{
    const f=facts.data; const b=f?.body;
    const r=suggestNutritionTargets({weightLbs:typeof b?.weight_lb==='number'?b.weight_lb:null,heightInches:typeof b?.height_in==='number'?b.height_in:null,age:computedAge,sex:f?.profile?.sex==='male'||f?.profile?.sex==='female'?f.profile.sex:null,activityLevel:f?.profile?.activity_level as any,goalType:safeNutritionGoal(goal,computedAge),dayType:f?.day as any});
    if(r.ok === false){setNote(r.reason);return;}
    setTargets({...(r.calories?{calorie_goal:String(midpoint(r.calories))}:{}),protein_goal:String(midpoint(r.protein)),carbs_goal:String(midpoint(r.carbs)),fats_goal:String(midpoint(r.fats)),hydration_goal:String(midpoint(r.hydration))});setSuggested(true);
    setNote(computedAge===null||computedAge<18?'Eat enough to grow and train. Check these optional amounts with a parent or dietitian.':'These are optional suggestions. Change any amount before saving.');
  };
  const save=async()=>{
    if(!user||busy||!facts.isSuccess||isLoading||goalLoading)return;
    setBusy(true);setError(null);
    try{
      if(pain===null || (pain&&!area))throw new Error('Answer whether anything hurts, and choose an area if yes.');
      if(meals && (!Number.isInteger(Number(meals))||Number(meals)<1))throw new Error('Enter a whole number of meals, or choose Not sure.');
      if(pain && area && painDirty)await recordPain({userId:user.id,region:area,severity:'limiting',origin:'onboarding',date:getTodayDate(),queryClient:qc});
      const saved=await saveProfile({allergies:split(allergies),food_intolerances:split(foods),medications:split(meds),meals_per_day:meals?Number(meals):null,setup_completed:true,...(painDirty||profile?.current_pain_answer==null?{current_pain_answer:pain,current_pain_area:pain?area:null,current_pain_reviewed_at:new Date().toISOString()}:{}),...(pastArea||pastNote?{injury_history:[...(profile?.injury_history??[]),[pastArea,pastNote].filter(Boolean).join(': ')]}: {})});
      if(!saved.success)throw new Error(saved.error??'Health answers did not save.');
      const chosen=safeNutritionGoal(goal,computedAge);
      if(chosen&&chosen!==activeGoal?.goalType){
        const ok=activeGoal?await updateGoal(activeGoal.id,{goalType:chosen}):await createGoal({goalType:chosen});
        if(!ok)throw new Error('Health saved, but your food goal did not. Try again.');
      }
      if(suggested){const payload=enteredTargets(targets);if(Object.keys(payload).length){
        const r=await supabase.from('vault_nutrition_goals').upsert({user_id:user.id,...payload,updated_at:new Date().toISOString()},{onConflict:'user_id'}).select('*').single();
        if(r.error||!r.data||Object.entries(payload).some(([k,v])=>(r.data as any)[k]!==v))throw new Error('Health saved, but the suggested amounts did not. Try again.');
      }}
      for(const key of ['start-readiness','assessment-plan-inputs','nutritionGoals','vault-nutrition-goals','health-setup-facts','onboarding-answer-status'])await qc.invalidateQueries({queryKey:[key]});
      onOpenChange(false);
    }catch(e){setError(e instanceof Error?e.message:'Your answers did not save. Try again.');}finally{setBusy(false);}
  };
  const titles=['Your food goal','Foods to avoid','Meals each day','Optional food & water suggestions','Anything hurt right now?','Past injuries','Medicines you take'];
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{titles[step]}</DialogTitle><DialogDescription>{step===4?'Needed to build your plan':'Optional — helps personalize'} · {step+1} of {titles.length}</DialogDescription></DialogHeader>
    {isLoading||goalLoading||facts.isPending?<p role="status">Loading your saved answers…</p>:facts.isError?<p role="alert">Could not load your answers. Close and try again.</p>:<>
    {step===0&&<div className="space-y-3"><p className="text-sm text-muted-foreground">{computedAge===null||computedAge<18?'Fuel your growth and your training. No weight-loss goals here.':'Choose what you want your food to support.'}</p>{healthNutritionGoals(computedAge).map(g=><Button className="w-full" variant={goal===g.value?'default':'outline'} key={g.value} onClick={()=>setGoal(g.value)}>{g.label}</Button>)}<Button variant="ghost" onClick={()=>setGoal('')}>Not sure</Button></div>}
    {step===1&&<div className="space-y-3"><p className="text-sm text-muted-foreground">Leave blank if you have none or aren't sure.</p><Label htmlFor="health-foods">Foods you avoid</Label><Input id="health-foods" value={foods} onChange={e=>setFoods(e.target.value)} placeholder="Dairy, gluten, meat…"/><Label htmlFor="health-allergies">Food allergies</Label><Input id="health-allergies" value={allergies} onChange={e=>setAllergies(e.target.value)} placeholder="Peanuts, shellfish…"/><Button variant="ghost" onClick={()=>{setFoods('');setAllergies('');}}>Not sure</Button></div>}
    {step===2&&<div className="space-y-3"><p className="text-sm text-muted-foreground">About how many meals do you usually eat? No tracking needed.</p><Input aria-label="Meals per day" inputMode="numeric" type="number" min="1" value={meals} onChange={e=>setMeals(e.target.value)}/><Button variant="ghost" onClick={()=>setMeals('')}>Not sure</Button></div>}
    {step===3&&<div className="space-y-3"><p className="text-sm text-muted-foreground">You don't need to know any numbers. Suggestions use your saved weight, food goal and training.</p><Button variant="outline" onClick={suggest}>Get suggestions</Button>{note&&<p className="text-sm text-muted-foreground">{note}</p>}{suggested&&TARGETS.filter(([k])=>targets[k]!==undefined).map(([k,l])=><div key={k}><Label htmlFor={`health-${k}`}>{l} · optional</Label><Input id={`health-${k}`} type="number" min="0" value={targets[k]} onChange={e=>setTargets(v=>({...v,[k]:e.target.value}))}/></div>)}<Button variant="ghost" onClick={()=>{setSuggested(false);setTargets({});}}>Not now</Button></div>}
    {step===4&&<div className="space-y-3"><p className="text-sm text-muted-foreground">This never clears an existing injury or medical restriction.</p>{profile?.current_pain_answer!==null&&profile?.current_pain_answer!==undefined&&!painDirty?<><p>Saved answer: {pain?`Yes — ${area??'area not saved'}`:'No'}</p><Button variant="outline" onClick={()=>setPainDirty(true)}>Change</Button></>:<><div className="grid grid-cols-2 gap-2">{[false,true].map(v=><Button key={String(v)} variant={pain===v?'default':'outline'} onClick={()=>{setPain(v);setPainDirty(true);}}>{v?'Yes':'No'}</Button>)}</div>{pain&&<div className="flex flex-wrap gap-2">{REPORT_INJURY_REGIONS.map(r=><Button size="sm" key={r.key} variant={area===r.key?'default':'outline'} onClick={()=>setArea(r.key)}>{r.label}</Button>)}</div>}<p className="text-sm text-muted-foreground">Not sure? Tell a parent or coach. If you feel pain, choose Yes.</p></>}</div>}
    {step===5&&<div className="space-y-3"><p className="text-sm text-muted-foreground">Past injuries stay in your history. They never clear current pain.</p>{profile?.injury_history?.length>0&&<p className="text-sm">Saved: {profile.injury_history.join(' · ')}</p>}<Label htmlFor="health-past-area">Area · optional</Label><select id="health-past-area" className="h-11 w-full rounded-md border border-input bg-background" value={pastArea} onChange={e=>setPastArea(e.target.value)}><option value="">Not sure / none</option>{REPORT_INJURY_REGIONS.map(r=><option value={r.key} key={r.key}>{r.label}</option>)}</select><Input aria-label="Past injury note" value={pastNote} onChange={e=>setPastNote(e.target.value)} placeholder="For example, an ankle sprain last year"/></div>}
    {step===6&&<div className="space-y-3"><p className="text-sm text-muted-foreground">Optional. Write the name if you know it; don't change medicine based on this app.</p><Label htmlFor="health-meds">Medicines</Label><Input id="health-meds" value={meds} onChange={e=>setMeds(e.target.value)} placeholder="Albuterol inhaler, cetirizine, ibuprofen…"/><Button variant="ghost" onClick={()=>setMeds('')}>Not sure</Button></div>}
    {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex gap-2">{step>0&&<Button variant="outline" disabled={busy} onClick={()=>setStep(v=>v-1)}>Back</Button>}{step<6?<Button className="flex-1" disabled={step===4&&(pain===null||(pain&&!area))} onClick={()=>setStep(v=>v+1)}>Next</Button>:<Button className="flex-1" disabled={busy} onClick={save}>{busy?'Saving…':isEditMode?'Save changes':'Save health setup'}</Button>}</div></>}
  </DialogContent></Dialog>;
}
