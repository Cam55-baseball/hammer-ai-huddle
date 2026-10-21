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

/** Null is recorded absence, not permission to substitute a catalog default. */
export function recordedSwapDose(receipt: unknown): SwapDose {
  if (!receipt || typeof receipt !== 'object') throw new Error('The original dose was not saved. Your session is unchanged.');
  const row = receipt as Record<string, unknown>;
  const numeric = ['sets', 'reps', 'duration_seconds', 'distance_feet', 'total_reps', 'load_pct'] as const;
  const text = ['dosage_unit', 'tempo'] as const;
  for (const key of numeric) {
    if (!(key in row) || (row[key] !== null && (typeof row[key] !== 'number' || !Number.isFinite(row[key])))) {
      throw new Error('The original dose is incomplete. Your session is unchanged.');
    }
  }
  for (const key of text) if (!(key in row) || (row[key] !== null && typeof row[key] !== 'string')) {
    throw new Error('The original dose is incomplete. Your session is unchanged.');
  }
  return { sets: row.sets as number | null, reps: row.reps as number | null,
    duration_seconds: row.duration_seconds as number | null, distance_feet: row.distance_feet as number | null,
    total_reps: row.total_reps as number | null, load_pct: row.load_pct as number | null,
    dosage_unit: row.dosage_unit as string | null, tempo: row.tempo as string | null };
}