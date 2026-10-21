import { useState } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnthropometricsStep } from "@/components/onboarding/steps/AnthropometricsStep";
import { EquipmentStep } from "@/components/onboarding/steps/EquipmentStep";
import { CategoryGoalsStep } from "@/components/onboarding/steps/CategoryGoalsStep";
type Profile = { full_name: string; position: string };
type Section = "body" | "equipment" | "goals";
/** Existing self-scoped answer forms, not assessment-only copies. */
export function AssessmentProfileReview({ profile, onChange }: { profile: Profile; onChange: (profile: Profile) => void }) {
  const [section, setSection] = useState<Section | null>(null);
  const back = () => setSection(null);
  if (section) return <div className="space-y-5">
    <Button variant="ghost" onClick={back}><ArrowLeft className="mr-2 h-4 w-4" />Profile check</Button>
    {section === "body" && <AnthropometricsStep onContinue={back} onBack={back} />}
    {section === "equipment" && <EquipmentStep onContinue={back} onBack={back} />}
    {section === "goals" && <CategoryGoalsStep embedded onContinue={back} onBack={back} />}
  </div>;
  return <div className="space-y-5">
    {(["full_name", "position"] as const).map(key => <div key={key} className="space-y-2">
      <Label htmlFor={`assessment-${key}`}>{key === "full_name" ? "Your name" : "Position"}</Label>
      <Input id={`assessment-${key}`} value={profile[key]} onChange={e => onChange({ ...profile, [key]: e.target.value })} />
    </div>)}
    <div className="divide-y divide-border border-y border-border">
      {([["body", "Body measurements"], ["goals", "Your goals"]] as const).map(([key, label]) => <Button key={key} variant="ghost" className="h-14 w-full justify-between rounded-none" onClick={() => setSection(key)}>{label}<ChevronRight className="h-4 w-4" /></Button>)}
    </div>
  </div>;
}