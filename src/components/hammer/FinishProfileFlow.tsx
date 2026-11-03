/**
 * Owner Nov 2 — ONE guided "Finish your profile" flow.
 * Walks only the details the canonical `initial_plan_missing` judge lists,
 * one screen at a time, each with its own exact field. Every answer saves
 * through the same canonical writers used elsewhere, then the list refetches
 * (and, once started, the plan re-levels). Missing details never block a
 * started player's plan; this only fills them in.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, ClipboardList, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { persistContextAnswer } from "@/lib/hammer/context/acquisition";
import { CompetitionLevelPicker } from "@/components/shared/CompetitionLevelPicker";
import { PitcherRoleQuestions } from "@/components/hammer/pitching/PitcherRoleQuestions";
import { PhysioHealthIntakeDialog } from "@/components/physio/PhysioHealthIntakeDialog";
import { CategoryGoalsCard } from "@/components/settings/CategoryGoalsCard";
import { StartingPointForm } from "@/components/hammer/StartingPointForm";
import { useSubscription } from '@/hooks/useSubscription';
import { saveStartingPoint } from '@/hooks/useStartingPoint';
import { programOf, type Sport } from '../../../supabase/functions/_shared/wic/progression/startingPoint';
import { REQUIRED_PLAN_QUESTIONS } from '../../../supabase/functions/_shared/startReadiness';
import { recordPain } from '@/lib/hammer/injury/recordPain';
import { REPORT_INJURY_REGIONS, type ReportInjuryRegionKey } from '@/lib/hammer/injury/reportInjury';
import { usePitcherSchedule } from '@/hooks/usePitcherSchedule';
import { suggestNutritionTargets, midpoint } from "@/lib/nutrition/targetSuggestions";
import { rebuildAfterChange } from "@/lib/hammer/rebuildAfterChange";
import { getTodayDate } from "@/utils/dateUtils";
import { profileFlowItems, minutesFor, type MissingItem } from "@/lib/hammer/finishProfile";

export const missingDetailsKey = (uid?: string) => ["start-readiness", uid];

export function useMissingDetails() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...missingDetailsKey(user?.id), "flow"],
    enabled: !!user?.id,
    staleTime: 5_000,
    queryFn: async (): Promise<MissingItem[]> => {
      const { data, error } = await supabase.rpc("initial_plan_missing");
      if (error) throw error;
      return Array.isArray(data) ? (data as unknown as MissingItem[]) : [];
    },
  });
}

/** Card at the top of Today for started players. Disappears when nothing is left. */
export function FinishProfileCard() {
  const q = useMissingDetails();
  const [open, setOpen] = useState(false);
  const items = profileFlowItems(q.data ?? [], true);
  if (!q.isSuccess || items.length === 0) return null;
  return (
    <>
      <Card className="border-primary/40 bg-primary/5" data-testid="finish-profile-card">
        <CardContent className="flex items-center gap-3 p-4">
          <ClipboardList className="h-6 w-6 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Finish your profile</p>
            <p className="text-sm text-muted-foreground">
              {items.length} detail{items.length === 1 ? "" : "s"} left — about {minutesFor(items.length)} min. Your plan gets more exact with each one.
            </p>
          </div>
          <Button onClick={() => setOpen(true)}>Finish<ChevronRight className="ml-1 h-4 w-4" /></Button>
        </CardContent>
      </Card>
      <FinishProfileDialog open={open} onOpenChange={setOpen} started />
    </>
  );
}

export function FinishProfileDialog({ open, onOpenChange, started, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; started: boolean; onDone?: () => void }) {
  const q = useMissingDetails();
  const qc = useQueryClient();
  const { user } = useAuth();
  const items = profileFlowItems(q.data ?? [], started).filter(item => started || item.required !== false);
  const [total, setTotal] = useState(0);
  const [skipped, setSkipped] = useState<string[]>([]);
  useEffect(() => { if (open) { setTotal(items.length); setSkipped([]); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const queue = items.filter((i) => !skipped.includes(i.key));
  const current = queue[0] ?? null;
  const needed = items.filter(item => item.required !== false);
  const neededTotal = Number((q.data?.[0] as MissingItem & { total_needed?: number } | undefined)?.total_needed ?? 9);
  const done = Math.max(0, neededTotal - (q.data ?? []).filter(item => item.required !== false).length);

  const afterSave = async () => {
    await qc.invalidateQueries({ queryKey: missingDetailsKey(user?.id) });
    await qc.invalidateQueries({ queryKey: ["season-status", user?.id] });
    // Re-level the plan with the new detail; never blocks the next step.
    if (started) void rebuildAfterChange("Profile detail added", getTodayDate()).then(() => qc.invalidateQueries({ queryKey: ["wk-rx"] }));
  };

  useEffect(() => {
    if (open && q.isSuccess && items.length === 0) { onOpenChange(false); onDone?.(); }
  }, [open, q.isSuccess, items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{current ? current.label : "All set"}</DialogTitle>
          <DialogDescription>
            {done} of {neededTotal} needed details done
          </DialogDescription>
        </DialogHeader>
        <Progress value={(done / neededTotal) * 100} className="h-2" />
        {!current && items.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm">You skipped {items.length} for now. You can finish them any time from this card.</p>
            <Button className="w-full" onClick={() => setSkipped([])}>Go back to them</Button>
            <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        )}
        {current && user && (
          <div className="space-y-4">
            <p className="text-sm font-medium">{current.required === false ? 'Optional — helps personalize' : 'Needed to build your plan'}</p>
            <StepEditor key={current.key} item={current} userId={user.id} onSaved={afterSave} />
            {current.required === false && <Button variant="ghost" className="w-full" onClick={() => setSkipped((s) => [...s, current.key])}>Skip for now</Button>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SaveButton({ busy, disabled, onClick }: { busy: boolean; disabled?: boolean; onClick: () => void }) {
  return <Button className="h-11 w-full" disabled={busy || disabled} onClick={onClick}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button>;
}

function useSaver(onSaved: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError(null);
    try { await fn(); await onSaved(); } catch (e) { setError(e instanceof Error ? e.message : "That didn't save. Check your connection and try again."); }
    finally { setBusy(false); }
  };
  return { busy, error, run };
}

const Err = ({ e }: { e: string | null }) => e ? <p role="alert" className="text-sm text-destructive">{e}</p> : null;

function StepEditor({ item, userId, onSaved }: { item: MissingItem; userId: string; onSaved: () => Promise<void> }) {
  const s = useSaver(onSaved);
  const [v, setV] = useState("");
  const [v2, setV2] = useState("");
  const ctx = useQuery({
    queryKey: ["finish-profile-ctx", userId],
    queryFn: async () => (await supabase.from("athlete_context").select("sport_primary, anthropometrics").eq("user_id", userId).maybeSingle()).data as { sport_primary?: string | null; anthropometrics?: Record<string, unknown> | null } | null,
  });
  const sport = ctx.data?.sport_primary === "softball" ? "softball" : "baseball";
  const ctxSave = (key: string, value: unknown) => s.run(() => persistContextAnswer(userId, key, value as never, "finish_profile"));

  switch (item.key) {
    case 'sport':
      return <div className="space-y-3"><div className="grid grid-cols-2 gap-2">{['baseball','softball'].map(value => <Button key={value} variant={v === value ? 'default' : 'outline'} onClick={() => setV(value)}>{value === 'baseball' ? 'Baseball' : 'Softball'}</Button>)}</div><Err e={s.error} /><SaveButton busy={s.busy} disabled={!v} onClick={() => ctxSave('sport_primary',v)} /></div>;
    case 'bats_throws':
      return <div className="space-y-3">{[['Bats',v,setV],['Throws',v2,setV2]].map(([label,value,setter]) => <div key={String(label)}><Label>{String(label)}</Label><div className="grid grid-cols-3 gap-2">{[['R','Right'],['L','Left'],['S','Both']].map(([key,text]) => <Button key={key} variant={value === key ? 'default' : 'outline'} onClick={() => (setter as (value:string)=>void)(key)}>{text}</Button>)}</div></div>)}<Err e={s.error}/><SaveButton busy={s.busy} disabled={!v || !v2} onClick={() => s.run(async () => { await persistContextAnswer(userId,'bats_hand',v,'finish_profile'); await persistContextAnswer(userId,'throws_hand',v2,'finish_profile'); })}/></div>;
    case "position":
      return <div className="space-y-3"><Label htmlFor="fp-position">Main position</Label>
        <select id="fp-position" className="h-11 w-full rounded-md border border-input bg-background px-2" value={v} onChange={(e) => setV(e.target.value)}>
          <option value="">Choose</option>{["P", "C", "1B", "2B", "SS", "3B", "LF", "CF", "RF", "UTIL"].map((p) => <option key={p} value={p}>{p}</option>)}
        </select><Err e={s.error} /><SaveButton busy={s.busy} disabled={!v} onClick={() => ctxSave("position_primary", v)} /></div>;
    case "level":
      return <div className="space-y-3"><CompetitionLevelPicker sport={sport} value={v} onChange={(x) => setV(typeof x === "string" ? x : x.level)} /><Err e={s.error} /><SaveButton busy={s.busy} disabled={!v} onClick={() => ctxSave("competition_level", v)} /></div>;
    case "bats":
    case "throws": {
      const key = item.key === "bats" ? "bats_hand" : "throws_hand";
      return <div className="space-y-3"><div className="grid grid-cols-3 gap-2">{[["R", "Right"], ["L", "Left"], ["S", "Both"]].map(([k, l]) =>
        <Button key={k} variant={v === k ? "default" : "outline"} onClick={() => setV(k)}>{l}</Button>)}</div><Err e={s.error} /><SaveButton busy={s.busy} disabled={!v} onClick={() => ctxSave(key, v)} /></div>;
    }
    case "sleep":
    case "lifting": {
      const key = item.key === "sleep" ? "sleep_target_hrs" : "lifting_age_years";
      const n = Number(v);
      const ok = v.trim() !== "" && Number.isFinite(n) && (item.key === "sleep" ? n > 0 && n <= 24 : n >= 0 && n <= 40);
      return <div className="space-y-3"><Label htmlFor="fp-num">{item.key === "sleep" ? "Hours a night" : "Years (0 if never)"}</Label>
        <Input id="fp-num" type="number" inputMode="decimal" min="0" value={v} onChange={(e) => setV(e.target.value)} autoFocus /><Err e={s.error} />
        <SaveButton busy={s.busy} disabled={!ok} onClick={() => ctxSave(key, n)} /></div>;
    }
    case "height":
    case "weight": {
      const isH = item.key === "height";
      const n = isH ? Number(v || 0) * 12 + Number(v2 || 0) : Number(v);
      const ok = isH ? n >= 36 && n <= 96 : n >= 50 && n <= 450;
      return <div className="space-y-3">
        {isH ? <div className="grid grid-cols-2 gap-2"><div><Label htmlFor="fp-ft">Feet</Label><Input id="fp-ft" type="number" value={v} onChange={(e) => setV(e.target.value)} autoFocus /></div><div><Label htmlFor="fp-in">Inches</Label><Input id="fp-in" type="number" value={v2} onChange={(e) => setV2(e.target.value)} /></div></div>
          : <div><Label htmlFor="fp-lb">Pounds</Label><Input id="fp-lb" type="number" value={v} onChange={(e) => setV(e.target.value)} autoFocus /></div>}
        <Err e={s.error} />
        <SaveButton busy={s.busy} disabled={!ok || !ctx.isSuccess} onClick={() => ctxSave("anthropometrics", { ...(ctx.data?.anthropometrics ?? {}), [isH ? "height_in" : "weight_lb"]: n })} /></div>;
    }
    case "season":
      return <div className="space-y-3"><div className="grid grid-cols-2 gap-2">{[["off_season", "Off-season"], ["preseason", "Pre-season"], ["in_season", "In-season"], ["post_season", "Post-season"]].map(([k, l]) =>
        <Button key={k} variant={v === k ? "default" : "outline"} onClick={() => setV(k)}>{l}</Button>)}</div><Err e={s.error} />
        <SaveButton busy={s.busy} disabled={!v} onClick={() => s.run(async () => {
          await persistContextAnswer(userId, 'season_phase', v, 'finish_profile');
        })} /></div>;
    case "season_dates":
      return <div className="space-y-3">
        <p className="text-sm text-muted-foreground">When does your season start and end? If you don't know yet, that's fine.</p>
        <div className="grid grid-cols-2 gap-2"><div><Label htmlFor="fp-ss">Season starts</Label><Input id="fp-ss" type="date" value={v} onChange={(e) => setV(e.target.value)} /></div><div><Label htmlFor="fp-se">Season ends</Label><Input id="fp-se" type="date" value={v2} onChange={(e) => setV2(e.target.value)} /></div></div>
        <Err e={s.error} />
        <SaveButton busy={s.busy} disabled={!(v && v2 && v2 >= v)} onClick={() => s.run(() => saveSeasonDates(userId, sport, v, v2))} />
        <Button variant="outline" className="w-full" disabled={s.busy} onClick={() => s.run(() => saveSeasonDates(userId, sport, null, null))}>Not known yet</Button></div>;
    case "calorie_goal": case "protein_goal": case "carbs_goal": case "fats_goal": case "hydration_goal":
      return <NutritionStep userId={userId} onSaved={onSaved} />;
    case "pitching_role":
      return <PitchingRoleStep onSaved={onSaved}/>;
    case "pitcher_focus":
      return <div className="space-y-3"><PitcherRoleQuestions compact /><Button className="w-full" onClick={() => void onSaved()}>Done</Button></div>;
    case "health":
      return <CurrentPainStep userId={userId} onSaved={onSaved} />;
    case "goals": case "ranking":
      return <div className="space-y-3"><CategoryGoalsCard /><Button className="w-full" onClick={() => void onSaved()}>Done</Button></div>;
    case "starting_point":
      return <StartingChoiceStep userId={userId} sport={sport} onSaved={onSaved} />;
    default:
      // Full screens (equipment, assessment, sport) open their exact page.
      return <div className="space-y-3"><p className="text-sm text-muted-foreground">This one has its own screen. It opens right where you need it.</p>
        <Button asChild className="h-11 w-full"><Link to={item.key === "equipment" ? "/onboarding/athlete?edit=equipment" : item.key === "sport" ? "/onboarding/athlete?edit=profile" : item.to}>Open</Link></Button></div>;
  }
}

function PitchingRoleStep({onSaved}:{onSaved:()=>Promise<void>}) {
  const schedule=usePitcherSchedule();
  const s=useSaver(onSaved);
  return <div className="space-y-3"><p className="text-sm text-muted-foreground">Choose your usual pitching role. You can change it later.</p>{[['starter','Starter'],['bullpen','Bullpen arm'],['closer','Closer']].map(([role,label])=><Button key={role} className="w-full" disabled={s.busy||schedule.isLoading} variant="outline" onClick={()=>s.run(async()=>{await schedule.saveSettings.mutateAsync({pitching_role:role as 'starter'|'bullpen'|'closer'});})}>{label}</Button>)}<Err e={s.error}/></div>;
}

function StartingChoiceStep({ userId, sport, onSaved }: {userId:string; sport:Sport; onSaved:()=>Promise<void>}) {
  const {modules}=useSubscription();
  const s=useSaver(onSaved);
  const [value,setValue]=useState('');
  const program=programOf(sport,modules ?? []);
  return <div className="space-y-3"><p className="text-sm text-muted-foreground">Choose what fits today. You can add details later.</p>{['Right now','1–2 weeks ago','3–6 weeks ago','2–6 months ago','6+ months ago','Never','Easing back in'].map(option => <Button key={option} className="w-full" variant={value===option?'default':'outline'} onClick={()=>setValue(option)}>{option==='Right now'?'Training regularly now':option==='Never'?'New to training':option}</Button>)}<Err e={s.error}/><SaveButton busy={s.busy} disabled={!value || !program} onClick={()=>s.run(async()=>{if(!program)throw new Error('Your program could not be checked. Reload and try again.');const prior=await supabase.from('athlete_starting_points').select('answers').eq('user_id',userId).eq('sport',sport).maybeSingle();if(prior.error)throw prior.error;const error=await saveStartingPoint(userId,sport,program,{...((prior.data?.answers as Record<string,string>)??{}),last_trained:value});if(error)throw new Error(error);})}/></div>;
}

function CurrentPainStep({userId,onSaved}:{userId:string;onSaved:()=>Promise<void>}) {
  const s=useSaver(onSaved); const qc=useQueryClient();
  const [answer,setAnswer]=useState<boolean|null>(null);
  const [area,setArea]=useState<ReportInjuryRegionKey|null>(null);
  return <div className="space-y-3"><p className="text-sm text-muted-foreground">Tell us about pain today. This never clears an existing injury or medical restriction.</p><div className="grid grid-cols-2 gap-2">{[false,true].map(value=><Button key={String(value)} variant={answer===value?'default':'outline'} onClick={()=>setAnswer(value)}>{value?'Yes':'No'}</Button>)}</div>{answer===true && <><Label>Where?</Label><div className="flex flex-wrap gap-2">{REPORT_INJURY_REGIONS.map(region=><Button key={region.key} size="sm" variant={area===region.key?'default':'outline'} onClick={()=>setArea(region.key)}>{region.label}</Button>)}</div></>}<Err e={s.error}/><SaveButton busy={s.busy} disabled={answer===null || (answer && !area)} onClick={()=>s.run(async()=>{if(answer && area)await recordPain({userId,region:area,severity:'limiting',origin:'onboarding',date:getTodayDate(),queryClient:qc});const result=await supabase.from('physio_health_profiles').upsert({user_id:userId,current_pain_answer:answer,current_pain_area:answer?area:null,current_pain_reviewed_at:new Date().toISOString()},{onConflict:'user_id'}).select('current_pain_answer').single();if(result.error || result.data.current_pain_answer!==answer)throw new Error('Your answer did not save. Try again.');})}/></div>;
}

async function saveSeasonDates(userId: string, sport: string, start: string | null, end: string | null) {
  if (start && end) {
    const r = await supabase.from("athlete_mpi_settings").upsert({ user_id: userId, sport, in_season_start_date: start, in_season_end_date: end } as never, { onConflict: "user_id" }).select("in_season_start_date").single();
    if (r.error) throw new Error("Dates didn't save. Try again.");
  }
  const prior = await supabase.from("initial_assessments").select("initial_input_answers").eq("user_id", userId).maybeSingle();
  const answers = { ...((prior.data?.initial_input_answers as Record<string, unknown> | null) ?? {}), season_dates_reviewed: true, season_dates_unknown: !start, reviewed_at: new Date().toISOString() };
  const w = await supabase.from("initial_assessments").upsert({ user_id: userId, initial_input_answers: answers } as never).select("initial_input_answers").single();
  if (w.error) throw new Error("That didn't save. Try again.");
}

function HealthStep({ onSaved }: { onSaved: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  return <div className="space-y-3"><p className="text-sm text-muted-foreground">A few quick health questions so your plan stays safe.</p>
    <Button className="h-11 w-full" onClick={() => setOpen(true)}>Answer health questions</Button>
    <PhysioHealthIntakeDialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) void onSaved(); }} /></div>;
}

const NUTRI = [["calorie_goal", "Daily calories (kcal)"], ["protein_goal", "Protein (g)"], ["carbs_goal", "Carbs (g)"], ["fats_goal", "Fat (g)"], ["hydration_goal", "Water (oz)"]] as const;

function NutritionStep({ userId, onSaved }: { userId: string; onSaved: () => Promise<void> }) {
  const s = useSaver(onSaved);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [note, setNote] = useState<string | null>(null);
  const facts = useQuery({
    queryKey: ["finish-profile-nutri", userId],
    queryFn: async () => {
      const [c, p] = await Promise.all([
        supabase.from("athlete_context").select("anthropometrics").eq("user_id", userId).maybeSingle(),
        supabase.from("profiles").select("date_of_birth").eq("id", userId).maybeSingle(),
      ]);
      const a = ((c.data as any)?.anthropometrics ?? {}) as Record<string, unknown>;
      const dob = (p.data as any)?.date_of_birth ? Date.parse(String((p.data as any).date_of_birth)) : NaN;
      return { w: typeof a.weight_lb === "number" ? a.weight_lb : null, h: typeof a.height_in === "number" ? a.height_in : null, age: Number.isFinite(dob) ? Math.floor((Date.now() - dob) / 31_557_600_000) : null };
    },
  });
  const all = useMemo(() => NUTRI.every(([k]) => vals[k]?.trim() && Number(vals[k]) >= 0), [vals]);
  const suggest = () => {
    const f = facts.data;
    const r = suggestNutritionTargets({ weightLbs: f?.w ?? null, heightInches: f?.h ?? null, age: f?.age ?? null, sex: null, activityLevel: "very_active", goalType: null, dayType: "training" });
    if (r.ok === false) { setNote((r as { reason: string }).reason); return; }
    setVals({ calorie_goal: r.calories ? String(midpoint(r.calories)) : "", protein_goal: String(midpoint(r.protein)), carbs_goal: String(midpoint(r.carbs)), fats_goal: String(midpoint(r.fats)), hydration_goal: String(midpoint(r.hydration)) });
    setNote(["These are suggestions — change any number before you save.", ...r.notes].join(" "));
  };
  return <div className="space-y-3">
    <Button variant="outline" className="w-full" onClick={suggest} disabled={!facts.isSuccess}>Not sure? Get suggestions</Button>
    {note && <p className="text-xs text-muted-foreground">{note}</p>}
    {NUTRI.map(([k, l]) => <div key={k}><Label htmlFor={`fp-${k}`}>{l}</Label><Input id={`fp-${k}`} type="number" min="0" value={vals[k] ?? ""} onChange={(e) => setVals((p) => ({ ...p, [k]: e.target.value }))} /></div>)}
    <Err e={s.error} />
    <SaveButton busy={s.busy} disabled={!all} onClick={() => s.run(async () => {
      const payload = Object.fromEntries(NUTRI.map(([k]) => [k, Number(vals[k])]));
      const r = await supabase.from("vault_nutrition_goals").upsert({ user_id: userId, ...payload, updated_at: new Date().toISOString() } as never, { onConflict: "user_id" }).select("*").single();
      if (r.error || NUTRI.some(([k]) => Number((r.data as any)?.[k]) !== payload[k])) throw new Error("Nutrition didn't save. Try again.");
    })} />
  </div>;
}
