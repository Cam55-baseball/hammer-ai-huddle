import { guideFor, type MovementGuide } from "@/lib/hammer/prescription/movementGuide";
import { composeGuide } from "@/lib/hammer/prescription/composeGuide";

/** The movement's existing guide, shown inline; never invents or changes a dose. */
export function ExerciseInstructions({ name, slug, guideOverride, setup, cue, stopIf, dosage }: {
  name: string; slug?: string | null; guideOverride?: MovementGuide | null;
  setup?: string | null; cue?: string | null; stopIf?: string | null; dosage?: string | null;
}) {
  const guide = guideOverride ?? guideFor(slug) ?? guideFor(name);
  const fallback = guide ? null : composeGuide({ name, slug, setup, cue, stopIf, dosage });
  const steps = guide?.goodRep ?? fallback?.steps ?? [];
  return <section data-exercise-instructions className="space-y-2 border-t border-border pt-2 text-xs">
    <h3 className="font-semibold text-foreground">How to do it</h3>
    {guide?.what && <p className="text-muted-foreground">{guide.what}</p>}
    <p className="text-muted-foreground"><span className="font-medium text-foreground">Setup: </span>{setup ?? guide?.setup ?? fallback?.setup}</p>
    <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">{steps.map((step, i) => <li key={i}>{step}</li>)}</ol>
    {guide?.feel && <p className="text-muted-foreground">What it should feel like: {guide.feel}</p>}
    <p className="text-muted-foreground"><span className="font-medium text-foreground">Stop if: </span>{stopIf ?? guide?.stopIf ?? fallback?.stopIf ?? "You feel pain."}</p>
  </section>;
}