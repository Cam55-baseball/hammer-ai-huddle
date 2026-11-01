import { ownerConditioningDose, ownerConditioningFits, ownerConditioningLine, type OwnerConditioningFields } from './ownerConditioning.ts';
import { capSessionYards } from './yards.ts';
import { classify, amountPerSet } from '../exposure/ledger.ts';

type Owner = OwnerConditioningFields & { id: string; name: string; active: boolean; placements: string[]; equipment: string[]; cue?: string | null; setup?: string | null };
export type ConditioningRow = { movement_slug: string; movement_name?: string; slot: string; sets: number; reps?: number | null; distance_feet?: number | null; duration_seconds?: number | null; total_reps?: number | null; dosage_unit?: string | null; why_payload?: Record<string, any> };
/** Replace legal work, never add a slot or borrow a catalog category. Jumps spend
 * the displaced row's contact allowance; the existing governor runs afterwards. */
export function placeOwnerConditioning<R extends ConditioningRow>(rows: readonly R[], catalog: readonly any[], owners: readonly Owner[], ctx: {
  sport: string; isPitcher: boolean; modules: string[]; role: string | null; date: string;
  low: boolean; rest: boolean; game: boolean; restricted: boolean; equipment: string[];
}): { rows: R[]; catalog: any[] } {
  if (ctx.rest || ctx.game || ctx.restricted) return { rows: [...rows], catalog: [...catalog] };
  const gear = new Set(ctx.equipment.map(e => e.trim().toLowerCase()));
  const pool = owners.filter(o => o.active && o.placements.includes('hammers_today:conditioning') &&
    ownerConditioningFits(o, { ...ctx, runningOnly: false }) && Array.isArray(o.equipment) &&
    o.equipment.every(e => typeof e === 'string' && gear.has(e.trim().toLowerCase()))).sort((a,b) => a.id.localeCompare(b.id));
  const used = new Set<string>(); const synthetic: any[] = [];
  const next = rows.map(row => {
    const source = catalog.find(m => m.slug === row.movement_slug);
    if (!source || row.why_payload?.owner_drill_id) return row;
    const exposure = classify(source);
    const kind = exposure?.channel === 'JUMP' ? 'jump' :
      source.movement_category === 'carry' || source.category === 'carry' ? 'carry' :
      source.speed_category === 'resisted' && row.slot === 'speed' ? 'sled' :
      row.slot === 'conditioning' ? 'running' : null;
    if (!kind) return row;
    const candidates = pool.filter(o => !used.has(o.id) && (kind === 'running' ? ['run','base_route','sprint','shuttle'].includes(String(o.conditioning_kind)) : o.conditioning_kind === kind));
    const index = Math.floor(Date.parse(`${ctx.date}T12:00:00Z`) / 86400000);
    const pick = candidates[index % candidates.length];
    if (!pick) return row;
    const dose = ownerConditioningDose(pick, ctx.low);
    if (!dose) return row;
    // The row's already-legal contact count is the maximum, not an invented cap.
    const allowance = exposure?.channel === 'JUMP' ? row.sets * amountPerSet(source, 'JUMP', row.reps ?? null, row.distance_feet ?? null) : null;
    const rounds = allowance !== null && dose.contacts ? Math.min(dose.rounds, Math.floor(allowance / dose.contacts)) : dose.rounds;
    if (rounds < 1) return row;
    used.add(pick.id);
    const slug = `owner_cond_${pick.id}`;
    const finalDose = { ...dose, rounds };
    synthetic.push({ ...source, slug, name: pick.name, cue: pick.cue, default_sets: rounds,
      default_reps: dose.contacts ?? 1, contacts_per_rep: dose.contacts !== null ? 1 : source.contacts_per_rep,
      default_distance_feet: dose.distance_feet, default_duration_seconds: dose.work_seconds,
      default_total_reps: null, dosage_unit: dose.contacts !== null ? 'reps' : 'feet',
      substitution_family: null, regression_slug: null, progression_slug: null,
      equipment: pick.equipment, equipment_requirements: pick.equipment, equipment_alternatives: [] });
    return { ...row, movement_slug: slug, movement_name: pick.name, sets: rounds, reps: dose.contacts ?? 1,
      distance_feet: dose.distance_feet || null, duration_seconds: dose.work_seconds || null, total_reps: null,
      dosage_unit: dose.contacts !== null ? 'reps' : 'feet', why_payload: { ...row.why_payload,
        owner_drill_id: pick.id, cue: pick.cue, setup: pick.setup, why: ownerConditioningLine(pick.name, finalDose),
        owner_conditioning: { ...finalDose, kind: pick.conditioning_kind, contact_allowance: allowance },
        ...(dose.load_lbs !== null ? { prescribed_load_lbs: dose.load_lbs } : {}) } };
  });
  // Carries and sleds share the conditioning yard ceiling even in their original slots.
  const yardRows = next.filter(r => r.slot === 'conditioning' || ['carry','sled'].includes(String(r.why_payload?.owner_conditioning?.kind)));
  const capped = capSessionYards(yardRows);
  const byRow = new Map(yardRows.map((r,i) => [r,capped[i]]));
  return { rows: next.map(r => byRow.get(r) ?? r).filter(r => r.sets > 0) as R[], catalog: [...catalog, ...synthetic] };
}