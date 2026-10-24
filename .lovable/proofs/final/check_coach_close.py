import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
OUT=Path('/dev-server/.lovable/proofs/final')
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True);c=await b.new_context(viewport={'width':390,'height':844});pg=await c.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(e.stack))
  async def mock(r):
   if '/src/integrations/supabase/client.ts' in r.request.url:await r.fulfill(content_type='application/javascript',body="export const supabase={auth:{getUser:async()=>({data:{user:null}})},from(){const q=new Proxy({}, {get(_,k){if(k==='then')return resolve=>resolve({data:[],error:null});return ()=>q;}});return q;}}")
   elif 'supabase.co' in r.request.url:await r.abort()
   else:await r.continue_()
  await c.route('**/*',mock);await pg.goto('http://localhost:8080/.lovable/proofs/final/harness.html?kind=coach-detail');await pg.wait_for_timeout(1200);print(await pg.locator('body').inner_text());print(errors);await pg.get_by_role('button',name='Start',exact=True).click();await pg.get_by_placeholder('Reps').first.fill('8');await pg.wait_for_timeout(800);await pg.get_by_role('button',name='Next',exact=True).click();await pg.wait_for_timeout(200);before=json.loads(await pg.evaluate("sessionStorage.getItem('hm-focus-coach:fixture-player:fixture-task:2026-10-24')"));assert before['restSeconds']==30;await pg.screenshot(path=str(OUT/'coach-detail-before-X.png'));await pg.get_by_role('button',name='Close',exact=True).click();await pg.wait_for_timeout(300);assert await pg.get_by_role('dialog').count()==0;await pg.get_by_role('button',name='Open coach card').click();await pg.get_by_role('button',name='Start',exact=True).click();after=json.loads(await pg.evaluate("sessionStorage.getItem('hm-focus-coach:fixture-player:fixture-task:2026-10-24')"));assert after['restingUntil']==before['restingUntil'];await pg.screenshot(path=str(OUT/'coach-detail-X-return.png'));await pg.reload();await pg.wait_for_timeout(600);await pg.get_by_role('button',name='Start',exact=True).click();assert json.loads(await pg.evaluate("localStorage.getItem('fixture-coach-detail')"))['exerciseSets']['rep']['sets'][0]['reps']==8;await pg.screenshot(path=str(OUT/'coach-detail-X-reload.png'));assert not errors;(OUT/'coach-close-result.json').write_text(json.dumps({'viewport':[390,844],'real_coach_detail_X':True,'reopen_keeps_rest':True,'reload_keeps_saved_work':True,'fixture_only':True,'page_errors':errors},indent=2));await b.close()
asyncio.run(main())
