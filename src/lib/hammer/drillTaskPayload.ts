export interface DrillLineage {
  name: string;
  dosage?: string | null;
  slug?: string | null;
  ownerDrillId?: string;
  routineRole?: string | null;
  skillArea?: string | null;
  batSpeedKind?: string | null;
  stage?: string;
  bunt?: unknown;
}

/** Prescription lineage, never a measured outcome or efficacy claim. */
export function drillTaskPayload(drill: DrillLineage, sport: string, modality: string, side: 'L' | 'R' | null) {
  return {
    name: drill.name, dosage: drill.dosage ?? null, slug: drill.slug ?? null, side,
    sport, module: modality, ownerDrillId: drill.ownerDrillId ?? null,
    routineRole: drill.routineRole ?? null, skillArea: drill.skillArea ?? null,
    batSpeedKind: drill.batSpeedKind ?? null, stage: drill.stage ?? null,
    ...(drill.bunt ? { bunt: drill.bunt, module: 'hitting' } : {}),
  };
}