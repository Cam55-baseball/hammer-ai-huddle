"""
No dead ends: opens every app address on a phone-size screen and FAILS if any
screen has no visible way back (Back, Close, Cancel, Exit, Done, Save & exit,
or a Dashboard link — the sidebar menu doesn't count). Same rule as
src/components/common/GlobalBackFallback.tsx.

Usage: python3 tests/e2e/navigation/back_everywhere.py [session.json]
Routes come from src/App.tsx (addresses with ":" parts are skipped).
"""
import asyncio, json, os, re, sys
from playwright.async_api import async_playwright

BASE = os.environ.get("APP_URL", "http://localhost:8080")
HOME = {"/", "/dashboard", "/index", "/auth", "/signup"}
CHECK = """() => {
  const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const sel = '[data-nav-back], a[href="/dashboard"], a[href="/"], button[aria-label*="back" i], button[aria-label*="close" i], a[aria-label*="back" i]';
  if ([...document.querySelectorAll(sel)].some(vis)) return true;
  const re = /^(back|close|cancel|exit|done|save & exit|go back|back to .+|←.*)$/i;
  return [...document.querySelectorAll('button,a')].some(e => vis(e) && re.test((e.textContent || '').trim()));
}"""

def routes():
    src = open("src/App.tsx").read()
    return sorted({r for r in re.findall(r'path="([^"]+)"', src) if ":" not in r and "*" not in r and r not in HOME})

async def main():
    sess = json.load(open(sys.argv[1])) if len(sys.argv) > 1 else None
    fails = []
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        pg = await (await b.new_context(viewport={"width": 390, "height": 844})).new_page()
        await pg.goto(BASE)
        if sess:
            await pg.evaluate(f"window.localStorage.setItem({json.dumps(sess['storage_key'])},{json.dumps(json.dumps(sess['session']))})")
        rs = routes()[int(os.environ.get("START", 0)):int(os.environ.get("END", 10**6))]
        for r in rs:
            try:
                await pg.goto(BASE + r, wait_until="domcontentloaded")
                ok = True
                try: await pg.wait_for_function(CHECK, timeout=int(os.environ.get("WAIT_MS", 15000)))  # slow test copy: give each screen time to load
                except Exception: ok = False
                path = pg.url.replace(BASE, "").split("?")[0]
                if path in HOME: continue  # redirected home — not a dead end
                if not ok: fails.append(f"{r} -> {path}")
            except Exception as e:
                fails.append(f"{r}: {e}")
        await b.close()
    print(f"checked {len(routes())} addresses; screens with no way back: {len(fails)}")
    for f in fails: print("  FAIL", f)
    sys.exit(1 if fails else 0)

asyncio.run(main())
