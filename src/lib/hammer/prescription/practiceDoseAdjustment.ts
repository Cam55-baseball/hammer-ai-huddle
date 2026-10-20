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
/**
 * Owner Oct 20 rule, single source: about 30% less same-category work —
 * whole sets near 70% of the prescribed sets, never below half and never
 * below the row's explicit minimum. Reps are never touched here.
 */
export function reducedSetsWithinFloor(sets: number, minimumSets: number | null): number {
  const floor = minimumSets !== null && Number.isInteger(minimumSets) && minimumSets >= 1 ? minimumSets : 0;
  return Math.max(floor, Math.ceil(sets * 0.5), Math.round(sets * 0.7));
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
  // Owner Oct 20: about 30% less same-category work, at least half the
  // prescribed dose and the explicit row floor. Whole sets, reps unchanged.
  const sets = reducedSetsWithinFloor(dose.sets, dose.minimumSets);
  if (sets >= dose.sets) return { ...unchanged, recoveryPriority: true, because, sourceIds: load.sourceIds, outcome: 'at-minimum' };
  return { dose: { ...dose, sets }, recoveryPriority: true, because, sourceIds: load.sourceIds, outcome: 'reduced' };
}
