import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        c = await b.new_context(viewport={"width": 390, "height": 1800})
        pg = await c.new_page()
        errs = []
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        await pg.goto("http://localhost:8080/__evidence/execution", wait_until="domcontentloaded")
        await pg.wait_for_timeout(9000)
        print("BODYCLASS", await pg.evaluate("document.documentElement.className"))
        print("COLOR", await pg.evaluate("getComputedStyle(document.querySelector(\"main h1\")).color"))
        for btn in await pg.query_selector_all("button[aria-expanded='false'], [data-state='closed']"):
            try:
                await btn.click()
                await pg.wait_for_timeout(200)
            except Exception:
                pass
        await pg.wait_for_timeout(1200)
        await pg.screenshot(path="/tmp/browser/exec-evidence/shot.png")
        print(await pg.inner_text("main"))
        print("CONSOLE ERRORS:", errs[:5])
        await b.close()

asyncio.run(main())
