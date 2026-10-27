"""Real owner UI fixture test. Requires an original clip and a minted owner session.
Run: ANALYSIS_FIXTURE=/path/original.mov python3 e2e/analysis-upload.py
Never switches models, fakes responses, seeds findings or bypasses app access.
"""
import asyncio, json, os
from pathlib import Path
from playwright.async_api import async_playwright

async def main():
    fixture = Path(os.environ["ANALYSIS_FIXTURE"])
    module = os.environ.get("ANALYSIS_MODULE", "hitting")
    sport = os.environ.get("ANALYSIS_SPORT", "baseball")
    output = Path(f"/tmp/browser/analysis-fixture-{sport}-{module}")
    output.mkdir(parents=True, exist_ok=True)
    if os.environ.get("LOVABLE_BROWSER_AUTH_STATUS") == "injected":
        session = {"storage_key": os.environ["LOVABLE_BROWSER_SUPABASE_STORAGE_KEY"], "session": json.loads(os.environ["LOVABLE_BROWSER_SUPABASE_SESSION_JSON"])}
    else:
        session = json.loads(Path.home().joinpath(".cache/lovable-auth/session.json").read_text())
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 390, "height": 844})
        page = await context.new_page()
        await page.goto("http://localhost:8080")
        await page.evaluate("([k,v])=>localStorage.setItem(k,v)", [session["storage_key"], json.dumps(session["session"])])
        await page.goto(f"http://localhost:8080/analyze/{module}?sport={sport}")
        await page.locator("#video-upload").set_input_files({"name": fixture.name, "mimeType": "video/quicktime" if fixture.suffix.lower() == ".mov" else "video/mp4", "buffer": fixture.read_bytes()}, timeout=120000)
        await page.get_by_role("button", name="Upload & Analyze Video", exact=True).wait_for(timeout=120000)
        right = page.get_by_role("button", name="Right", exact=True)
        if await right.count(): await right.click()
        async with page.expect_response(lambda r: "/functions/v1/analyze-video" in r.url and r.request.method == "POST", timeout=240000) as pending:
            await page.get_by_role("button", name="Upload & Analyze Video", exact=True).click()
        response = await pending.value
        result = await response.json()
        assert response.ok, f"Analysis returned HTTP {response.status}"
        assert result.get("saved") is True, "Report persistence was not confirmed"
        report = result.get("ai_analysis") or result
        assert report.get("feedback", "").strip(), "No report feedback"
        await page.wait_for_timeout(2000)
        assert await page.get_by_text("What to work on", exact=True).count() or await page.get_by_text("Key Findings", exact=False).count(), "Saved report did not display"
        for title in ["Watch this next", "Save to Library"]:
            dialog = page.get_by_role("dialog").filter(has=page.get_by_text(title, exact=False))
            if await dialog.count():
                close = dialog.get_by_role("button", name="Close", exact=True)
                if await close.count(): await close.first.click()
        await page.keyboard.press("Escape")
        finding = page.get_by_text("What to work on", exact=True)
        if await finding.count(): await finding.scroll_into_view_if_needed()
        await page.screenshot(path=str(output / "saved-displayed.png"))
        request_body = response.request.post_data_json
        output.joinpath("result.json").write_text(json.dumps({"video_id": request_body["videoId"], "saved": True, "displayed": True}))
        # Saving is optional and only happens AFTER the full report appeared.
        output.joinpath("result.json").write_text(json.dumps({"video_id": request_body["videoId"], "saved": True, "displayed": True, "club_saved": False}))
        await page.get_by_role("button", name="Save to Players Club", exact=False).first.click()
        dialog = page.get_by_role("dialog")
        await dialog.locator("#title").fill(f"TEST P0 {sport} {module} {request_body['videoId']}")
        async with page.expect_response(lambda r: "/functions/v1/update-library-session" in r.url and r.request.method == "POST") as library_pending:
            await dialog.get_by_role("button", name="Upload to Library", exact=False).click()
        library_response = await library_pending.value
        assert library_response.ok, f"Optional library save returned HTTP {library_response.status}"
        title = f"TEST P0 {sport} {module} {request_body['videoId']}"
        for reload in [False, True]:
            if reload: await page.reload()
            else: await page.goto("http://localhost:8080/players-club")
            await page.get_by_text(title, exact=True).wait_for(timeout=30000)
            card = page.locator('div').filter(has=page.get_by_text(title, exact=True)).filter(has=page.get_by_role('button', name='View', exact=True))
            await card.last.get_by_role('button', name='View', exact=True).click()
            saved_report = page.get_by_role("region", name="Saved analysis report")
            await saved_report.wait_for(timeout=30000)
            assert report["feedback"] in await saved_report.inner_text(), "Saved report changed or disappeared"
            await saved_report.scroll_into_view_if_needed()
            await page.screenshot(path=str(output / ("club-reload.png" if reload else "club-open.png")))
        output.joinpath("result.json").write_text(json.dumps({"video_id": request_body["videoId"], "saved": True, "displayed": True, "club_saved": True, "club_reloaded": True}))
        if os.environ.get("REGISTER_ANALYSIS_CANARY") == "1":
            owner = session['session']['user']['id']
            origin = response.url.split('/functions/v1/')[0]
            headers = {"Authorization": f"Bearer {session['session']['access_token']}", "apikey": response.request.headers.get('apikey', '')}
            registered = await page.request.post(f"{origin}/functions/v1/analysis-canary-configure", headers={**headers,"Content-Type":"application/json"}, data=json.dumps({"videoId":request_body['videoId'],"request":request_body,"testFixture":True}))
            assert registered.ok, "Canary TEST fixture registration failed"
        print(f"PASS: {sport} {module} original uploaded, full report shown, optional Players Club save opened with report and survived reload")
        await browser.close()

asyncio.run(main())