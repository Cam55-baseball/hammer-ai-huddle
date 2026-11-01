/**
 * Owner Nov 1 round 5 — "Where are you starting from?" for cards the SERVER builds
 * (lifts and sprints). Pure helpers plus one reader; mirrors the app's planStartsFrom.
 * Logged history wins after 2 logged weeks in the last 28 days. The greenlight rule
 * steps each start up; with no owner "ready" threshold saved, everyone holds.
 */
import { answersComplete, historyWins, programOf, startingLevels, EASING_BACK_LIFT_SHARE, EASING_BACK_LIFT_STEP, type Sport, type StartingLevels } from "./startingPoint.ts";
import { areaWeeks, greenlightAll, mondayOf, readyThresholdFrom, READY_SETTING_KEY, type DayCheckIn, type GreenlightArea, type GreenlightResult } from "./greenlight.ts";

/** Easing-back lift weight (% of normal) at a greenlight level: ~68% then +5% per green week, max 100. */
export function easeBackStartPct(level: number): number {
  return Math.min(100, Math.round(EASING_BACK_LIFT_SHARE * Math.pow(1 + EASING_BACK_LIFT_STEP, Math.max(0, level)) * 100));
}

/** Sprint yards target at a level (+5% per step). */
export function sprintStartYards(start: number, level: number): number {
  return Math.round(start * Math.pow(1.05, Math.max(0, level)));
}

/** Trim whole sets so distance rows total at most `cap` yards; every row keeps at least 1 set. */
export function capYardsTo<R extends { sets?: number | null; reps?: number | null; distance_feet?: number | null }>(rows: R[], cap: number): R[] {
  let left = cap;
  return rows.map((r) => {
    if (typeof r.distance_feet !== "number" || r.distance_feet <= 0) return r;
    const perSet = ((r.reps ?? 1) * r.distance_feet) / 3;
    const sets = r.sets ?? 1;
    const fit = Math.max(1, Math.min(sets, Math.floor(left / perSet)));
    left = Math.max(0, left - fit * perSet);
    return fit === sets ? r : { ...r, sets: fit };
  });
}

/** Readiness answer (1–5 or 1–10) → 0–1. */
export function normReadiness(r: unknown): number | null {
  const n = Number(r);
  if (r == null || !Number.isFinite(n)) return null;
  return n <= 5 ? Math.max(0, (n - 1) / 4) : Math.min(1, n / 10);
}

export interface ServerStarts {
  levels: StartingLevels;
  historyAreas: GreenlightArea[];
  greenlight: Record<GreenlightArea, GreenlightResult>;
}

const shift = (d: string, n: number) => new Date(new Date(`${d}T12:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);

/** Read answers + history + check-ins. Any read failure → null (cards stay as written). */
// deno-lint-ignore no-explicit-any
export async function readServerStarts(db: any, userId: string, sport: Sport, modules: readonly string[], today: string, age: number | null): Promise<ServerStarts | null> {
  const program = programOf(sport, modules);
  if (!program) return null;
  const from = shift(mondayOf(today), -56);
  const [sp, rx, logs, quiz, setting] = await Promise.all([
    db.from("athlete_starting_points").select("answers").eq("user_id", userId).eq("sport", sport).maybeSingle(),
    db.from("wk_prescriptions").select("id, plan_date, slot").eq("user_id", userId).gte("plan_date", from).lte("plan_date", today).limit(3000),
    db.from("wk_session_logs").select("prescription_id").eq("user_id", userId).gte("plan_date", from).lte("plan_date", today).limit(3000),
    db.from("vault_focus_quizzes").select("entry_date, physical_readiness, pain_location, pain_scale").eq("user_id", userId).gte("entry_date", from).lte("entry_date", today).limit(400),
    db.from("app_settings").select("setting_value").eq("setting_key", READY_SETTING_KEY).maybeSingle(),
  ]);
  if (sp.error || rx.error || logs.error || quiz.error || setting.error) return null;
  const answers = sp.data?.answers;
  if (!answers || !answersComplete(sport, program, answers)) return null;
  if ((rx.data ?? []).length >= 3000 || (logs.data ?? []).length >= 3000) return null;
  const logged = new Set(((logs.data ?? []) as any[]).map((l) => l.prescription_id).filter(Boolean));
  const byDay = new Map<string, DayCheckIn>();
  for (const q of (quiz.data ?? []) as any[]) {
    const norm = normReadiness(q.physical_readiness);
    const pain = (Array.isArray(q.pain_location) && q.pain_location.length > 0) || Number(q.pain_scale ?? 0) > 0;
    const prev = byDay.get(q.entry_date);
    byDay.set(q.entry_date, { date: q.entry_date, readiness: prev?.readiness != null && norm != null ? Math.min(prev.readiness, norm) : norm ?? prev?.readiness ?? null, pain: pain || !!prev?.pain });
  }
  const rows = (rx.data ?? []) as { id: string; plan_date: string; slot: string }[];
  const greenlight = greenlightAll(areaWeeks(today, rows, logged), [...byDay.values()], today, age, readyThresholdFrom(setting.data?.setting_value));
  // History in the last 28 days, this week included.
  const since = shift(today, -27);
  const after = shift(mondayOf(today), 7);
  const recent = areaWeeks(after, rows.filter((r) => r.plan_date >= since), logged);
  const historyAreas = (Object.keys(recent) as GreenlightArea[]).filter((a) => historyWins(recent[a].filter((w) => w.completed > 0).length));
  return { levels: startingLevels(sport, program, answers, null), historyAreas, greenlight };
}
