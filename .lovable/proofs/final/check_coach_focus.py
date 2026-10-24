import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
OUT=Path('/dev-server/.lovable/proofs/final')
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True);c=await b.new_context(viewport={'width':390,'height':844});pg=await c.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
  async def mock(r):
   if '/src/integrations/supabase/client.ts' in r.request.url:await r.fulfill(content_type='application/javascript',body="export const supabase={auth:{getUser:async()=>({data:{user:null}})},from(){const q=new Proxy({}, {get(_,k){if(k==='then')return resolve=>resolve({data:[],error:null});return ()=>q;}});return q;}}")
   elif 'supabase.co' in r.request.url:await r.abort()
   else:await r.continue_()
  await c.route('**/*',mock);await pg.goto('http://localhost:8080/.lovable/proofs/final/harness.html?kind=coach');await pg.wait_for_timeout(1200);await pg.clock.install();await pg.get_by_role('button',name='Start',exact=True).click();await pg.get_by_placeholder('Reps').first.fill('8');await pg.wait_for_timeout(800)
  saved=json.loads(await pg.evaluate("localStorage.getItem('fixture-coach')"));assert saved['exerciseSets']['rep']['sets'][0]['reps']==8
  await pg.get_by_role('button',name='Next',exact=True).click();await pg.wait_for_timeout(150);cursor=json.loads(await pg.evaluate("sessionStorage.getItem('final-coach')"));assert cursor['restSeconds']==30;assert cursor['restingUntil']-cursor['restStartedAt']==30000;await pg.screenshot(path=str(OUT/'coach-focus-rest.png'))
  await pg.reload();await pg.wait_for_timeout(500);await pg.get_by_role('button',name='Start',exact=True).click();restored=json.loads(await pg.evaluate("sessionStorage.getItem('final-coach')"));assert restored['restingUntil']==cursor['restingUntil'];await pg.screenshot(path=str(OUT/'coach-focus-reload-rest.png'))
  await pg.clock.fast_forward(30200);await pg.wait_for_timeout(150);assert 'Set 2 of 3' in await pg.locator('[data-focus-session]').inner_text();await pg.screenshot(path=str(OUT/'coach-focus-advance.png'))
  await pg.get_by_role('button',name='Skip',exact=True).click();await pg.wait_for_timeout(100);assert 'Set 3 of 3' in await pg.locator('[data-focus-session]').inner_text();await pg.get_by_placeholder('Reps').last.fill('6');await pg.get_by_role('button',name='Save & exit',exact=True).click();await pg.wait_for_timeout(150);assert await pg.locator('[data-focus-session]').count()==0;await pg.reload();await pg.wait_for_timeout(500);await pg.get_by_role('button',name='Start',exact=True).click();assert 'Set 3 of 3' in await pg.locator('[data-focus-session]').inner_text();assert await pg.get_by_placeholder('Reps').last.input_value()=='6';await pg.screenshot(path=str(OUT/'coach-focus-save-exit-reload.png'));assert not errors
  (OUT/'coach-focus-result.json').write_text(json.dumps({'viewport':[390,844],'next_save_30s_rest_advance':True,'rest_cursor_survives_reload':True,'skip':True,'save_exit_entry_cursor_reload':True,'X':'not covered by standalone GuidedCustomExercises','page_errors':errors,'fixture_only':True},indent=2));await b.close()
asyncio.run(main())
