import type { Exercise } from '@/types/customActivity';
import type { WeekCard, WeekDay } from '@/lib/coach/playerWeek';
import { editCategory } from '../../../supabase/functions/_shared/coach/dayEdit';

export function cardEditSource(day: WeekDay, card: WeekCard) {
  if (card.id.startsWith('block:')) {
    const index = Number(card.id.slice(6));
    const block = day.plan.blocks?.[index];
    if (!block || block.replacedByCoachRx || block.status !== 'ready') return null;
    const category = editCategory(block.modality);
    if (!category) return null;
    return { category, target: { block_index: index }, exercises: block.drills.map((drill, i): Exercise => {
      const rx = day.prescriptions.find(p => p.movement_name === drill.name && (!drill.slug || p.movement_slug === drill.slug));
      return { id: crypto.randomUUID(), name: drill.name, slug: drill.slug ?? undefined, type: 'other', sets: rx?.sets ?? undefined, reps: rx?.reps ?? undefined,
        duration: rx?.duration_seconds ?? undefined, rest: rx?.rest_seconds ?? undefined, distance_feet: rx?.distance_feet ?? undefined,
        dosage_unit: rx?.dosage_unit ?? undefined, notes: drill.cue ?? undefined, original_dosage: drill.dosage } as Exercise;
    }) };
  }
  const rows = day.prescriptions.filter(p => card.activities.some(a => a.id === p.id));
  const category = rows.length ? editCategory(rows[0].slot === 'supplemental' ? 'lift' : rows[0].slot) : null;
  if (!category) return null;
  return { category, target: { prescription_ids: rows.map(p => p.id) }, exercises: rows.map((p): Exercise => ({id:crypto.randomUUID(),name:p.movement_name,slug:p.movement_slug || undefined,type:'other',sets:p.sets ?? undefined,reps:p.reps ?? undefined,duration:p.duration_seconds ?? undefined,rest:p.rest_seconds ?? undefined,distance_feet:p.distance_feet ?? undefined,dosage_unit:p.dosage_unit ?? undefined})) };
}