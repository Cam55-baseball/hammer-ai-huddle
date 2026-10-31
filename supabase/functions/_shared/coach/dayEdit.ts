import type { RxCategory } from './prescriptionSafety.ts';

export function editCategory(modality: string): RxCategory | null {
  const category = modality === 'defense' ? 'fielding' : modality;
  return ['hitting','pitching','throwing','fielding','baserunning','lift','speed','conditioning','warmup','mobility','recovery','vision'].includes(category) ? category as RxCategory : null;
}

/** A day editor must never infer numbers from informal dosage text. */
export function validateEditedExercises(items: unknown): string | null {
  if (!Array.isArray(items) || !items.length || items.length > 100) return 'Keep at least one activity, or use Remove for this session.';
  for (const item of items) {
    if (!item || typeof item.name !== 'string' || !item.name.trim()) return 'Name every exercise.';
    for (const key of ['sets','reps','duration','rest','distance_feet']) {
      const value = item[key];
      if (value != null && (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || (key === 'sets' && (!Number.isInteger(value) || value < 1)))) return 'Enter valid sets, repetitions, time, rest and distance.';
    }
    if (item.sets == null || (!item.reps && !item.duration && !item.distance_feet)) return 'Each exercise needs sets and a repetition, time or distance target.';
  }
  return null;
}