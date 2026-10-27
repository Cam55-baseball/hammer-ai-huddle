"""Real owner UI fixture test. Requires an original clip and a minted owner session.
Run: ANALYSIS_FIXTURE=/path/original.mov python3 e2e/analysis-upload.py
Never switches models, fakes responses, seeds findings or bypasses app access.
"""
import asyncio, json, os
from pathlib import Path
from playwright.async_api import async_playwright

async def main():
    fixture = Path(os.environ["ANALYSIS_FIXTURE"])
    output = Path("/tmp/browser/analysis-fixture")
    output.mkdir(parents=True, exist_ok=True)
    session = json.loads(Path.home().joinpath(".cache/lovable-auth/session.json").read_text())
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 390, "height": 844})
        page = await context.new_page()
        await page.goto("http://localhost:8080")
        await page.evaluate("([k,v])=>localStorage.setItem(k,v)", [session["storage_key"], json.dumps(session["session"])])
        await page.goto("http://localhost:8080/analyze/hitting?sport=baseball")
        await page.locator("#video-upload").set_input_files(str(fixture))
        await page.get_by_role("button", name="Right", exact=True).wait_for(timeout=120000)
        await page.get_by_role("button", name="Right", exact=True).click()
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
        await page.screenshot(path=str(output / "saved-displayed.png"))
        request_body = response.request.post_data_json
        output.joinpath("result.json").write_text(json.dumps({"video_id": request_body["videoId"], "saved": True, "displayed": True}))
        print("PASS: original fixture converted, uploaded, analyzed, saved and displayed")
        await browser.close()

asyncio.run(main())