// Pure stats for the owner Exercise Vault stats panel. Uses existing data only:
// prescriptions, session logs (effort + primer quality) and the anonymous
// training store (performance change over 2/4/8 weeks). Never invents a value:
// anything without data comes back null.
export interface StatsInput {
  prescriptions: Array<{ status: string | null; plan_date?: string | null }>;
  logs: Array<{ rpe: number | null; metrics: Record<string, unknown> | null }>;
  anon: Array<{ delta_2w: Record<string, unknown> | null; delta_4w: Record<string, unknown> | null; delta_8w: Record<string, unknown> | null }>;
}

export interface ExerciseStats {
  timesPrescribed: number;
  completed: number;
  missed: number;
  completionRate: number | null; // completed / (completed + missed), planned cards don't count yet
  averageEffort: number | null;  // 1–10
  effortLogs: number;
  primerRatings: number;
  averagePrimerQuality: number | null; // 1–5
  performanceChange: { w2: number | null; w4: number | null; w8: number | null; records: number };
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const avg = (xs: number[]) => (xs.length ? round1(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
const nums = (o: Record<string, unknown> | null) =>
  Object.values(o ?? {}).filter((v): v is number => typeof v === "number" && Number.isFinite(v));

export function computeExerciseStats(i: StatsInput): ExerciseStats {
  const completed = i.prescriptions.filter((p) => p.status === "completed").length;
  const missed = i.prescriptions.filter((p) => p.status === "missed").length;
  const efforts = i.logs.map((l) => l.rpe).filter((r): r is number => typeof r === "number" && r >= 1 && r <= 10);
  const quality = i.logs
    .map((l) => l.metrics?.quality)
    .filter((q): q is number => typeof q === "number" && q >= 1 && q <= 5);
  const dw = (k: "delta_2w" | "delta_4w" | "delta_8w") => avg(i.anon.flatMap((a) => nums(a[k])));
  return {
    timesPrescribed: i.prescriptions.length,
    completed,
    missed,
    completionRate: completed + missed ? Math.round((completed / (completed + missed)) * 100) : null,
    averageEffort: avg(efforts),
    effortLogs: efforts.length,
    primerRatings: quality.length,
    averagePrimerQuality: avg(quality),
    performanceChange: { w2: dw("delta_2w"), w4: dw("delta_4w"), w8: dw("delta_8w"), records: i.anon.length },
  };
}
