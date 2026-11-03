import {describe,expect,it} from 'vitest';
import {winningTuning,safeTuningBlock,tuningDoseCaps,type CoachTuning} from '../../../supabase/functions/_shared/wic/coachPeriodization';
const row=(id:string,coach:string,player:string|null,date:string):CoachTuning=>({id,coach_id:coach,athlete_id:player,confirmed_at:date,undone_at:null,settings:{compound_max_sets:3}});
describe('owner Nov3 scoped coach periodization',()=>{
 it('a non-connected coach never wins',()=>expect(winningTuning([row('a','outsider','player','2026-11-03')],'player',new Set(['coach']))).toBeNull());
 it('individual outranks a newer roster setting',()=>expect(winningTuning([row('individual','coach','player','2026-11-01'),row('roster','coach',null,'2026-11-03')],'player',new Set(['coach']))?.id).toBe('individual'));
 it('roster wins over owner when there is no individual tuning',()=>expect(winningTuning([row('roster','coach',null,'2026-11-03')],'player',new Set(['coach']))?.id).toBe('roster'));
 it('two coaches use the latest change in the same scope',()=>expect(winningTuning([row('old','one','player','2026-11-01'),row('new','two','player','2026-11-03')],'player',new Set(['one','two']))?.id).toBe('new'));
 it('Undo restores the preceding winner',()=>expect(winningTuning([row('old','one','player','2026-11-01'),{...row('new','two','player','2026-11-03'),undone_at:'2026-11-04'}],'player',new Set(['one','two']))?.id).toBe('old'));
 it('review drafts never affect a player',()=>expect(winningTuning([{...row('draft','one',null,'2026-11-03'),confirmed_at:null}],'player',new Set(['one']))).toBeNull());
 it('workload and recovery cannot be loosened',()=>expect(safeTuningBlock({cns_unit_cap:6,speed_cadence_hours:96},{cns_unit_cap:100,speed_cadence_hours:1})).toEqual({cns_unit_cap:6,speed_cadence_hours:96}));
 it('coach dose never exceeds the already legal dose',()=>expect(tuningDoseCaps({sets:3,reps:5},{compound_max_sets:9,compound_max_reps:20})).toEqual({sets:3,reps:5}));
});