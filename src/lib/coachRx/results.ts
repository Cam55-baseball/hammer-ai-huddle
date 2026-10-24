/** Read actual work only; prescription targets never fill missing results. */
export interface WorkoutActual {
  id: string;
  plan_date: string;
  movement_slug: string;
  sets_completed: number | null;
  reps_completed: number[] | null;
  total_reps_completed: number | null;
  duration_seconds_precise: number | null;
  duration_seconds_completed: number | null;
  distance_feet_completed: number | null;
  prescription?: { movement_name: string; dosage_unit: string | null; slot: string; why_payload?: unknown } | null;
}

export function actualResultText(log: WorkoutActual): string {
  const values: string[] = [];
  if (log.sets_completed != null) values.push(`Sets: ${log.sets_completed}`);
  const reps = log.reps_completed?.length ? log.reps_completed.join(" / ") : log.total_reps_completed;
  if (reps != null) values.push(`${log.prescription?.dosage_unit === "throws" ? "Throws" : "Reps"}: ${reps}`);
  const seconds = log.duration_seconds_precise ?? log.duration_seconds_completed;
  if (seconds != null) values.push(`Time: ${seconds.toFixed(2)} s`);
  if (log.distance_feet_completed != null) values.push(`Distance: ${log.distance_feet_completed} ft`);
  return values.join(" · ") || "No entered results";
}