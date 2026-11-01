import type { OwnerDrillRow } from '@/lib/prescription/ownerDrills';
import { ownerDrillsForSlot } from '@/lib/prescription/ownerPlanDrills';
import { ownerConditioningDose, ownerConditioningFits, ownerConditioningLine } from '../../../../supabase/functions/_shared/wic/conditioning/ownerConditioning';
import type { HammerBlock } from './dailyPlan';

/** Only explicit built-in non-preparation identities can spend an existing dose.
 * Physical carries live in WIC; do not pretend a core accessory is a carry. */
const identities: Record<string, 'jump' | 'sled'> = {
  'Short-contact pogos': 'jump', 'Single-leg pogos': 'jump',
  'Resisted starts (sled or band)': 'sled', 'Optional resisted starts': 'sled',
};
export function ownerConditioningPlan(blocks: readonly HammerBlock[], ctx: {
  sport: string; modules: string[]; isPitcher: boolean; role: string | null; day: Date;
  owned: ReadonlySet<string>; low: boolean; rest: boolean; game: boolean; restricted: boolean;
}): HammerBlock[] {
  if (ctx.rest || ctx.game || ctx.restricted) return [...blocks];
  const pool = ownerDrillsForSlot(['hammers_today:conditioning'], ctx).filter(r => ownerConditioningFits(r, { ...ctx, runningOnly: false }));
  const used = new Set<string>();
  return blocks.map(b => {
    if (b.status !== 'ready' || !['speed','strength'].includes(b.modality)) return b;
    const drills = b.drills.map(d => {
      const kind = identities[d.name];
      if (!kind || d.stage || d.ownerDrillId || d.armEvent) return d;
      const candidates = pool.filter(r => r.conditioning_kind === kind && !used.has(r.id)).sort((a,c) => a.id.localeCompare(c.id));
      const index = Math.floor(ctx.day.getTime() / 86400000);
      const pick: OwnerDrillRow | undefined = candidates[index % candidates.length];
      const dose = pick ? ownerConditioningDose(pick, ctx.low) : null;
      const source = d.dosage.match(/^(\d+)\s*(?:x|×)\s*(\d+)\b/);
      if (!pick || !dose || !source) return d;
      const allowance = Number(source[1]) * Number(source[2]) * (d.dosage.includes('per side') ? 2 : 1);
      const rounds = kind === 'jump' && dose.contacts ? Math.min(dose.rounds, Math.floor(allowance / dose.contacts)) : dose.rounds;
      if (rounds < 1 || dose.distance_feet * rounds / 3 > 1000) return d;
      used.add(pick.id);
      return { ...d, name: pick.name, slug: `owner_cond_${pick.id}`, ownerDrillId: pick.id, prescriptionOrigin: 'owner' as const,
        dosage: ownerConditioningLine(pick.name, { ...dose, rounds }), setup: pick.setup ?? undefined,
        cue: pick.cue ?? undefined, stopIf: d.stopIf ?? 'Stop if you feel pain or tightness.',
        conditioningDose: { ...dose, rounds, kind, contactAllowance: kind === 'jump' ? allowance : null } };
    });
    return { ...b, drills, steps: drills.map(d => `${d.name}: ${d.dosage}`) };
  });
}