import { useWorkoutActuals } from "@/hooks/useWorkoutActuals";
import { actualResultText } from "@/lib/coachRx/results";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

export function WorkoutActuals({ from = "", to = "", search = "" }: { from?: string; to?: string; search?: string }) {
  const query = useWorkoutActuals();
  const rows = (query.data ?? []).filter(row => (!from || row.plan_date >= from) && (!to || row.plan_date <= to) &&
    (!search || `${row.movement_slug} ${row.prescription?.movement_name ?? ""}`.toLowerCase().includes(search.toLowerCase())));
  return <Collapsible className="border-b border-border py-3" data-workout-actuals>
    <CollapsibleTrigger asChild><Button variant="ghost" className="w-full justify-between"><span>Logged workouts</span><ChevronDown className="h-4 w-4" /></Button></CollapsibleTrigger>
    <CollapsibleContent className="space-y-3 pt-3">
      {query.isLoading ? <p role="status">Loading workout results…</p> : query.error ? <p role="alert" className="text-destructive">Couldn't load workout results. Reload and try again.</p> : rows.length === 0 ? <p className="text-sm text-muted-foreground">No logged workouts yet.</p> : rows.map(row => <div key={row.id} data-workout-log={row.id} className="text-sm">
        <p className="font-medium">{row.prescription?.movement_name ?? row.movement_slug.replace(/_/g, " ")}</p>
        <p className="text-xs text-muted-foreground">{row.plan_date} · {row.prescription?.slot ?? "Workout"}</p>
        <p>{actualResultText(row)}</p>
      </div>)}
    </CollapsibleContent>
  </Collapsible>;
}