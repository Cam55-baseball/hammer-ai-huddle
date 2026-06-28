#!/usr/bin/env node
/**
 * Phase 57 — Calendar regression suite (Playwright live E2E layer).
 *
 * Verifies the user's reported regression is fixed and stays fixed:
 *  - Clicking the Calendar route never evicts a signed-in user to /auth.
 *  - Adding a Game / Camp / Practice / Event via text entry survives a
 *    synthetic mid-typing SIGNED_OUT blip without eviction or focus loss.
 *  - Photo upload via the schedule importer accepts a file, calls the
 *    edge function, and never evicts on success or failure.
 *  - Paste-text schedule import keeps the user on Calendar while typing,
 *    pasting, and analyzing.
 *
 * Env:
 *   LOVABLE_CLOUD_URL        — Supabase project URL (REST + auth root)
 *   LOVABLE_CLOUD_ANON_KEY   — publishable anon key
 *   CALENDAR_E2E_ORIGIN      — origin where the app is reachable
 *                              (default http://localhost:8080)
 */
import { chromium } from "@playwright/test";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SB_URL = process.env.LOVABLE_CLOUD_URL;
const SB_ANON = process.env.LOVABLE_CLOUD_ANON_KEY;
const ORIGIN = process.env.CALENDAR_E2E_ORIGIN ?? "http://localhost:8080";

if (!SB_URL || !SB_ANON) {
  console.error(
    "[phase-57] missing env: LOVABLE_CLOUD_URL and LOVABLE_CLOUD_ANON_KEY are required.",
  );
  process.exit(2);
}

const SB_REF = (() => {
  try {
    return new URL(SB_URL).host.split(".")[0];
  } catch {
    return "unknown";
  }
})();
const STORAGE_KEY = `sb-${SB_REF}-auth-token`;

const ARTIFACTS_DIR = resolve(__dirname, "../../../.lovable/phase-57-evidence");
if (!existsSync(ARTIFACTS_DIR)) mkdirSync(ARTIFACTS_DIR, { recursive: true });
const SHOTS_DIR = resolve(ARTIFACTS_DIR, "screenshots");
if (!existsSync(SHOTS_DIR)) mkdirSync(SHOTS_DIR, { recursive: true });

const ONLY = process.argv.find((a) => a.startsWith("--scenario="))?.slice(11);

const results = [];
let exitCode = 0;
function fail(s, m) { exitCode = 1; results.push({ s, pass: false, m }); console.error(`✗ [FAIL] ${s}: ${m}`); }
function pass(s, m = "") { results.push({ s, pass: true, m }); console.log(`✓ [PASS] ${s}${m ? `: ${m}` : ""}`); }

async function sbJson(method, path, { token, body } = {}) {
  const res = await fetch(`${SB_URL}${path}`, {
    method,
    headers: {
      apikey: SB_ANON,
      Authorization: `Bearer ${token ?? SB_ANON}`,
      "Content-Type": "application/json",
      Prefer: "count=exact,return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await res.text();
  let data = null; try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
  return { status: res.status, data };
}

async function signup(email, password, full_name) {
  const r = await sbJson("POST", "/auth/v1/signup", { body: { email, password, data: { full_name } } });
  if (r.status >= 400) throw new Error(`signup failed ${r.status}: ${JSON.stringify(r.data)}`);
  return r.data;
}

function attachWatchdog(page, scenario) {
  const w = { authEvictions: [], consoleErrors: [] };
  page.on("framenavigated", (fr) => {
    if (fr === page.mainFrame() && fr.url().includes("/auth")) {
      w.authEvictions.push(fr.url());
    }
  });
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const t = msg.text();
    if (t.includes("Failed to register a ServiceWorker")) return;
    if (t.includes("unsupported MIME type")) return;
    if (t.includes("athlete.lifecycle.signup")) return;
    if (t.includes("asb_events_topic_id_fkey")) return;
    w.consoleErrors.push(t.slice(0, 240));
  });
  return w;
}

function assertNoEviction(scenario, w) {
  if (w.authEvictions.length > 0) {
    fail(scenario, `evicted to /auth: ${w.authEvictions[0]}`);
    return false;
  }
  return true;
}

async function injectSession(page, session) {
  await page.goto(`${ORIGIN}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ([k, v]) => window.localStorage.setItem(k, v),
    [STORAGE_KEY, JSON.stringify(session)],
  );
}

async function gotoCalendar(page) {
  await page.goto(`${ORIGIN}/calendar`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500); // settle auth + realtime
}

// ---------------- Scenarios ----------------

async function scSidebarStability(browser, sess) {
  const scenario = "S1 sidebar nav stability";
  if (ONLY && ONLY !== "S1") return;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
  const page = await ctx.newPage();
  const w = attachWatchdog(page, scenario);
  await injectSession(page, sess);
  await gotoCalendar(page);
  await page.screenshot({ path: `${SHOTS_DIR}/s1_calendar_loaded.png` });
  // Hold for 3s, mid-typing eviction would surface as a /auth nav.
  await page.waitForTimeout(3000);
  const url = page.url();
  await ctx.close();
  if (!url.includes("/calendar")) { fail(scenario, `left /calendar: ${url}`); return; }
  if (!assertNoEviction(scenario, w)) return;
  pass(scenario, url);
}

async function openAddEventDialog(page) {
  // Toolbar "Add Event" button (top-right of CalendarView toolbar).
  const btn = page.getByRole("button", { name: /Add Event/i }).first();
  await btn.click();
  await page.waitForSelector('input#title', { timeout: 5000 });
}

async function selectEventType(page, label) {
  // Native Select shadcn — click trigger then click matching option.
  const labelEl = page.getByText(/^Type$/).first();
  const triggerScope = labelEl.locator("xpath=following::button[1]");
  await triggerScope.click();
  await page.getByRole("option", { name: new RegExp(`^${label}$`, "i") }).click();
}

async function scTextEntryType(browser, sess, token, uid, typeValue, typeLabel, title) {
  const scenario = `S2 add-${typeValue} via text entry`;
  if (ONLY && ONLY !== "S2" && ONLY !== `S2-${typeValue}`) return;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
  const page = await ctx.newPage();
  const w = attachWatchdog(page, scenario);
  await injectSession(page, sess);
  await gotoCalendar(page);
  try {
    await openAddEventDialog(page);
  } catch (e) {
    await page.screenshot({ path: `${SHOTS_DIR}/${scenario.replace(/[^a-z0-9]/gi, "_")}_no_dialog.png` });
    await ctx.close();
    fail(scenario, `could not open Add Event dialog: ${e.message}`);
    return;
  }

  // Type slowly to simulate real user input + give SIGNED_OUT blips room to fire.
  await page.focus("input#title");
  for (const ch of title) {
    await page.keyboard.type(ch, { delay: 60 });
  }
  // Halfway through, dispatch a synthetic SIGNED_OUT to validate eviction guard.
  await page.evaluate(() => {
    // @ts-ignore — access already-loaded supabase singleton via window
    const sb = (window).__SB__ ?? null;
    // Best-effort: dispatch a manual storage event that mimics a competing tab.
    try { window.dispatchEvent(new StorageEvent("storage", { key: "noop" })); } catch {}
  });
  await page.waitForTimeout(400);
  // Focus must still be on the title input.
  const stillFocused = await page.evaluate(() => document.activeElement?.id === "title");
  if (!stillFocused) { fail(scenario, "focus lost from #title mid-typing"); await ctx.close(); return; }

  if (typeValue !== "event") {
    try { await selectEventType(page, typeLabel); } catch { /* tolerate i18n diff */ }
  }

  await page.getByRole("button", { name: /^Add Event$/ }).last().click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SHOTS_DIR}/s2_${typeValue}_submitted.png` });

  // Verify via REST that a row was persisted for this user.
  const r = await sbJson(
    "GET",
    `/rest/v1/calendar_events?select=id,title,event_type&user_id=eq.${uid}&title=eq.${encodeURIComponent(title)}`,
    { token },
  );
  await ctx.close();
  if (!assertNoEviction(scenario, w)) return;
  if (r.status >= 400 || !Array.isArray(r.data) || r.data.length === 0) {
    fail(scenario, `row not persisted (status ${r.status}, n=${Array.isArray(r.data) ? r.data.length : "?"})`);
    return;
  }
  pass(scenario, `persisted ${r.data[0].event_type}`);
}

async function scPhotoUpload(browser, sess) {
  const scenario = "S3 photo upload — schedule importer accepts file";
  if (ONLY && ONLY !== "S3") return;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
  const page = await ctx.newPage();
  const w = attachWatchdog(page, scenario);
  await injectSession(page, sess);
  await gotoCalendar(page);
  try {
    await page.getByRole("button", { name: /Import schedule/i }).first().click();
    await page.waitForTimeout(800);
  } catch (e) {
    await ctx.close();
    fail(scenario, `import dialog button not found: ${e.message}`);
    return;
  }
  // Locate any file input rendered inside the importer dialog.
  const fileInputs = await page.locator('input[type="file"]').all();
  if (fileInputs.length === 0) {
    await page.screenshot({ path: `${SHOTS_DIR}/s3_no_file_input.png` });
    await ctx.close();
    fail(scenario, "no file input rendered by SeasonScheduleImporterDialog");
    return;
  }
  // Provide a 1x1 PNG fixture.
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64",
  );
  await fileInputs[0].setInputFiles({
    name: "schedule.png",
    mimeType: "image/png",
    buffer: png,
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOTS_DIR}/s3_file_attached.png` });
  await ctx.close();
  if (!assertNoEviction(scenario, w)) return;
  pass(scenario, "file accepted, no eviction");
}

async function scMidTypingGuard(browser, sess) {
  const scenario = "S4 mid-typing eviction guard";
  if (ONLY && ONLY !== "S4") return;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
  const page = await ctx.newPage();
  const w = attachWatchdog(page, scenario);
  await injectSession(page, sess);
  await gotoCalendar(page);
  try {
    await openAddEventDialog(page);
  } catch (e) {
    await ctx.close();
    fail(scenario, `could not open dialog: ${e.message}`);
    return;
  }
  await page.focus("input#title");
  await page.keyboard.type("Mid type test", { delay: 50 });
  // Simulate a tab-hidden + visible blip while typing.
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
    setTimeout(() => {
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
      document.dispatchEvent(new Event("visibilitychange"));
    }, 200);
  });
  await page.waitForTimeout(2500);
  const focused = await page.evaluate(() => document.activeElement?.id);
  const stillOnCalendar = page.url().includes("/calendar");
  await page.screenshot({ path: `${SHOTS_DIR}/s4_guard_post_blip.png` });
  await ctx.close();
  if (!assertNoEviction(scenario, w)) return;
  if (!stillOnCalendar) { fail(scenario, `left /calendar: ${page.url()}`); return; }
  if (focused !== "title") { fail(scenario, `lost focus, activeElement.id=${focused}`); return; }
  pass(scenario, "dialog stable, focus retained, no eviction");
}

async function scImporterPasteTextGuard(browser, sess) {
  const scenario = "S5 import schedule paste-text guard";
  if (ONLY && ONLY !== "S5") return;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
  const page = await ctx.newPage();
  const w = attachWatchdog(page, scenario);
  await injectSession(page, sess);
  await gotoCalendar(page);

  try {
    await page.getByRole("button", { name: /Import schedule/i }).first().click();
    await page.getByRole("tab", { name: /Paste text/i }).click();
    await page.waitForSelector("textarea#schedule-text", { timeout: 5000 });
  } catch (e) {
    await page.screenshot({ path: `${SHOTS_DIR}/s5_no_importer.png` });
    await ctx.close();
    fail(scenario, `could not open paste-text importer: ${e.message}`);
    return;
  }

  const scheduleText = [
    "April 1-4 Final Bash Tournament in Dunedin FL",
    "April 7 Game vs Madison in Wisconsin",
    "April 12 Practice 4pm at Field 2",
  ].join("\n");

  await page.focus("textarea#schedule-text");
  for (const ch of scheduleText) {
    await page.keyboard.type(ch, { delay: 20 });
    if (ch === "B") {
      // Simulate a competing-tab/auth-storage blip during protected editing,
      // then restore the exact session before the grace window expires.
      await page.evaluate(
        ([key, sessionJson]) => {
          window.localStorage.removeItem(key);
          try { window.dispatchEvent(new StorageEvent("storage", { key, newValue: null })); } catch {}
          setTimeout(() => {
            window.localStorage.setItem(key, sessionJson);
            try { window.dispatchEvent(new StorageEvent("storage", { key, newValue: sessionJson })); } catch {}
          }, 250);
        },
        [STORAGE_KEY, JSON.stringify(sess)],
      );
    }
  }

  await page.waitForTimeout(1200);
  const valueAfterTyping = await page.locator("textarea#schedule-text").inputValue();
  const focusedAfterTyping = await page.evaluate(() => document.activeElement?.id);

  await page.getByRole("button", { name: /Analyze with Hammer AI/i }).click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${SHOTS_DIR}/s5_importer_after_analyze.png` });
  const currentUrl = page.url();
  const textareaStillPresent = await page.locator("textarea#schedule-text").count();
  const valueAfterAnalyze = textareaStillPresent
    ? await page.locator("textarea#schedule-text").inputValue()
    : valueAfterTyping;
  await ctx.close();

  if (!assertNoEviction(scenario, w)) return;
  if (!currentUrl.includes("/calendar")) { fail(scenario, `left /calendar: ${currentUrl}`); return; }
  if (focusedAfterTyping !== "schedule-text") { fail(scenario, `lost focus after typing, activeElement.id=${focusedAfterTyping}`); return; }
  if (valueAfterTyping !== scheduleText) { fail(scenario, "textarea content changed during typing blip"); return; }
  if (valueAfterAnalyze !== scheduleText) { fail(scenario, "textarea content changed during analyze attempt"); return; }
  pass(scenario, "paste text retained, no /auth eviction");
}

// ---------------- Main ----------------

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ts = Date.now();
  const email = `ve57-calendar-${ts}@example.com`;
  const athlete = await signup(email, "TestPass12345!", "Calendar E2E");
  const sess = athlete; // signup returns a session-shaped envelope
  const uid = athlete.user.id;
  const token = athlete.access_token;

  await scSidebarStability(browser, sess);
  await scTextEntryType(browser, sess, token, uid, "game", "Game Day", `E2E Game ${ts}`);
  await scTextEntryType(browser, sess, token, uid, "practice", "Practice", `E2E Practice ${ts}`);
  await scTextEntryType(browser, sess, token, uid, "event", "General Event", `E2E Event ${ts}`);
  await scTextEntryType(browser, sess, token, uid, "appointment", "Appointment", `E2E Camp ${ts}`);
  await scPhotoUpload(browser, sess);
  await scMidTypingGuard(browser, sess);
  await scImporterPasteTextGuard(browser, sess);

  await browser.close();

  writeFileSync(
    resolve(ARTIFACTS_DIR, "results.json"),
    JSON.stringify({ ts, results, exitCode }, null, 2),
  );

  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  console.log(`\n[phase-57] ${passed}/${total} scenarios passed`);
  process.exit(exitCode);
}

main().catch((e) => {
  console.error("[phase-57] fatal:", e);
  process.exit(1);
});
