import { Button } from "@/components/ui/button";
import { RestTimer } from "./RestTimer";
import type { BaseRep } from "../../../../supabase/functions/_shared/wic/runRest";
import { useConditioningRest } from "./ConditioningRestContext";

/** Tracks athlete-confirmed reps only. It never authors or credits training. */
export function ConditioningBaseRest({ basesPerRep }: { basesPerRep: BaseRep }) {
  const { state: { rest }, finishRep } = useConditioningRest();
  return <section className="space-y-2" aria-label="Base-running rest">
    <Button variant="outline" size="sm" onClick={() => finishRep(basesPerRep)}>Finished this running rep</Button>
    {rest && <RestTimer key={rest.rep} seconds={rest.seconds} initialStartedAt={rest.startedAt} label={rest.reachedHome ? "Rest at home plate" : "Rest between reps"} />}
  </section>;
}