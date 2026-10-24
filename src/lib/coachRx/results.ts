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
  metrics?: { rounds?: Array<Record<string, unknown>> } | null;
  prescription?: { movement_name: string; dosage_unit: string | null; slot: string; why_payload?: unknown } | null;
}

export function actualResultText(log: WorkoutActual): string {
  const values: string[] = [];
  if (log.sets_completed != null) values.push(`Sets: ${log.sets_completed}`);
  const reps = log.reps_completed?.length ? log.reps_completed.join(" / ") : log.total_reps_completed;
  if (reps != null) values.push(`${log.prescription?.dosage_unit === "throws" ? "Throws" : "Reps"}: ${reps}`);
  const rounds = log.metrics?.rounds ?? [];
  const entered = (key: string) => rounds.map(round => round[key]).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const throws = entered("throws");
  const swings = entered("swings");
  if (log.prescription?.dosage_unit !== "throws" && throws.length) values.push(`Throws: ${throws.join(" / ")}`);
  if (swings.length) values.push(`Swings: ${swings.join(" / ")}`);
  const seconds = log.duration_seconds_precise ?? log.duration_seconds_completed;
  if (seconds != null) values.push(`Time: ${seconds.toFixed(2)} s`);
  const times = rounds.map(round => round.time ?? round.duration).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (times.length > 1) values.push(`Round times: ${times.map(time => time.toFixed(2)).join(" / ")} s`);
  const distances = entered("distance");
  if (distances.length > 1) values.push(`Round distances: ${distances.join(" / ")} ft`);
  if (log.distance_feet_completed != null) values.push(`Distance: ${log.distance_feet_completed} ft`);
  return values.join(" · ") || "No entered results";
}