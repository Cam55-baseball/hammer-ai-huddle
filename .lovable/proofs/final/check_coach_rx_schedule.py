import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
OUT=Path('/dev-server/.lovable/proofs/final')
# Fixture mock: routes supabase tables and captures inserts/invokes for assertions.
# Inputs are fixtures, never engine outputs.
MOCK="""const kind=new URLSearchParams(location.search).get('kind');
const base={sender_id:'fixture-coach',recipient_id:'fixture-player',exercises:[{name:'Short-hop drill'}],gear_labels:['Glove'],source_template_id:'tpl-1',team_send_id:null,safety_result:null,created_at:'2026-10-24T00:00:00Z',cancelled_at:null};
const mine=[
{...base,id:'rx-any',category:'hitting',title:'Any-day hitting',status:'pending',schedule_type:'any_day',plan_date:'2026-10-24',series_id:null},
{...base,id:'rx-mwf',category:'fielding',title:'MWF fielding',status:'pending',schedule_type:'recurring',plan_date:'2026-10-26',series_id:'ser-1',recur_weekdays:[1,3,5],recur_count:12},
{...base,id:'rx-saved',category:'lift',title:'Saved lift',status:'saved_for_later',schedule_type:'date',plan_date:'2026-10-24',series_id:null}];
const sent=[
{...base,id:'s1',category:'hitting',title:'Hitting A',status:'used_instead',schedule_type:'date',plan_date:'2026-10-24',series_id:null,recipient_name:'Demo Player One',completion:{done:2,total:3},schedule:{}},
{...base,id:'s2',category:'pitching',title:'Bullpen B',status:'pending',schedule_type:'recurring',plan_date:'2026-10-26',series_id:'ser-9',recipient_name:'Demo Player Two',completion:{done:0,total:0},schedule:{recur_weekdays:[1,3,5],recur_count:12}},
{...base,id:'s3',category:'lift',title:'Lift C',status:'declined',schedule_type:'date',plan_date:'2026-10-23',series_id:null,recipient_name:'Demo Player One',completion:{done:0,total:0},schedule:{}}];
const DB={
coach_prescriptions:kind==='coach-workouts'?mine:[],
scout_follows:[{player_id:'p1'},{player_id:'p2'}],
org_athlete_assignments:[{athlete_user_id:'p3'}],
profiles:[{id:'p1',full_name:'Demo Player One'},{id:'p2',full_name:'Demo Player Two'},{id:'p3',full_name:'Assigned Athlete'}],
};
window.__inserts=[];window.__invokes=[];
export const supabase={
auth:{getUser:async()=>({data:{user:{id:kind==='coach-rx-status'||kind==='coach-rx-send'?'fixture-coach':'fixture-player'}}}),getSession:async()=>({data:{session:null},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
rpc:async()=>({data:null,error:null}),
channel:()=>({on(){return this;},subscribe(){return this;},unsubscribe(){}}),
removeChannel:async()=>{},
functions:{invoke:async(n,o)=>{const b=(o&&o.body)||{};window.__invokes.push(b);
if(b.mode==='manage'&&b.action==='list')return{data:{rows:sent},error:null};
if(b.mode==='manage')return{data:{applied:true},error:null};
if(b.prescription_id==='rx-mwf')return{data:{applied:false,verdict:'alongside_only',reasons:['Today is a rest day — no replacing.'],safeOption:'Safe option: add it alongside or pick a training day.'},error:null};
return{data:{applied:true,verdict:'allow',replaced:1},error:null};}},
from(t){const q=new Proxy({},{get(_,k){
if(k==='then')return r=>r({data:DB[t]??[],error:null});
if(k==='insert')return(rows)=>{window.__inserts=window.__inserts.concat(Array.isArray(rows)?rows:[rows]);return{error:null};};
return()=>q;}});return q;}
};"""
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True);c=await b.new_context(viewport={'width':390,'height':844});pg=await c.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
  async def mock(r):
   if '/src/integrations/supabase/client.ts' in r.request.url:await r.fulfill(content_type='application/javascript',body=MOCK)
   elif 'supabase.co' in r.request.url:await r.abort()
   else:await r.continue_()
  await c.route('**/*',mock)
  res={}
  # 1+2. Recurring Mon/Wed/Fri send and specific-date send: schedule picker + materialized days
  await pg.goto('http://localhost:8080/.lovable/proofs/final/harness.html?kind=coach-rx-send');await pg.wait_for_timeout(1500)
  assert await pg.get_by_text('Assigned Athlete').count()==1  # org-assigned athlete appears (case 6)
  res['org_admin_assigned_athlete_listed']=True
  await pg.locator('[data-sched-type="recurring"]').click();await pg.wait_for_timeout(200)
  for d in ['1','3','5']:await pg.locator(f'[data-weekday="{d}"]').click()
  await pg.locator('[data-recur-count]').fill('12');await pg.wait_for_timeout(200)
  assert 'Mon/Wed/Fri' in await pg.locator('[data-sched-summary]').inner_text()
  await pg.screenshot(path=str(OUT/'coach-rx-send-recurring.png'))
  await pg.get_by_text('Demo Player One').click();await pg.get_by_text('Demo Player Two').click()
  await pg.get_by_role('button',name='Send Activity').click();await pg.wait_for_timeout(600)
  ins=await pg.evaluate('()=>window.__inserts')
  dates=sorted({r['plan_date'] for r in ins})
  assert len(ins)==24, f'expected 12 days x 2 players, got {len(ins)}'
  assert dates[:3]==['2026-10-26','2026-10-28','2026-10-30'], dates[:3]
  assert len({r['series_id'] for r in ins})==1 and len({r['team_send_id'] for r in ins})==1
  res['recurring_mwf_send_materializes_days']=True;res['team_send_shared_ids']=True
  # specific-date send
  await pg.evaluate('()=>{window.__inserts=[]}')
  await pg.reload();await pg.wait_for_timeout(1500)
  await pg.locator('#rx-date').fill('2026-11-03')
  await pg.get_by_text('Demo Player One').click()
  await pg.get_by_role('button',name='Send Activity').click();await pg.wait_for_timeout(600)
  ins=await pg.evaluate('()=>window.__inserts')
  assert len(ins)==1 and ins[0]['plan_date']=='2026-11-03' and ins[0]['schedule_type']=='date', ins
  await pg.screenshot(path=str(OUT/'coach-rx-send-date.png'));res['specific_date_send']=True
  # 3. Any-day card activated from My Workouts (Use today → activate_today)
  await pg.goto('http://localhost:8080/.lovable/proofs/final/harness.html?kind=coach-workouts');await pg.wait_for_timeout(1200)
  assert await pg.get_by_text('From my coaches').count()==1
  assert await pg.get_by_text('Any day — you pick when').count()==1
  assert await pg.get_by_text('Saved for later').count()==1
  assert await pg.get_by_text('Saved lift').count()==1
  await pg.screenshot(path=str(OUT/'coach-workouts-home.png'))
  await pg.locator('[data-coach-workout="rx-any"]').get_by_role('button',name='Use today instead of my hitting card').click();await pg.wait_for_timeout(500)
  inv=await pg.evaluate('()=>window.__invokes')
  assert any(i.get('activate_today')==True and i.get('prescription_id')=='rx-any' for i in inv), inv
  res['any_day_activated_from_my_workouts']=True
  await pg.screenshot(path=str(OUT/'coach-workouts-activated.png'))
  # 4. Coach edits and cancels a future date; status view shows schedule + completion (case 7)
  await pg.goto('http://localhost:8080/.lovable/proofs/final/harness.html?kind=coach-rx-status');await pg.wait_for_timeout(1200)
  assert await pg.get_by_text('Sent workouts').count()==1
  assert await pg.get_by_text('Used instead of their card').count()==1
  assert await pg.get_by_text('Not yet answered').count()==1
  assert 'Mon/Wed/Fri' in await pg.locator('[data-sent-rx="s2"]').inner_text()
  assert 'Done: 2 of 3' in await pg.locator('[data-sent-rx="s1"]').inner_text()
  await pg.screenshot(path=str(OUT/'coach-rx-sent-view.png'));res['coach_status_view_with_schedule_completion']=True
  await pg.locator('[data-sent-rx="s2"] [data-edit-date]').fill('2026-10-27')
  await pg.locator('[data-sent-rx="s2"] [data-edit-save]').click();await pg.wait_for_timeout(400)
  inv=await pg.evaluate('()=>window.__invokes')
  assert any(i.get('action')=='reschedule' and i.get('new_date')=='2026-10-27' for i in inv), inv
  res['coach_edits_future_date']=True
  await pg.locator('[data-sent-rx="s2"] [data-cancel-rx]').click();await pg.wait_for_timeout(400)
  inv=await pg.evaluate('()=>window.__invokes')
  assert any(i.get('action')=='cancel' and i.get('prescription_id')=='s2' for i in inv), inv
  res['coach_cancels_future_date']=True
  await pg.screenshot(path=str(OUT/'coach-rx-sent-edited.png'))
  res['page_errors']=errors;res['viewport']=[390,844];res['fixture_only']=True
  assert not errors, errors
  (OUT/'coach-rx-schedule-result.json').write_text(json.dumps(res,indent=2));await b.close()
asyncio.run(main())
