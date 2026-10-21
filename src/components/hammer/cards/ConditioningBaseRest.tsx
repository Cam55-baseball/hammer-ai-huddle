import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RestTimer } from "./RestTimer";
import { BASE_REST_TEXT, conditioningRestAfterRep, type BaseRep } from "../../../../supabase/functions/_shared/wic/runRest";

/** Tracks athlete-confirmed reps only. It never authors or credits training. */
export function ConditioningBaseRest({ basesPerRep }: { basesPerRep: BaseRep }) {
  const [bases, setBases] = useState(0);
  const [rest, setRest] = useState<{ seconds: number; rep: number; reachedHome: boolean } | null>(null);
  const finishRep = () => {
    const next = conditioningRestAfterRep(bases, basesPerRep);
    setBases(next.bases);
    setRest((prior) => ({ seconds: next.seconds, rep: (prior?.rep ?? 0) + 1, reachedHome: next.reachedHome }));
  };
  return <section className="space-y-2" aria-label="Base-running rest">
    <p className="text-xs text-muted-foreground">{BASE_REST_TEXT}</p>
    <p className="text-xs font-medium" aria-live="polite">Base count: {bases} of 4{rest?.reachedHome ? " — home reached; count reset" : ""}. This rep: {basesPerRep} base{basesPerRep === 1 ? "" : "s"}.</p>
    <Button variant="outline" size="sm" onClick={finishRep}>Finished this running rep</Button>
    {rest && <RestTimer key={rest.rep} seconds={rest.seconds} label={rest.reachedHome ? "Rest at home plate" : "Rest between reps"} />}
  </section>;
}