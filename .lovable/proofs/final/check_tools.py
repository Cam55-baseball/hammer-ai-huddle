import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
OUT=Path('/dev-server/.lovable/proofs/final')
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True);c=await b.new_context(viewport={'width':390,'height':844});pg=await c.new_page()
  async def mock(r):
   u=r.request.url
   if '/src/integrations/supabase/client.ts' in u:
    await r.fulfill(content_type='application/javascript',body="""export const supabase={from(table){const q=new Proxy({}, {get(_,k){if(k==='then')return resolve=>resolve({data:JSON.parse(localStorage.getItem('fixture-'+table)||'[]'),error:null});return ()=>q;}});return q;},auth:{getSession:async()=>({data:{session:null}})},functions:{invoke:async()=>({data:{},error:null})}};""")
   elif '/src/hooks/useSubscription.ts' in u:await r.fulfill(content_type='application/javascript',body="export const useSubscription=()=>({modules:['baseball_hitting','baseball_pitching','baseball_throwing'],loading:false});")
   elif '/src/components/DashboardLayout.tsx' in u:await r.fulfill(content_type='application/javascript',body="export const DashboardLayout=({children})=>children;")
   elif '/src/hooks/usePerformanceSession.ts' in u:await r.fulfill(content_type='application/javascript',body="""export const usePerformanceSession=()=>({saving:false,createSession:async d=>{const row={id:'fixture-pickoff',fatigue_state_at_session:d.fatigue_state,micro_layer_data:d.micro_layer_data};localStorage.setItem('fixture-performance_sessions',JSON.stringify([row]));d.onRecorded?.(row.id);return row;}});""")
   elif '/pickoff-trainer?' in u:
    response=await r.fetch(url='http://localhost:8080/.lovable/proofs/final/harness.html');await r.fulfill(response=response,body=(await response.text()).replace('./harness.tsx','/.lovable/proofs/final/harness.tsx')+'<script>history.replaceState(null,"",location.pathname+location.search+"&kind=pickoff-tool")</script>')
   elif 'supabase.co' in u:await r.abort()
   else:await r.continue_()
  await c.route('**/*',mock)
  await pg.goto('http://localhost:8080/.lovable/proofs/final/harness.html?kind=pitching');await pg.wait_for_timeout(1500);await pg.locator('[data-pocket-tile]').click();await pg.get_by_role('button',name='Pick-off Trainer',exact=True).first.click();await pg.wait_for_timeout(1500);print(await pg.locator('iframe').get_attribute('src'));print([(f.url) for f in pg.frames]);print(await pg.frames[-1].locator('body').inner_text())
  fr=pg.frame_locator('iframe');await fr.get_by_role('combobox').first.click();await fr.get_by_role('option',name='1st Base',exact=True).click();await fr.get_by_role('combobox').nth(1).click();await fr.get_by_role('option',name='1B',exact=True).click();await pg.screenshot(path=str(OUT/'pickoff-launch.png'));await fr.get_by_role('button',name='Begin Session').click();await fr.get_by_role('button',name='Start Rep').click();await pg.wait_for_timeout(26000);await fr.get_by_role('button',name='Continue',exact=True).click();await fr.get_by_role('button',name='✓ Correct',exact=True).click();await pg.wait_for_timeout(300)
  if await fr.get_by_role('button',name='No',exact=True).count():await fr.get_by_role('button',name='No',exact=True).click();await fr.get_by_role('button',name='Yes',exact=True).click()
  await fr.get_by_role('button',name='Save Session & Exit',exact=True).click();await pg.screenshot(path=str(OUT/'pickoff-summary.png'));await fr.get_by_role('button',name='Save Session',exact=True).click();await pg.wait_for_timeout(800);assert await pg.locator('iframe').count()==0;assert await pg.get_by_text('Pick-off Trainer completed',exact=True).count()>0;await pg.screenshot(path=str(OUT/'pickoff-return-counted.png'));await pg.reload();await pg.wait_for_timeout(1000);assert await pg.get_by_text('Pick-off Trainer completed',exact=True).count()>0
  (OUT/'tools-result.json').write_text(json.dumps({'pickoff':True,'mock_persistence':True,'physical_decision_not_certified':True}));await b.close()
asyncio.run(main())
