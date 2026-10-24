import { localIso } from '@/hooks/usePitcherSchedule';
import { visibleCoachPlanBlocks } from './visiblePlanBlocks';

export interface SavedPlanDrill {
  name: string; dosage: string; stage: string | null; cue: string | null;
  slug?: string | null; prescriptionOrigin?: string | null;
}
export interface SavedPlanBlock {
  modality: string; title: string; status: string; durationMin: number | null;
  because: string[]; roadmapReason: string; drills: SavedPlanDrill[];
  replacedByCoachRx?: string;
}
export interface SavedCoachPlan {
  state: 'ok' | 'denied' | 'unavailable'; sport?: string; plan_date?: string;
  updated_at?: string; health_shared?: boolean; blocks?: SavedPlanBlock[];
}

/** Device calendar dates, never elapsed-hour arithmetic across daylight saving. */
export function previousPlanDates(today: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) return [];
  const date = new Date(`${today}T12:00:00`);
  if (!Number.isFinite(date.getTime()) || localIso(date) !== today) return [];
  return Array.from({ length: 6 }, (_, i) => {
    const previous = new Date(date);
    previous.setDate(previous.getDate() - i - 1);
    return localIso(previous);
  });
}

/** Returned saved days only; another sport or denied/missing date is not evidence. */
export function savedTrainingHistory(plans: readonly SavedCoachPlan[], sport: string | undefined) {
  if (!sport) return [];
  return plans.filter(plan => plan.state === 'ok' && plan.sport === sport && plan.plan_date)
    .map(plan => ({ ...plan, blocks: visibleCoachPlanBlocks(plan.blocks ?? []) }))
    .sort((a, b) => (b.plan_date ?? '').localeCompare(a.plan_date ?? ''));
}

/** Never backfill a removed health reason or invent an evidence explanation. */
export function savedPlanReasons(block: SavedPlanBlock): string[] {
  const explicit = block.because.filter(line => line.trim());
  return explicit.length ? explicit : block.roadmapReason?.trim() ? [block.roadmapReason] : [];
}