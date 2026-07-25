/**
 * Recent pitching load — pure aggregation over `wk_session_logs` rows.
 *
 * Aggregates the last N days of bullpen + outing logs into a per-day pitch
 * total plus the last outing date. Consumed by `recoveryClamp` and the
 * PitchingCard trend read-out.
 */

export interface RecentPitchingLoad {
  readonly byDate: Readonly<Record<string, number>>;  // ISO YYYY-MM-DD → pitches
  readonly weeklyTotal: number;
  readonly lastOuting: {
    readonly isoDate: string;
    readonly pitches: number;
    readonly template: "bullpen_pitching" | "pitching_outing";
  } | null;
}

export interface RawLogRow {
  readonly plan_date: string;
  readonly template_id: string | null;
  readonly movement_slug: string | null;
  readonly metrics: unknown;
}

const PITCH_TEMPLATES = new Set(["bullpen_pitching", "pitching_outing"]);

function extractPitches(metrics: unknown): number {
  if (!metrics || typeof metrics !== "object") return 0;
  const m = metrics as { rounds?: Array<Record<string, unknown>> };
  if (!Array.isArray(m.rounds)) return 0;
  let total = 0;
  for (const r of m.rounds) {
    const raw = r?.pitches ?? r?.reps;
    const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
    if (Number.isFinite(n) && n > 0) total += n;
  }
  return total;
}

export function aggregateRecentPitchingLoad(
  rows: ReadonlyArray<RawLogRow>,
): RecentPitchingLoad {
  const byDate: Record<string, number> = {};
  let last: RecentPitchingLoad["lastOuting"] = null;
  let weekly = 0;
  for (const r of rows) {
    const tpl = r.template_id;
    if (!tpl || !PITCH_TEMPLATES.has(tpl)) continue;
    const pitches = extractPitches(r.metrics);
    if (pitches <= 0) continue;
    byDate[r.plan_date] = (byDate[r.plan_date] ?? 0) + pitches;
    weekly += pitches;
    if (!last || r.plan_date > last.isoDate) {
      last = {
        isoDate: r.plan_date,
        pitches,
        template: tpl as "bullpen_pitching" | "pitching_outing",
      };
    }
  }
  return { byDate, weeklyTotal: weekly, lastOuting: last };
}
