// @vitest-environment node
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
const one='10000000-0000-0000-0000-000000000001',two='10000000-0000-0000-0000-000000000002',player='20000000-0000-0000-0000-000000000001',outside='20000000-0000-0000-0000-000000000002';
let db:PGlite;
async function asCoach(id:string){await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);}
async function prepare(p:string|null,n:number){const r=await db.query<{r:any}>('select public.coach_phase_prepare($1,\'os_q1\',$2::jsonb) r',[p,JSON.stringify({compound_max_sets:n})]);return r.rows[0].r;}
async function confirm(id:string){const r=await db.query<{r:any}>('select public.coach_phase_confirm($1,true,true) r',[id]);return r.rows[0].r;}
async function effective(){const r=await db.query<{r:any}>('select public.coach_phase_effective($1,\'os_q1\') r',[player]);return r.rows[0].r;}
describe('actual PostgreSQL coach permission and transactions',()=>{
 beforeAll(async()=>{
  db=new PGlite();
  await db.exec(`CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;
   CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$select 'authenticated'::text$$;
   CREATE TABLE public.profiles(id uuid primary key,first_name text,last_name text);
   CREATE TABLE public.user_roles(user_id uuid,role text,status text);
   CREATE TABLE public.user_blocks(blocker_id uuid,blocked_id uuid);
   CREATE TABLE public.connection_requests(kind text,status text,from_user uuid,to_user uuid);
   CREATE TABLE public.scout_follows(scout_id uuid,player_id uuid,status text,relationship_type text);
   CREATE TABLE public.organization_members(organization_id uuid,user_id uuid,status text);
   CREATE TABLE public.org_athlete_assignments(organization_id uuid,coach_user_id uuid,athlete_user_id uuid,revoked_at timestamptz);
   CREATE TABLE public.wk_periodization_blocks(phase text,compound_min_sets int,compound_max_sets int,compound_min_reps int,compound_max_reps int,cns_unit_cap int,speed_cadence_hours int);
   INSERT INTO public.wk_periodization_blocks VALUES('os_q1',2,5,2,5,4,48);
   INSERT INTO public.profiles VALUES('${one}','First','Coach'),('${two}','Second','Coach'),('${player}','TEST','Player'),('${outside}','TEST','Outside');
   INSERT INTO public.user_roles VALUES('${one}','coach','active'),('${two}','coach','active');
   INSERT INTO public.connection_requests VALUES('coach_player','accepted','${one}','${player}'),('coach_player','accepted','${two}','${player}');`);
  await db.exec(readFileSync('drizzle/migrations/0190_connected_coach_periodization.sql','utf8'));
  await asCoach(one);
 },60_000);
 afterAll(async()=>{await db?.close();});
 it('server refuses an unconnected player even with a crafted RPC',async()=>{await expect(prepare(outside,3)).rejects.toThrow('Active coach-player connection required');});
 it('server refuses missing second confirmation',async()=>{const r=await prepare(player,3);await expect(db.query('select coach_phase_confirm($1,true,false)',[r.id])).rejects.toThrow('Two confirmations required');});
 it('roster < individual; latest individual coach wins; Undo restores previous',async()=>{
   const roster=await prepare(null,4);expect(roster.targets).toEqual([player]);await confirm(roster.id);expect((await effective()).source).toBe('roster');
   const individual=await prepare(player,3);await confirm(individual.id);expect((await effective()).settings.compound_max_sets).toBe(3);
   await asCoach(two);const latest=await prepare(player,2);await confirm(latest.id);const current=await effective();expect(current.coach_id).toBe(two);expect(current.coach_name).toBe('Second Coach');expect(current.changed_at).toBeTruthy();
   await db.query('select coach_phase_undo($1)',[latest.id]);expect((await effective()).coach_id).toBe(one);expect((await effective()).settings.compound_max_sets).toBe(3);
 });
 it('a revoked connection blocks a previously prepared confirmation',async()=>{
   await asCoach(one);const r=await prepare(player,4);await db.query("update connection_requests set status='revoked' where from_user=$1",[one]);
   await expect(confirm(r.id)).rejects.toThrow('Connection changed');
 });
});