import asyncio,json,os
from playwright.async_api import async_playwright
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True);c=await b.new_context(viewport={'width':390,'height':844});pg=await c.new_page()
  with open(os.path.expanduser('~/.cache/lovable-auth/session.json')) as f:m=json.load(f)
  await pg.goto('http://localhost:8080');await pg.evaluate('([k,v])=>localStorage.setItem(k,v)',[m['storage_key'],json.dumps(m['session'])]);await pg.goto('http://localhost:8080/dashboard');await pg.wait_for_timeout(25000)
  print('TILES',await pg.locator('[data-pocket-tile]').evaluate_all('(els)=>els.map(e=>({id:e.getAttribute("data-pocket-tile"),text:e.textContent}))'))
  for tile in await pg.locator('[data-pocket-tile]').all():
   id=await tile.get_attribute('data-pocket-tile');await tile.click();await pg.wait_for_timeout(1500);d=pg.locator('[data-pocket-page]');print('CARD',id,(await d.inner_text())[:8000]);print('INPUTS',await d.locator('input').evaluate_all('(els)=>els.map(e=>({aria:e.getAttribute("aria-label"),value:e.value}))'));await d.screenshot(path=f'/tmp/browser/oct24-cleanup/college-{id}.png');await d.get_by_role('button',name='Close',exact=True).click()
  await b.close()
asyncio.run(main())
