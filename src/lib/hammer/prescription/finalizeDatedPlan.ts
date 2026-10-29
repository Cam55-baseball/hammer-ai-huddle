import type { HammerDailyPlanResult } from './dailyPlan';
import { applyFaultPlanInfluence, type FaultPlanInfluenceInput } from '@/lib/prescription/applyFaultPlanInfluence';
import { applyAdjustments, type PlanAdjustment } from './drillSwap';
import { categorySignalEvidence, type SignalClip, type GameSignalSummary } from './categorySignalEvidence';
import { crossReference } from './mixedSignals';
import { principleDrillBoosts, type PrinciplePick } from '@/lib/intelligence/principlePicks';

/** Final overlays are date-injected; neither future evidence nor another day's UI is copied. */
export function finalizeDatedPlan(plan: HammerDailyPlanResult, input: Omit<FaultPlanInfluenceInput, 'blocks'> & {
  cnsHigh: boolean; adjustments: readonly PlanAdjustment[]; clips: readonly SignalClip[];
  games: GameSignalSummary | null; principles: readonly PrinciplePick[];
}): HammerDailyPlanResult {
  const base = input.cnsHigh ? { ...plan, blocks: plan.blocks.map(b =>
    ['hitting','throwing','defense'].includes(b.modality) && ['build','sharpen'].includes(b.phase)
      ? { ...b, phase: 'maintain' as const, roadmapReason: `${b.roadmapReason} (Today's load is already high — keeping skill work at maintenance.)` } : b) } : plan;
  const influenced = applyFaultPlanInfluence({ ...input, blocks: base.blocks });
  const signals = categorySignalEvidence(input.clips, input.games, input.now);
  const blocks = applyAdjustments(influenced, input.adjustments).map(block => {
    if (block.status !== 'ready') return block;
    const category = block.modality === 'hitting' ? 'hitting' : block.modality === 'defense' ? 'fielding' : null;
    const xr = category ? crossReference(category, signals) : null;
    const mixed = xr?.kind === 'mixed' && !block.because?.includes(xr.because)
      ? { ...block, because: [...(block.because ?? []), xr.because] } : block;
    const pickCategory = category ?? (block.modality === 'throwing' ? 'throwing' : null);
    if (!pickCategory) return mixed;
    const work = mixed.drills.filter(d => (d.stage ?? 'drills') === 'drills');
    const boosted = work.filter(d => d.slug && principleDrillBoosts(input.principles,d.slug,input.sport,pickCategory).length);
    const first = boosted[0];
    if (!first || work[0] === first) return mixed;
    const rest = mixed.drills.filter(d => !boosted.includes(d));
    const insert = mixed.drills.findIndex(d => (d.stage ?? 'drills') === 'drills');
    return { ...mixed, drills: [...rest.slice(0,insert),...boosted,...rest.slice(insert)],
      because: [...(mixed.because ?? []),`Your coach's saved guidance puts ${first.name} first.`] };
  });
  return { ...base, blocks };
}