import { describe, it, expect } from 'vitest';
import { placeOwnerConditioning } from '../../../../supabase/functions/_shared/wic/conditioning/placeOwnerConditioning';
const catalog = [
  { slug:'jump', exposure_channel:'elastic', plyo_tier:3, contacts_per_rep:1 },
  { slug:'carry', category:'carry' },
  { slug:'sled', speed_category:'resisted', exposure_channel:'sprint' },
];
const rows = [ {movement_slug:'jump',slot:'plyo',sets:3,reps:10}, {movement_slug:'carry',slot:'lift',sets:3,reps:1}, {movement_slug:'sled',slot:'speed',sets:3,reps:1}, {movement_slug:'base',slot:'conditioning',sets:20,reps:1,distance_feet:90} ];
const owners = ['jump','carry','sled'].map(kind => ({ id:kind,name:`Owner ${kind}`,active:true,placements:['hammers_today:conditioning'],sports:['baseball'],equipment:[],conditioning_kind:kind,rounds:4,contacts:8,carry_yards:100,load_lbs:30,work_seconds:20,rest_seconds:60,conditioning_programs:['pitcher'],pitch_role_fit:['starter'] }));
const ctx = {sport:'baseball',isPitcher:true,modules:['baseball_pitcher'],role:'starter',date:'2026-11-02',low:false,rest:false,game:false,restricted:false,equipment:[]};
describe('owner jump carry sled placement', () => {
  it('places every kind and never exceeds source contacts or 1000 combined yards', () => {
    const out=placeOwnerConditioning(rows,catalog,owners,ctx).rows;
    expect(out.slice(0,3).map(r=>r.movement_slug)).toEqual(['owner_cond_jump','owner_cond_carry','owner_cond_sled']);
    expect(out[0].sets*(out[0].reps??1)).toBe(24);
    expect(out.reduce((n,r)=>n+r.sets*(r.reps??1)*((r as any).distance_feet??0)/3,0)).toBeLessThanOrEqual(1000);
  });
  it('low readiness halves owner rounds',()=>expect(placeOwnerConditioning(rows,catalog,owners,{...ctx,low:true}).rows.slice(0,3).map(r=>r.sets)).toEqual([2,2,2]));
  for(const flag of ['rest','game','restricted'] as const)it(`no owner hard work on ${flag}`,()=>expect(placeOwnerConditioning(rows,catalog,owners,{...ctx,[flag]:true}).rows).toEqual(rows));
  it('rejects wrong program and unknown role',()=>{
    expect(placeOwnerConditioning(rows,catalog,owners,{...ctx,modules:['baseball_5tool']}).rows).toEqual(rows);
    expect(placeOwnerConditioning(rows,catalog,owners,{...ctx,role:null}).rows).toEqual(rows);
  });
});