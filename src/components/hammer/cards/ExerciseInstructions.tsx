import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { MovementGuide } from "@/lib/hammer/prescription/movementGuide";
import { activityBasics } from "./ActivityBasics";

/** The movement's existing guide, shown inline; never invents or changes a dose. */
export function ExerciseInstructions({ name, slug, guideOverride, setup, cue, stopIf, dosage, why, changes, repair, expanded = false }: {
  name: string; slug?: string | null; guideOverride?: MovementGuide | null;
  setup?: string | null; cue?: string | null; stopIf?: string | null; dosage?: string | null;
  expanded?: boolean; why?: string | null; changes?: ReadonlyArray<string>; repair?: (t: string) => string;
}) {
  const R = (t: string | null | undefined) => (t && repair ? repair(t) : t);
  const [open, setOpen] = useState(false);
  const resolved = activityBasics({ name, slug, setup, cue, stopIf, dosage });
  const guide = guideOverride ?? resolved.guide;
  const fallback = guide ? null : resolved.fallback;
  const steps = guide?.goodRep ?? fallback?.steps ?? [];
  const content = <>

      <p className="text-muted-foreground"><span className="font-medium text-foreground">Setup: </span>{R(setup ?? guide?.setup ?? fallback?.setup)}</p>
      {steps.length > 0 && <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">{steps.map((step, i) => <li key={i}>{R(step)}</li>)}</ol>}
      {(cue || guide?.feel) && <p className="text-muted-foreground"><span className="font-medium text-foreground">Cue: </span>{R(cue ?? guide?.feel)}</p>}
      <p className="text-muted-foreground"><span className="font-medium text-foreground">Stop if: </span>{stopIf ?? guide?.stopIf ?? fallback?.stopIf ?? "You feel pain."}</p>
      {(why || guide?.whyToday) && <p data-why-movement className="text-muted-foreground"><span className="font-medium text-foreground">Why this movement: </span>{R(why || guide?.whyToday)}</p>}
      <p data-why-changed className="text-muted-foreground"><span className="font-medium text-foreground">Why today's work changed: </span>{changes && changes.length ? changes.join(" ") : "Nothing changed today."}</p>
  </>;
  if (expanded) return <section data-exercise-instructions className="space-y-2 text-xs"><h4 className="font-semibold">How to do it</h4>{content}</section>;
  return <Collapsible open={open} onOpenChange={setOpen} data-exercise-instructions>
    <CollapsibleTrigger asChild><Button type="button" variant="outline" className="h-10 w-full justify-between text-sm font-semibold">How to do it<ChevronDown className={`h-4 w-4 ${open ? "rotate-180" : ""}`} /></Button></CollapsibleTrigger>
    <CollapsibleContent className="mt-2 space-y-2 border-l-2 border-border pl-3 text-xs">{content}</CollapsibleContent>
  </Collapsible>;
}