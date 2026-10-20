import type { CategoryPracticeLoad, PracticeCategory } from './categoryPracticeLoad';

/** Structured dose only; the caller supplies the existing row's floor. */
export interface PracticeDose {
  category: PracticeCategory | 'strength' | 'recovery';
  status: 'ready' | 'off-day' | 'suppressed' | 'awaiting-input';
  sets: number;
  minimumSets: number | null;
  repsPerSet: number;
}
export interface PracticeDoseAdjustment {
  dose: PracticeDose;
  recoveryPriority: boolean;
  because: string | null;
  sourceIds: readonly string[];
  outcome: 'unchanged' | 'reduced' | 'at-minimum' | 'missing-floor';
}
export function adjustDoseForPractice(dose: PracticeDose, loads: readonly CategoryPracticeLoad[]): PracticeDoseAdjustment {
  const unchanged: PracticeDoseAdjustment = { dose, recoveryPriority: false, because: null, sourceIds: [], outcome: 'unchanged' };
  if (dose.category === 'strength' || dose.category === 'recovery' || dose.status !== 'ready') return unchanged;
  const load = loads.find(item => item.category === dose.category && item.heavyStretch);
  if (!load) return unchanged;
  const because = `Because you logged ${load.consecutiveDays} practice days in a row for ${dose.category}.`;
  if (dose.minimumSets === null || !Number.isInteger(dose.minimumSets) || dose.minimumSets < 1) {
    return { ...unchanged, recoveryPriority: true, because, sourceIds: load.sourceIds, outcome: 'missing-floor' };
  }
  // Earlier safety reductions win. Never increase to repair a floor.
  if (!Number.isInteger(dose.sets) || dose.sets <= dose.minimumSets) {
    return { ...unchanged, recoveryPriority: true, because, sourceIds: load.sourceIds, outcome: 'at-minimum' };
  }
  return { dose: { ...dose, sets: dose.sets - 1 }, recoveryPriority: true, because, sourceIds: load.sourceIds, outcome: 'reduced' };
}
