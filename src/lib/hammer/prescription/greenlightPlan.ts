import type { PrescribedBlock, ModalityKey } from './dailyPlan';
import {
  greenlightFraction, greenlightDosage, greenlightStartBecause,
  type GreenlightArea, type GreenlightResult,
} from '../../../../supabase/functions/_shared/wic/progression/greenlight';

export type GreenlightStarts = Partial<Record<GreenlightArea, number>>;

const AREA_OF: Partial<Record<ModalityKey, GreenlightArea>> = {
  hitting: 'hitting', defense: 'defense', speed: 'speed', pitching: 'pitching', strength: 'lifting',
};

/**
 * Owner Nov 1 round 4: ready skill cards follow the area's starting point stepped up by
 * the greenlight rule, as whole drill sets, never above the written dose. Prep, full-go
 * and log stages are never cut. Throwing uses its own throw target; recovery is untouched.
 */
export function applyGreenlightPlan(
  blocks: readonly PrescribedBlock[],
  results: Partial<Record<GreenlightArea, GreenlightResult>> | null | undefined,
  starts: GreenlightStarts | null | undefined,
): readonly PrescribedBlock[] {
  return blocks.map((b) => {
    const area = AREA_OF[b.modality];
    if (!area || b.status !== 'ready') return b;
    const r = results?.[area];
    const f = greenlightFraction(area, starts?.[area], r?.level ?? 0);
    const because = [...(b.because ?? [])];
    if (f >= 1) {
      if (r && starts?.[area] != null && r.lastColor && r.lastColor !== 'none') because.push(r.because);
      return because.length === (b.because ?? []).length ? b : { ...b, because };
    }
    const drills = b.drills.map((d) => ((d.stage ?? 'drills') !== 'drills' ? d : { ...d, dosage: greenlightDosage(d.dosage, f) }));
    if (r) because.push(r.because);
    because.push(greenlightStartBecause(area, f));
    return { ...b, drills, because };
  });
}
