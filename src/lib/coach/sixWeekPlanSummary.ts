import { previousPlanDates, savedPlanReasons, type SavedCoachPlan, type SavedPlanDrill } from './planHistory';
import { visibleCoachPlanBlocks } from './visiblePlanBlocks';

export interface SixWeekSkillSummary {
  category: string;
  savedPlanDays: number;
  firstDate: string;
  latestDate: string;
  latestReasons: string[];
  practiceIdeas: Array<{ drill: SavedPlanDrill; date: string; reasons: string[] }>;
}

/** Six calendar weeks including today; no extrapolated or invented days. */
export function sixWeekPlanDates(today: string): string[] {
  if (!previousPlanDates(today).length) return [];
  const date = new Date(`${today}T12:00:00`);
  return Array.from({ length: 42 }, (_, index) => {
    const next = new Date(date);
    next.setDate(next.getDate() - index);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
  });
}

/** Only server-authorized, redacted, same-sport saved plans may enter this projection. */
export function sixWeekPlanSummary(plans: readonly SavedCoachPlan[], sport: string, today: string): SixWeekSkillSummary[] {
  const dates = new Set(sixWeekPlanDates(today));
  const buckets = new Map<string, SixWeekSkillSummary>();
  const seen = new Set<string>();
  const ordered = [...plans].sort((a, b) => (b.plan_date ?? '').localeCompare(a.plan_date ?? ''));
  for (const plan of ordered) {
    if (plan.state !== 'ok' || plan.sport !== sport || !plan.plan_date || !dates.has(plan.plan_date)) continue;
    for (const block of visibleCoachPlanBlocks(plan.blocks ?? [])) {
      if (block.replacedByCoachRx) continue;
      const key = `${block.modality}:${plan.plan_date}`;
      if (seen.has(key) || !block.drills.length) continue;
      seen.add(key);
      const reasons = savedPlanReasons(block);
      const prior = buckets.get(block.modality);
      const summary = prior ?? { category: block.modality, savedPlanDays: 0, firstDate: plan.plan_date,
        latestDate: plan.plan_date, latestReasons: reasons, practiceIdeas: [] };
      summary.savedPlanDays += 1;
      summary.firstDate = plan.plan_date;
      // Keep actual issue-selected drills, never turn a schedule reason into a fault.
      if (summary.practiceIdeas.length < 3 && reasons.length) {
        for (const drill of block.drills) {
          if (drill.prescriptionOrigin !== 'analysis' || !drill.slug || drill.stage === 'log') continue;
          if (summary.practiceIdeas.some(idea => idea.drill.slug === drill.slug)) continue;
          summary.practiceIdeas.push({ drill, date: plan.plan_date, reasons });
          if (summary.practiceIdeas.length === 3) break;
        }
      }
      buckets.set(block.modality, summary);
    }
  }
  return [...buckets.values()];
}