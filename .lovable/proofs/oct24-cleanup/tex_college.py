import asyncio,json,os
from playwright.async_api import async_playwright
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True);c=await b.new_context(viewport={'width':390,'height':844});pg=await c.new_page()
  with open(os.path.expanduser('~/.cache/lovable-auth/session.json')) as f:m=json.load(f)
  await pg.goto('http://localhost:8080');await pg.evaluate('([k,v])=>localStorage.setItem(k,v)',[m['storage_key'],json.dumps(m['session'])]);await pg.goto('http://localhost:8080/dashboard');await pg.wait_for_timeout(25000)
  await pg.locator('[data-pocket-tile="block_hitting_x"]').click();d=pg.locator('[data-pocket-page]');await d.get_by_role('button',name='Start',exact=True).click()
  await d.get_by_role('button',name='Dry swings — barrel path',exact=True).click()
  await pg.wait_for_timeout(1000)
  print('BUTTONS',await d.get_by_role('button').all_text_contents())
  buttons=d.get_by_role('button',name='Tex Vision session',exact=True)
  if await buttons.count():
   await buttons.first.click();await pg.wait_for_timeout(15000);fr=pg.frames[-1];print('TEX', (await fr.locator('body').inner_text())[:14000]);print('TEXBUTTONS',await fr.get_by_role('button').all_text_contents());await pg.screenshot(path='/tmp/browser/oct24-cleanup/tex-in-card.png')
   await b.close()
asyncio.run(main())
