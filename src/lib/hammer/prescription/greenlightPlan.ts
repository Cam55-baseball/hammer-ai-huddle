import type { PrescribedBlock, ModalityKey, DrillStep } from './dailyPlan';
import {
  greenlightFraction, greenlightDosage, greenlightStartBecause,
  type GreenlightArea, type GreenlightResult,
} from '../../../../supabase/functions/_shared/wic/progression/greenlight';

/** Share of the written dose (0–1) per area. */
export type GreenlightStarts = Partial<Record<GreenlightArea, number>>;
/** Absolute per-session starting amounts from "Where are you starting from?". */
export interface GreenlightTargets { hitting?: number | null; defense?: number | null; speed?: number | null; bunting?: number | null }

const AREA_OF: Partial<Record<ModalityKey, GreenlightArea>> = {
  hitting: 'hitting', defense: 'defense', speed: 'speed', pitching: 'pitching', strength: 'lifting',
};

const isDrillStage = (d: DrillStep) => (d.stage ?? 'drills') === 'drills';

/** Card total for its drill stage: reps (sets × reps) or sprint yards. Unparseable rows don't count. */
export function cardAmount(drills: readonly DrillStep[], yards: boolean): number {
  let n = 0;
  for (const d of drills) {
    if (!isDrillStage(d)) continue;
    if (yards && d.speedMix?.length) { n += d.speedMix.reduce((t, x) => t + x.reps * x.distanceYards, 0); continue; }
    const m = /^(\d+)\s*(?:x|×)\s*(\d+)/i.exec(d.dosage);
    if (!m) continue;
    const reps = parseInt(m[1], 10) * parseInt(m[2], 10);
    if (!yards) { n += reps; continue; }
    const yd = /(\d+)\s*(?:yd|yards?)\b/i.exec(d.dosage.slice(m[0].length));
    if (yd) n += reps * parseInt(yd[1], 10);
  }
  return n;
}

/**
 * Owner Nov 1 round 4: ready skill cards follow the area's starting point stepped up by
 * the greenlight rule, as whole drill sets, never above the written dose. Prep, full-go
 * and log stages are never cut. Throwing uses its own throw target; recovery is untouched.
 */
export function applyGreenlightPlan(
  blocks: readonly PrescribedBlock[],
  results: Partial<Record<GreenlightArea, GreenlightResult>> | null | undefined,
  starts: GreenlightStarts | null | undefined,
  targets?: GreenlightTargets | null,
): readonly PrescribedBlock[] {
  return blocks.map((b) => {
    const area = AREA_OF[b.modality];
    if (!area || b.status !== 'ready') return b;
    const r = results?.[area];
    const target = targets?.[area as keyof GreenlightTargets];
    let start = starts?.[area];
    if (target != null) {
      const total = cardAmount(b.drills, area === 'speed');
      start = total > 0 ? Math.min(1, Math.max(0.01, target / total)) : undefined;
    }
    const f = greenlightFraction(area, start, r?.level ?? 0);
    const because = [...(b.because ?? [])];
    if (f >= 1) {
      if (r && start != null && r.lastColor && r.lastColor !== 'none') because.push(r.because);
      return because.length === (b.because ?? []).length ? b : { ...b, because };
    }
    const drills = b.drills.map((d) => (!isDrillStage(d) ? d : { ...d, dosage: greenlightDosage(d.dosage, f) }));
    if (r) because.push(r.because);
    because.push(greenlightStartBecause(area, f));
    return { ...b, drills, because };
  });
}
