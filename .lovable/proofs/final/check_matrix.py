import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
OUT=Path('/dev-server/.lovable/proofs/final'); results=[]
CLIENT='''const saved=JSON.parse(localStorage.getItem('fixture-records')||'{}'); export const supabase={from(table){let op='read',body; const q=new Proxy({}, {get(_,k){if(k==='then')return (resolve)=>{let data=saved[table]||[];if(op!=='read'){data=[body];saved[table]=data;localStorage.setItem('fixture-records',JSON.stringify(saved));} if(table==='gp_games')data=[{id:'fixture-game'}];if(table==='gp_baserun_events')data=[{id:'fixture-steal'}];resolve({data,error:null});};return (...args)=>{if(['insert','upsert','update','delete'].includes(k)){op=k;body=args[0];}return q;};}}); return q;},functions:{invoke:async()=>({data:{},error:null})},auth:{getSession:async()=>({data:{session:null}})}};'''
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True);c=await b.new_context(viewport={'width':390,'height':844});page=await c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  async def mock(r):
   url=r.request.url
   if '/src/integrations/supabase/client.ts' in url:await r.fulfill(content_type='application/javascript',body=CLIENT)
   elif '/src/hooks/useSubscription.ts' in url:await r.fulfill(content_type='application/javascript',body="export const useSubscription=()=>({modules:['baseball_hitting','baseball_pitching','baseball_throwing'],loading:false});")
   elif 'supabase.co' in url:await r.abort()
   else:await r.continue_()
  await c.route('**/*',mock)
  for kind in ['lift','speed','speed-cap','conditioning','warmup','hitting','pitching','throwing','fielding','baserunning','recovery','coach','units','study-defender','study-baserunner','study-hitter','study-pitcher','study-softball-pitcher','study-populated']: 
   try:
    await page.goto('http://localhost:8080/.lovable/proofs/final/harness.html?kind='+kind);await page.wait_for_timeout(1700)
    if kind.startswith('study-'):
     await page.get_by_role('region',name='Royal timing study').wait_for();text=await page.locator('body').inner_text()
     if kind=='study-populated':assert 'logged game includes' in text and 'saved hitting focus' in text and 'saved range' in text
     if kind=='study-softball-pitcher':assert 'windmill' in text
     await page.screenshot(path=str(OUT/(kind+'.png')));results.append({'case':kind,'passed':True});continue
    if kind=='coach':await page.get_by_role('button',name='Start',exact=True).click();await page.get_by_placeholder('Reps').first.fill('8');await page.wait_for_timeout(800);assert json.loads(await page.evaluate("localStorage.getItem('fixture-coach')"))['exerciseSets']['rep']['sets'][0]['reps']==8;await page.screenshot(path=str(OUT/'coach-autosave.png'));results.append({'case':kind,'passed':True,'scope':'focus entry and continuous autosave; lifecycle not covered'});continue
    await page.locator('[data-pocket-tile]').click();await page.wait_for_timeout(250)
    text=await page.locator('[data-pocket-page]').inner_text();assert '(instructions below)' in text
    await page.screenshot(path=str(OUT/(kind+'-entries.png')))
    if kind=='units':
     for label in ['Reps per leg 1','Press reps 1','Steps each way 1','Steps 1','Distance 1']:assert await page.get_by_label(label,exact=True).count()>0
     for slug in ['walking_lunge','lift_rfess_pallof','lift_banded_lateral_squat_walk','lift_elephant_walk','lift_farmer_toe_walk','broad_jump','plank_hold','ubp_f15_base_pushup_bottom_hold_explode','tall_plank_shoulder_tap']:
      await page.get_by_text(slug,exact=True).locator('..').locator('..').screenshot(path=str(OUT/(slug+'-field.png')))
     assert await page.get_by_label('Seconds 1 seconds',exact=True).input_value()=='30'; await page.get_by_label('Distance 1',exact=True).fill('15'); assert await page.get_by_label('Distance 1',exact=True).input_value()=='15'; await page.get_by_label('Distance 1',exact=True).screenshot(path=str(OUT/'units-yards.png')); await page.get_by_role('group',name='Jump distance 1',exact=True).screenshot(path=str(OUT/'units-jump.png'))
     results.append({'case':kind,'passed':True});await page.get_by_role('button',name='Close',exact=True).first.click();continue
    await page.clock.install();await page.get_by_role('button',name='Start',exact=True).click();await page.wait_for_timeout(200)
    await page.screenshot(path=str(OUT/(kind+'-focus.png')))
    inputs=page.locator('[data-entry-row="prescribed"] input:visible')
    for inp in await inputs.all():await inp.fill('8')
    await page.locator('[data-focus-session]').get_by_role('button',name='Next',exact=True).click();await page.wait_for_timeout(800)
    cursor=json.loads(await page.evaluate('(k)=>sessionStorage.getItem(k)',f'hm-focus:2026-10-24:{kind}'))
    await page.screenshot(path=str(OUT/(kind+'-next.png')))
    expected=180 if kind=='speed' else 300 if kind=='speed-cap' else 30 if kind in ['conditioning','warmup','recovery'] else 45
    assert cursor['restSeconds']==expected,(kind,cursor)
    await page.reload();await page.wait_for_timeout(500);await page.get_by_role('button',name='Start',exact=True).click()
    restored=json.loads(await page.evaluate('(k)=>sessionStorage.getItem(k)',f'hm-focus:2026-10-24:{kind}'));assert restored['restingUntil']==cursor['restingUntil']
    await page.clock.fast_forward(expected*1000+200);await page.wait_for_timeout(100)
    assert 'Set 2' in await page.locator('[data-focus-session]').inner_text()
    await page.screenshot(path=str(OUT/(kind+'-advance.png')))
    if kind=='conditioning':
     for row in [2,3,4]:
      for inp in await page.locator('[data-entry-row="prescribed"] input:visible').all():await inp.fill('8')
      await page.locator('[data-focus-session]').get_by_role('button',name='Next',exact=True).click();await page.wait_for_timeout(100)
      value=json.loads(await page.evaluate('(k)=>sessionStorage.getItem(k)',f'hm-focus:2026-10-24:{kind}'));assert value['restSeconds']==(300 if row==4 else 30)
      await page.screenshot(path=str(OUT/(kind+'-base-'+str(row)+'.png')))
      await page.clock.fast_forward(value['restSeconds']*1000+200)
    await page.locator('[data-focus-session]').get_by_role('button',name='Skip',exact=True).click();await page.wait_for_timeout(100)
    await page.locator('[data-focus-session]').get_by_role('button',name='Save & exit',exact=True).click();assert await page.locator('[data-pocket-page]').count()==0
    await page.locator('[data-pocket-tile]').click();await page.get_by_role('button',name='Close',exact=True).first.click();assert await page.locator('[data-pocket-page]').count()==0
    results.append({'case':kind,'passed':True,'rest_seconds':expected,'scope':'Next/save/rest/advance/reload/Skip/save-exit/X'})
   except Exception as e:results.append({'case':kind,'passed':False,'error':str(e)[:700], 'trace':__import__('traceback').format_exc()[-1200:]});await page.screenshot(path=str(OUT/(kind+'-failure.png')))
   await page.evaluate('localStorage.clear();sessionStorage.clear()')
  (OUT/'matrix-final.json').write_text(json.dumps({'viewport':[390,844],'results':results,'page_errors':errors},indent=2));print(json.dumps(results,indent=2));await b.close()
asyncio.run(main())
