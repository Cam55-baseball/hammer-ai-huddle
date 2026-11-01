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
    if (area === 'lifting') {
      // Owner round 5: easing back in keeps the SAME sets; only the weight is lighter.
      if (r) because.push(r.because);
      because.push(`Because: you're easing back in, so use about ${Math.round(f * 100)}% of your normal weight with the same sets. It goes up about 5% each green week until normal.`);
      return { ...b, because };
    }
    const drills = b.drills.map((d) => (!isDrillStage(d) ? d : { ...d, dosage: greenlightDosage(d.dosage, f) }));
    if (r) because.push(r.because);
    because.push(greenlightStartBecause(area, f));
    return { ...b, drills, because };
  });
}

/**
 * Owner Nov 1 round 5: "Where are you starting from?" bunts — 5 or 7 attempts per side.
 * Bunts are automatic (no greenlight gating). Attempts only ever go DOWN to the start;
 * the attempts removed go back to that slot's swings, so no volume is added or lost.
 */
export function applyBuntStart(blocks: readonly PrescribedBlock[], perSide: number | null | undefined): readonly PrescribedBlock[] {
  if (!(perSide && perSide > 0)) return blocks;
  return blocks.map((b) => {
    if (b.status !== 'ready' || !b.drills.some((d) => d.bunt && d.bunt.attempts > perSide)) return b;
    const out: DrillStep[] = [];
    for (let i = 0; i < b.drills.length; i++) {
      const d = b.drills[i];
      if (!d.bunt || d.bunt.attempts <= perSide) { out.push(d); continue; }
      const back = d.bunt.attempts - perSide;
      out.push({ ...d, dosage: `${perSide} attempts`, bunt: { ...d.bunt, attempts: perSide } });
      const next = b.drills[i + 1];
      const m = next ? /^(\d+) swings$/.exec(next.dosage) : null;
      if (next && m && !next.bunt) { out.push({ ...next, dosage: `${parseInt(m[1], 10) + back} swings` }); i++; }
      else out.push({ name: d.name.replace(/bunt.*$/i, '').trim() || 'Swings', stage: 'drills', dosage: `${back} swings`, cue: 'Your normal swings from today\'s hitting work.' });
    }
    return { ...b, drills: out, because: [...(b.because ?? []), `Because: you're starting at ${perSide} bunts per side, and the rest go back to your swings.`] };
  });
}
