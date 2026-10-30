import type { DrillStep } from './dailyPlan';

/** Explicit dry siblings of existing catalog identities; never throwing or rehabilitation clearance. */
const DRY_READS = new Set(['DP pivot at 2B — replace foot + throw', 'DP pivot at 2B — quick feed & throw', 'DP pivot', 'DP pivot primer', 'Backhand & throw across body', 'Backhand range', 'Backhand primer', 'Pop-up communication with 2B/OF', 'Pop-up communication — infield fly rule reps']);
const LEG = new Set(['ankle','knee','hip','hamstring','groin','quad','calf','foot']);
const ARM = new Set(['shoulder','elbow','ucl','forearm','labrum','rotator_cuff','biceps']);
export function restrictedFielding(drills: readonly DrillStep[], regions: readonly string[]) {
  const leg = regions.some(r => LEG.has(r));
  const arm = regions.some(r => ARM.has(r));
  if (!leg && !arm) return null;
  const reason = `Because your ${regions.filter(r=>LEG.has(r)||ARM.has(r)).join(' and ')} restrictions limit normal fielding, keep these existing reads easy: ${leg ? 'stay seated, with no steps or pivots' : 'walk through only'}. No ball, catches or throws. Stop if it hurts.`;
  const safe = drills.filter(d=>DRY_READS.has(d.name)).map(d=>({...d,
    name:`${d.name} — ${leg ? 'seated read' : 'dry read'}`,
    setup:reason,
    cue:leg?'Stay seated. Picture the ball and say where you would field it and set your feet. Keep your arms relaxed.':'Read an imaginary ball and set your feet slowly; do not throw.',
    stopIf:'Pain, dizziness or discomfort — stop and update Hammers.',
    guide:undefined, executionKind:undefined, armEvent:undefined, stage:'drills' as const,
    equipmentNote:'No ball or glove needed for these dry reads.',
  }));
  return safe.length ? {drills:safe,reason} : null;
}