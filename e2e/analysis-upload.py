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
        replay = await page.request.post(response.url, headers={"Authorization": f"Bearer {session['session']['access_token']}", "apikey": response.request.headers.get('apikey', ''), "Content-Type": "application/json"}, data=json.dumps(request_body))
        replay_data = await replay.json()
        assert replay.ok and replay_data.get("saved") is True, "Saved report could not be read back"
        assert (replay_data.get("ai_analysis") or replay_data).get("feedback") == report["feedback"], "Saved coaching changed on replay"
        if os.environ.get("REGISTER_ANALYSIS_CANARY") == "1":
            owner = session['session']['user']['id']
            request_path = f"{owner}/analysis-canary/test-fixture.json"
            origin = response.url.split('/functions/v1/')[0]
            headers = {"Authorization": f"Bearer {session['session']['access_token']}", "apikey": response.request.headers.get('apikey', '')}
            stored = await page.request.post(f"{origin}/storage/v1/object/videos/{request_path}", headers={**headers,"Content-Type":"application/json","x-upsert":"true"}, data=json.dumps(request_body))
            assert stored.ok, "TEST request fixture could not be stored"
            registered = await page.request.post(f"{origin}/functions/v1/analysis-canary-configure", headers={**headers,"Content-Type":"application/json"}, data=json.dumps({"videoId":request_body['videoId'],"requestPath":request_path,"testFixture":True}))
            assert registered.ok, "Canary TEST fixture registration failed"
        output.joinpath("result.json").write_text(json.dumps({"video_id": request_body["videoId"], "saved": True, "displayed": True}))
        print(f"PASS: {sport} {module} original fixture converted, uploaded, analyzed, saved, displayed and replayed")
        await browser.close()

asyncio.run(main())