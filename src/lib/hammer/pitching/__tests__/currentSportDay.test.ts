import { it, expect, vi } from 'vitest';
const compose=vi.hoisted(()=>vi.fn().mockResolvedValue({payload:{blocks:[]}}));
vi.mock('../../../../../supabase/functions/_shared/composeSportDay',()=>({composeSportDay:compose}));
import { currentSportDay } from '../../../../../supabase/functions/_shared/planSwap/currentSportDay';
function db(fail=false){return {from:(table:string)=>{
 const singleton:Record<string,any>={pitcher_schedule_settings:{role:'starter',pitching_role:'starter',rotation_anchor_date:'2026-11-04',rotation_every_days:7,rotation_active:true,primary_focus:'pitcher',limit_pitching:false},profiles:{date_of_birth:'2000-01-01'},athlete_context:{season_phase:'in_season',injury_history:[],weekly_availability_days:6},athlete_mpi_settings:{season_status:'in_season'},athlete_daily_log:{readiness:.8},wk_cns_ledger:{units_spent:0}};
 const result={data:singleton[table]??[],error:fail&&table==='pitcher_schedule_settings'?{message:'read failed'}:null};
 const q:any={then:(ok:any,no:any)=>Promise.resolve(result).then(ok,no),maybeSingle:()=>Promise.resolve(result)};
 for(const method of ['select','eq','gte','lte','or','in','is','order','limit'])q[method]=()=>q;
 return q;
}};}
it('fresh Swap composition receives starter role, pre-start date and canonical in-season phase',async()=>{
 await currentSportDay(db(),'test','2026-11-03','baseball',[],[]);
 expect(compose).toHaveBeenCalledWith(expect.anything(),expect.objectContaining({phase:'in_season',rest:false,outingFacts:expect.objectContaining({pitchingRole:'starter',startsTomorrow:true,primaryFocus:'pitcher'})}));
});
it('incomplete fresh role context blocks Swap instead of using a saved card',async()=>{
 await expect(currentSportDay(db(true),'test','2026-11-03','baseball',[],[])).rejects.toEqual({message:'read failed'});
});