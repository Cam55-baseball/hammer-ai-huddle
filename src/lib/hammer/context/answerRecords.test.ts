import { beforeEach, describe, expect, it, vi } from 'vitest';
const store=vi.hoisted(()=>({rows:{} as Record<string,Record<string,any>>,writes:[] as {table:string;payload:any}[]}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{
  auth:{getSession:async()=>({data:{session:{user:{id:'test-player'},access_token:'mock',expires_at:9999999999}}})},
  from:(table:string)=>{
    const q:any={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:store.rows[table]??null,error:null}),single:async()=>({data:store.rows[table],error:null}),
      upsert:(payload:any)=>{store.writes.push({table,payload});store.rows[table]={...store.rows[table],...payload};return q;},
      then:(resolve:any)=>Promise.resolve({data:store.rows[table],error:null}).then(resolve)};
    return q;
  },
}}));
import { persistContextAnswer } from './acquisition';
describe('Nov3 one saved answer record',()=>{
 beforeEach(()=>{store.rows={athlete_context:{sport_primary:'softball'}};store.writes=[];});
 it.each([['sport_primary','softball'],['position_primary','SS'],['competition_level','high_school']])('%s saves once in the identity record',async(key,value)=>{
   await persistContextAnswer('test-player',key,value,'profile_setup');
   expect(store.writes.filter(w=>w.table==='athlete_context')).toHaveLength(1);
   expect(store.rows.athlete_context[key]).toBe(value);
 });
 it.each([['bats_hand','L','primary_batting_side'],['throws_hand','R','primary_throwing_hand']])('%s retains one answer and derives the compatibility side',async(key,value,derived)=>{
   await persistContextAnswer('test-player',key,value,'profile_setup');
   expect(store.writes.filter(w=>w.table==='athlete_context')).toHaveLength(1);
   expect(store.rows.athlete_context[key]).toBe(value);
   expect(store.rows.athlete_mpi_settings[derived]).toBe(value);
 });
 it('the old season question writes only the canonical season record',async()=>{
   await persistContextAnswer('test-player','season_phase','in','finish_profile');
   expect(store.writes).toHaveLength(1);
   expect(store.writes[0].table).toBe('athlete_mpi_settings');
   expect(store.rows.athlete_mpi_settings.season_status).toBe('in_season');
   expect(store.rows.athlete_context.season_phase).toBeUndefined();
 });
});