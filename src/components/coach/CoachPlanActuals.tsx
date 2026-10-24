import { useManageSentWorkouts } from "@/hooks/useCoachPrescriptions";
import { actualResultText, type WorkoutActual } from "@/lib/coachRx/results";

/** Uses the existing server-gated sender results, never a cross-athlete table read. */
export function CoachPlanActuals({ athleteId, planDate }: { athleteId: string; planDate: string }) {
  const query = useManageSentWorkouts();
  if (query.isLoading) return <p role="status" className="text-xs text-muted-foreground">Loading coach-workout results…</p>;
  if (query.error) return <p role="alert" className="text-xs text-destructive">Couldn't load coach-workout results.</p>;
  const results = query.rows.filter(send => send.recipient_id === athleteId)
    .flatMap(send => (send.results ?? []) as WorkoutActual[])
    .filter(log => log.plan_date === planDate);
  if (!results.length) return null;
  return <div className="border-t border-border pt-3 space-y-2" data-coach-plan-actuals>
    <h4 className="text-xs font-semibold">Logged coach workouts</h4>
    {results.map(log => <div key={log.id} className="text-sm break-words" data-coach-plan-log={log.id}>
      <p className="font-medium">{log.prescription?.movement_name ?? log.movement_slug}</p>
      <p className="text-xs text-muted-foreground">{log.plan_date}</p>
      <p className="text-xs">{actualResultText(log)}</p>
    </div>)}
  </div>;
}