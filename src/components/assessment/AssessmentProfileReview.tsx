import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnthropometricsStep } from "@/components/onboarding/steps/AnthropometricsStep";
import { EquipmentStep } from "@/components/onboarding/steps/EquipmentStep";
import { CategoryGoalsStep } from "@/components/onboarding/steps/CategoryGoalsStep";
import { AssessmentPlanInputs } from './AssessmentPlanInputs';
import { StartingPointForm } from '@/components/hammer/StartingPointForm';
import { FinishProfileDialog } from '@/components/hammer/FinishProfileFlow';
import type { DraftFlush, RegisterDraftFlush } from "@/lib/assessment/draftFlush";
type Profile = { full_name: string; position: string };
type Section = "body" | "equipment" | "goals" | "planning" | "starting";
/** Existing self-scoped answer forms, not assessment-only copies. */
export function AssessmentProfileReview({ profile, onChange, registerFlush, detailsOnly = false }: { profile: Profile; onChange: (profile: Profile) => void; registerFlush?: RegisterDraftFlush; detailsOnly?: boolean }) {
  const [section, setSection] = useState<Section | null>(null);
  const [neededOpen,setNeededOpen]=useState(false);
  const childFlush = useRef<DraftFlush | null>(null);
  const registerChild: RegisterDraftFlush = flush => { childFlush.current = flush; registerFlush?.(flush); };
  const back = () => { void (async () => { if (!childFlush.current || await childFlush.current()) setSection(null); })(); };
  const savedBack = () => setSection(null);
  if (section) return <div className="space-y-5">
    <Button variant="ghost" onClick={back}><ArrowLeft className="mr-2 h-4 w-4" />Profile check</Button>
    {section === "body" && <AnthropometricsStep onContinue={savedBack} onBack={back} registerFlush={registerChild} />}
    {section === "equipment" && <EquipmentStep onContinue={back} onBack={back} registerFlush={registerChild} />}
    {section === "goals" && <CategoryGoalsStep embedded onContinue={savedBack} onBack={back} registerFlush={registerChild} />}
    {section === "planning" && <AssessmentPlanInputs onBack={savedBack} registerFlush={registerChild} />}
    {section === "starting" && <StartingPointForm rebuild={false} onSaved={savedBack} />}
  </div>;
  return <div className="space-y-5">
    <StillNeeded />
    <Button className="w-full" onClick={()=>setNeededOpen(true)}>Finish needed details</Button>
    <FinishProfileDialog open={neededOpen} onOpenChange={setNeededOpen} started={false}/>
    <p className="text-sm font-medium">Optional — helps personalize</p>
    {!detailsOnly && (["full_name", "position"] as const).map(key => <div key={key} className="space-y-2">
      <Label htmlFor={`assessment-${key}`}>{key === "full_name" ? "Your name" : "Position"}</Label>
      <Input id={`assessment-${key}`} value={profile[key]} onChange={e => onChange({ ...profile, [key]: e.target.value })} />
    </div>)}
    <div className="divide-y divide-border border-y border-border">
      {([["body", "Body measurements"], ["equipment", "Equipment"], ["goals", "Your goals"], ["planning", "Training, nutrition & health"], ["starting", "Where are you starting from?"]] as const).map(([key, label]) => <Button key={key} variant="ghost" className="h-14 w-full justify-between rounded-none" onClick={() => setSection(key)}>{label}<ChevronRight className="h-4 w-4" /></Button>)}
    </div>
  </div>;
}
/** Owner Nov 2 #5: the same start check Hammers Today uses, so an answer saved here is never asked again at Start. */
function StillNeeded() {
  const q = useQuery({ queryKey: ["start-readiness", "assessment"], queryFn: async () => {
    const { data, error } = await supabase.rpc("initial_plan_missing");
    if (error) throw error;
    return (Array.isArray(data) ? data : []) as { key: string; label: string }[];
  } });
  if (!q.data) return null;
  const items = q.data.filter(i => (i as {required?:boolean}).required !== false);
  if (!items.length) return <p className="text-sm text-muted-foreground">Everything your plan needs is saved.</p>;
  return <div className="rounded-md border border-border p-3 text-sm"><p className="font-medium">Still needed for your plan ({items.length})</p><p className="text-muted-foreground">{items.map(i => i.label).join(" · ")}</p><p className="text-xs text-muted-foreground">Open the sections below and save. Anything saved here counts on Hammers Today.</p></div>;
}
