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