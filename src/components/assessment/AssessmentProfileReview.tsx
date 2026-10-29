import { useRef, useState } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnthropometricsStep } from "@/components/onboarding/steps/AnthropometricsStep";
import { EquipmentStep } from "@/components/onboarding/steps/EquipmentStep";
import { CategoryGoalsStep } from "@/components/onboarding/steps/CategoryGoalsStep";
import { AssessmentPlanInputs } from './AssessmentPlanInputs';
import type { DraftFlush, RegisterDraftFlush } from "@/lib/assessment/draftFlush";
type Profile = { full_name: string; position: string };
type Section = "body" | "equipment" | "goals" | "planning";
/** Existing self-scoped answer forms, not assessment-only copies. */
export function AssessmentProfileReview({ profile, onChange, registerFlush }: { profile: Profile; onChange: (profile: Profile) => void; registerFlush?: RegisterDraftFlush }) {
  const [section, setSection] = useState<Section | null>(null);
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
  </div>;
  return <div className="space-y-5">
    {(["full_name", "position"] as const).map(key => <div key={key} className="space-y-2">
      <Label htmlFor={`assessment-${key}`}>{key === "full_name" ? "Your name" : "Position"}</Label>
      <Input id={`assessment-${key}`} value={profile[key]} onChange={e => onChange({ ...profile, [key]: e.target.value })} />
    </div>)}
    <div className="divide-y divide-border border-y border-border">
      {([["body", "Body measurements"], ["equipment", "Equipment"], ["goals", "Your goals"], ["planning", "Training, nutrition & health"]] as const).map(([key, label]) => <Button key={key} variant="ghost" className="h-14 w-full justify-between rounded-none" onClick={() => setSection(key)}>{label}<ChevronRight className="h-4 w-4" /></Button>)}
    </div>
  </div>;
}