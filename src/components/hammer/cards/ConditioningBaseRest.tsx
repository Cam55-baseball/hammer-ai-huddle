import { Button } from "@/components/ui/button";
import { RestTimer } from "./RestTimer";
import { BASE_REST_TEXT, type BaseRep } from "../../../../supabase/functions/_shared/wic/runRest";
import { useConditioningRest } from "./ConditioningRestContext";

/** Tracks athlete-confirmed reps only. It never authors or credits training. */
export function ConditioningBaseRest({ basesPerRep }: { basesPerRep: BaseRep }) {
  const { state: { bases, rest }, finishRep } = useConditioningRest();
  return <section className="space-y-2" aria-label="Base-running rest">
    <p className="text-xs text-muted-foreground">{BASE_REST_TEXT}</p>
    <p className="text-xs font-medium" aria-live="polite">Base count: {bases} of 4{rest?.reachedHome ? " — home reached; count reset" : ""}. This rep: {basesPerRep} base{basesPerRep === 1 ? "" : "s"}.</p>
    <Button variant="outline" size="sm" onClick={() => finishRep(basesPerRep)}>Finished this running rep</Button>
    {rest && <RestTimer key={rest.rep} seconds={rest.seconds} initialStartedAt={rest.startedAt} label={rest.reachedHome ? "Rest at home plate" : "Rest between reps"} />}
  </section>;
}