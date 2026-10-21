/** A substitution selects work, never authors a different measurement or dose. */
export interface SwapDose {
  sets: number | null;
  reps: number | null;
  duration_seconds: number | null;
  distance_feet: number | null;
  total_reps: number | null;
  dosage_unit: string | null;
  tempo: string | null;
  load_pct: number | null;
}

export function sameDoseSwap<T extends SwapDose>(original: T, candidate: { dosage_unit: string | null }): SwapDose {
  const sourceUnit = original.dosage_unit?.trim().toLowerCase();
  const targetUnit = candidate.dosage_unit?.trim().toLowerCase();
  if (!sourceUnit || !targetUnit || sourceUnit !== targetUnit) {
    throw new Error("This alternative changes how the work is counted. Your original session is unchanged.");
  }
  return {
    sets: original.sets, reps: original.reps, duration_seconds: original.duration_seconds,
    distance_feet: original.distance_feet, total_reps: original.total_reps,
    dosage_unit: original.dosage_unit, tempo: original.tempo, load_pct: original.load_pct,
  };
}