import { isSoftRecovery } from './schedule/softRecovery.ts';

export interface SanityWork {
  category: string;
  slug?: string | null;
  phase?: string | null;
  primer?: boolean;
  recovery?: boolean;
}
export interface PlanSanityInput {
  restDay: boolean;
  phase?: string | null;
  work: readonly SanityWork[];
  expectedCategories?: readonly string[];
  /** Explicit missing equipment/injury/schedule exclusions, never invented. */
  exclusions?: readonly string[];
}
const ANCHORS = new Set(['warmup', 'recovery', 'fueling', 'game_iq', 'mobility', 'mental']);
export function validatePlanSanity(input: PlanSanityInput): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  const real = input.work.filter(w => !ANCHORS.has(w.category) && !w.primer && !w.recovery && !isSoftRecovery(w.slug));
  if (!input.restDay && !real.length) issues.push('training_day_without_session');
  if (input.work.some(w => w.primer) && !real.length) issues.push('primer_without_session');
  if (input.phase && input.work.some(w => w.phase && w.phase !== input.phase)) issues.push('season_mismatch');
  const categories = new Set(real.map(w => w.category));
  for (const category of input.expectedCategories ?? []) {
    if (!categories.has(category) && !(input.exclusions ?? []).includes(category)) issues.push(`missing_category:${category}`);
  }
  return { ok: issues.length === 0, issues };
}

export function validatePlanWeek(days: readonly PlanSanityInput[], floors: Readonly<Record<string, number>>) {
  const issues = days.flatMap((day, index) => validatePlanSanity(day).issues.map(issue => `day${index}:${issue}`));
  const counts: Record<string, number> = {};
  for (const day of days) {
    if (day.restDay) continue;
    const categories = new Set(day.work.filter(w => !w.primer && !w.recovery && !isSoftRecovery(w.slug)).map(w => w.category));
    for (const category of categories) counts[category] = (counts[category] ?? 0) + 1;
  }
  for (const [category, minimum] of Object.entries(floors)) {
    if ((counts[category] ?? 0) < minimum) issues.push(`weekly_minimum:${category}:${counts[category] ?? 0}/${minimum}`);
  }
  return { ok: issues.length === 0, issues, counts };
}

/**
 * Owner Nov 1 C3 — weekly-structure invariants for one Monday–Sunday week of
 * saved or about-to-be-saved days. Pure. Encodes only rules already written in
 * the builder: ≥2 full rest days between loaded lifts, at most 2 loaded lifts
 * in-season, exactly one rest day, the weekly floors, no lift the day before a
 * start, arm limits as judged by the arm guard, and one season phase per date.
 */
export interface WeekStructureDay {
  date: string;
  phase: string | null;
  /** Phase the season settings give for this date (resolver), when known. */
  expectedPhase?: string | null;
  restDay: boolean;
  liftLoaded: boolean;
  startsNextDay?: boolean;
  /** False when the arm guard reported a breach for this day. */
  armWithinLimits?: boolean;
  categories?: readonly string[];
}
export const MIN_REST_DAYS_BETWEEN_LIFTS = 2;
export const IN_SEASON_WEEKLY_LIFT_MAX = 2;
const dn = (iso: string) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86_400_000);

export function validateWeekStructure(
  days: readonly WeekStructureDay[],
  floors: Readonly<Record<string, number>> = {},
  opts: { fullWeek?: boolean } = {},
): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const lifts = sorted.filter((d) => d.liftLoaded);
  for (let i = 1; i < lifts.length; i++) {
    const gap = dn(lifts[i].date) - dn(lifts[i - 1].date) - 1;
    if (gap < MIN_REST_DAYS_BETWEEN_LIFTS) issues.push(`lift_spacing:${lifts[i].date}:${gap}/${MIN_REST_DAYS_BETWEEN_LIFTS}`);
  }
  const inSeasonLifts = lifts.filter((d) => d.phase === "in_season" || d.phase === "post_season").length;
  if (inSeasonLifts > IN_SEASON_WEEKLY_LIFT_MAX) issues.push(`weekly_lift_max:${inSeasonLifts}/${IN_SEASON_WEEKLY_LIFT_MAX}`);
  for (const d of sorted) {
    if (d.liftLoaded && d.restDay) issues.push(`lift_on_rest_day:${d.date}`);
    if (d.liftLoaded && d.startsNextDay) issues.push(`lift_day_before_start:${d.date}`);
    if (d.armWithinLimits === false) issues.push(`arm_limit:${d.date}`);
    if (d.expectedPhase && d.phase && d.expectedPhase !== d.phase) issues.push(`season_mismatch:${d.date}:${d.phase}/${d.expectedPhase}`);
  }
  if (opts.fullWeek) {
    const rest = sorted.filter((d) => d.restDay).length;
    if (rest !== 1) issues.push(`rest_days:${rest}/1`);
    const counts: Record<string, number> = {};
    for (const d of sorted) if (!d.restDay) for (const c of new Set(d.categories ?? [])) counts[c] = (counts[c] ?? 0) + 1;
    for (const [c, min] of Object.entries(floors)) if ((counts[c] ?? 0) < min) issues.push(`weekly_minimum:${c}:${counts[c] ?? 0}/${min}`);
  }
  return { ok: issues.length === 0, issues };
}
