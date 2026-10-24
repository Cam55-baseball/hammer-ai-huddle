import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
OUT=Path('/dev-server/.lovable/proofs/final')
MOCK="""const kind=new URLSearchParams(location.search).get('kind');
const base={sender_id:'fixture-coach',recipient_id:'fixture-player',plan_date:'2026-10-24',exercises:[{name:'Tee work'}],gear_labels:[],source_template_id:null,team_send_id:null,safety_result:null,created_at:'2026-10-24T00:00:00Z'};
const inbox=[
{...base,id:'rx-hit',category:'hitting',title:'Coach hitting work',status:'pending'},
{...base,id:'rx-pitch',category:'pitching',title:'Coach bullpen',status:'pending'},
{...base,id:'rx-lift',category:'lift',title:'Coach lift',status:'pending'}];
const sent=[
{...base,id:'s1',category:'hitting',title:'Hitting A',status:'used_instead'},
{...base,id:'s2',category:'pitching',title:'Bullpen B',status:'added_alongside'},
{...base,id:'s3',category:'lift',title:'Lift C',status:'saved_for_later'},
{...base,id:'s4',category:'speed',title:'Speed D',status:'declined'}];
const rows=kind==='coach-rx-status'?sent:inbox;
export const supabase={
auth:{getUser:async()=>({data:{user:{id:'fixture-player'}}})},
functions:{invoke:async(n,o)=>{const id=o&&o.body&&o.body.prescription_id;
if(id==='rx-pitch')return{data:{applied:false,verdict:'alongside_only',reasons:['Your arm needs rest from throwing until 2026-10-26 (pitch-count rest rule).'],safeOption:'Safe option: save it for 2026-10-26 or later.'},error:null};
return{data:{applied:true,verdict:'allow',replaced:2},error:null};}},
from(t){const q=new Proxy({},{get(_,k){if(k==='then')return r=>r({data:t==='coach_prescriptions'?rows:[],error:null});return()=>q;}});return q;}
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
  # 1. Inbox: three pending prescriptions with three choices each
  await pg.goto('http://localhost:8080/.lovable/proofs/final/harness.html?kind=coach-rx-inbox');await pg.wait_for_timeout(1200)
  assert await pg.get_by_text('From your coach').count()==1
  assert await pg.get_by_text('Coach hitting work').count()==1
  assert await pg.get_by_role('button',name='Use instead of my hitting card').count()==1
  assert await pg.get_by_role('button',name='Use instead of my pitching card').count()==1
  assert await pg.get_by_role('button',name='Use instead of my lifting card').count()==1
  await pg.screenshot(path=str(OUT/'coach-rx-inbox.png'));res['inbox_three_choices']=True
  # 2. Hitting replace allowed
  await pg.get_by_role('button',name='Use instead of my hitting card').click();await pg.wait_for_timeout(400)
  assert await pg.locator('[role="alert"]').count()==0;res['hitting_replace_allowed']=True
  await pg.screenshot(path=str(OUT/'coach-rx-hitting-replace.png'))
  # 3. Pitching replace blocked by throw counts, safe option shown
  await pg.get_by_role('button',name='Use instead of my pitching card').click();await pg.wait_for_timeout(400)
  alert=pg.locator('[data-coach-rx="rx-pitch"] [role="alert"]')
  assert await alert.count()==1
  txt=await alert.inner_text()
  assert 'arm needs rest' in txt and '2026-10-26' in txt and 'Safe option' in txt
  await pg.screenshot(path=str(OUT/'coach-rx-pitching-blocked.png'));res['pitching_blocked_with_safe_option']=True
  # 4. Lift added alongside
  await pg.locator('[data-coach-rx="rx-lift"]').get_by_role('button',name='Add alongside').click();await pg.wait_for_timeout(400)
  assert await pg.locator('[data-coach-rx="rx-lift"] [role="alert"]').count()==0;res['lift_added_alongside']=True
  # 5. Coach status view: four statuses
  await pg.goto('http://localhost:8080/.lovable/proofs/final/harness.html?kind=coach-rx-status');await pg.wait_for_timeout(1000)
  for label in ['Used instead of their card','Added alongside','Saved for later','Declined']:
   assert await pg.get_by_text(label).count()>=1, label
  await pg.screenshot(path=str(OUT/'coach-rx-status.png'));res['coach_status_view']=True
  # 6. Replaced card label, never "missed"
  await pg.goto('http://localhost:8080/.lovable/proofs/final/harness.html?kind=replaced-card');await pg.wait_for_timeout(1200)
  assert await pg.get_by_text('Replaced by coach workout',exact=False).count()>=1
  assert 'not missed' in await pg.locator('[data-replaced-by-coach]').inner_text()
  await pg.screenshot(path=str(OUT/'coach-rx-replaced-card.png'));res['replaced_card_label']=True
  res['page_errors']=errors;res['viewport']=[390,844];res['fixture_only']=True
  assert not errors, errors
  (OUT/'coach-rx-result.json').write_text(json.dumps(res,indent=2));await b.close()
asyncio.run(main())
