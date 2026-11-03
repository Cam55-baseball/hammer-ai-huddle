export const TUNING_FIELDS = ['compound_min_sets','compound_max_sets','compound_min_reps','compound_max_reps','speed_cadence_hours','cns_unit_cap'] as const;
export type TuningValues = Partial<Record<typeof TUNING_FIELDS[number], number>>;
export type CoachTuning = { id:string; coach_id:string; athlete_id:string|null; settings:TuningValues; confirmed_at:string|null; undone_at:string|null };
/** Pure mirror for server precedence tests. Connections are always judged in the database. */
export function winningTuning(rows:CoachTuning[], athlete:string, connected:ReadonlySet<string>) {
  return rows.filter(r=>r.confirmed_at&&!r.undone_at&&connected.has(r.coach_id)&&(r.athlete_id===athlete||r.athlete_id===null))
    .sort((a,b)=>Number(b.athlete_id!==null)-Number(a.athlete_id!==null)||String(b.confirmed_at).localeCompare(String(a.confirmed_at))||b.id.localeCompare(a.id))[0]??null;
}
/** A coach preference cannot raise the owner's workload cap or shorten owner's speed recovery. */
export function safeTuningBlock<T extends Record<string,any>>(owner:T, effective:T):T {
  return {...effective,cns_unit_cap:Math.min(owner.cns_unit_cap,effective.cns_unit_cap),speed_cadence_hours:Math.max(owner.speed_cadence_hours,effective.speed_cadence_hours)};
}
/** Preferences only clamp a legal doctrine dose; never create work or raise its safety ceiling. */
export function tuningDoseCaps(row:{sets:number|null;reps:number|null}, tune:TuningValues) {
  return {sets:typeof row.sets==='number'&&typeof tune.compound_max_sets==='number'?Math.min(row.sets,tune.compound_max_sets):row.sets,
    reps:typeof row.reps==='number'&&typeof tune.compound_max_reps==='number'?Math.min(row.reps,tune.compound_max_reps):row.reps};
}