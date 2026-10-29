import type { PrescribedBlock } from './dailyPlan';
export { validatePlanSanity, validatePlanWeek } from '../../../../supabase/functions/_shared/wic/planSanity';
const ORDER = { prep: 0, drills: 1, full_go: 2, log: 3 } as const;
/** Existing declared stages only; no name, dose or inferred intensity ranking. */
export function enforceSkillStageOrder(blocks: readonly PrescribedBlock[]): PrescribedBlock[] {
  return blocks.map(block => {
    if (block.status !== 'ready' || !['hitting','pitching','throwing','defense','baserunning'].includes(block.modality) ||
      block.drills.some(drill => !drill.stage || drill.ownerDrillId || drill.prescriptionOrigin === 'owner')) return block;
    const drills = [...block.drills].sort((a,b) => (a.stage ? ORDER[a.stage] : 0) - (b.stage ? ORDER[b.stage] : 0));
    if (drills.every((drill,index) => drill === block.drills[index])) return block;
    return { ...block, drills, steps: drills.map(d => d.setup ? `${d.name} — ${d.dosage} (${d.setup})` : `${d.name} — ${d.dosage}`) };
  });
}