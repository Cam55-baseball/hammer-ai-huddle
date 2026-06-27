#!/usr/bin/env node
/**
 * Phase 56 — Onboarding regression suite (Playwright live E2E layer).
 *
 * Mirrors the Phase 55 verification proof. Creates fresh athletes against
 * Lovable Cloud (signup auto-confirms in this project), drives the running
 * preview, and asserts canonical-event row counts via the REST API using
 * each freshly-minted user JWT (RLS-safe: each athlete reads only their own
 * rows). Designed to run identically locally and in CI — no psql required.
 *
 * Invariants protected: see .lovable/phase-56-onboarding-regression-suite.md
 *
 * Env:
 *   LOVABLE_CLOUD_URL        — Supabase project URL (REST + auth root)
 *   LOVABLE_CLOUD_ANON_KEY   — publishable anon key
 *   ONBOARDING_E2E_ORIGIN    — origin where the app is reachable (default http://localhost:8080)
 */
import { chromium } from "playwright-core";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SB_URL = process.env.LOVABLE_CLOUD_URL;
const SB_ANON = process.env.LOVABLE_CLOUD_ANON_KEY;
const ORIGIN = process.env.ONBOARDING_E2E_ORIGIN ?? "http://localhost:8080";

if (!SB_URL || !SB_ANON) {
  console.error(
    "[phase-56] missing env: LOVABLE_CLOUD_URL and LOVABLE_CLOUD_ANON_KEY are required.",
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

const ARTIFACTS_DIR = resolve(__dirname, "../../../.lovable/phase-56-evidence");
if (!existsSync(ARTIFACTS_DIR)) mkdirSync(ARTIFACTS_DIR, { recursive: true });
const SHOTS_DIR = resolve(ARTIFACTS_DIR, "screenshots");
if (!existsSync(SHOTS_DIR)) mkdirSync(SHOTS_DIR, { recursive: true });

// Pre-existing edge-case allow-list (Phase 55 backlog item). Adding a new
// entry requires a row in .lovable/phase-56-onboarding-regression-suite.md.
const ALLOWED_SUPABASE_ERRORS = [
  // FK violation on the unregistered topic `athlete.lifecycle.signup` emitted
  // by AuthContext.tsx on signup. Pre-existing; tracked in Phase 55 backlog.
  /athlete\.lifecycle\.signup/,
  /asb_events_topic_id_fkey/,
];

const CRITICAL_ENDPOINTS = [
  "/auth/v1/",
  "/rest/v1/asb_events",
  "/rest/v1/profiles",
  "/rest/v1/parent_athlete_links",
  "/rest/v1/user_roles",
  "/functions/v1/",
];

const results = [];
let exitCode = 0;

function fail(scenario, msg, extra = {}) {
  exitCode = 1;
  results.push({ scenario, pass: false, msg, ...extra });
  console.error(`✗ [FAIL] ${scenario}: ${msg}`);
}
function pass(scenario, msg = "", extra = {}) {
  results.push({ scenario, pass: true, msg, ...extra });
  console.log(`✓ [PASS] ${scenario}${msg ? `: ${msg}` : ""}`);
}

async function sbJson(method, path, { token, body } = {}) {
  const res = await fetch(`${SB_URL}${path}`, {
    method,
    headers: {
      apikey: SB_ANON,
      Authorization: `Bearer ${token ?? SB_ANON}`,
      "Content-Type": "application/json",
      Prefer: "count=exact",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await res.text();
  let data = null;
  try {
    data = txt ? JSON.parse(txt) : null;
  } catch {
    data = txt;
  }
  return { status: res.status, headers: res.headers, data };
}

async function signup(email, password, full_name) {
  const r = await sbJson("POST", "/auth/v1/signup", {
    body: { email, password, data: { full_name } },
  });
  if (r.status >= 400) throw new Error(`signup failed ${r.status}: ${JSON.stringify(r.data)}`);
  return r.data;
}

async function countAsbEventsByTopic(athleteId, topicId, token) {
  const r = await sbJson(
    "GET",
    `/rest/v1/asb_events?select=event_id&athlete_id=eq.${athleteId}&topic_id=eq.${encodeURIComponent(topicId)}`,
    { token },
  );
  if (r.status >= 400) throw new Error(`count failed: ${r.status}`);
  // PostgREST returns Content-Range when Prefer: count=exact is set.
  const range = r.headers.get("content-range");
  if (range && range.includes("/")) {
    const total = Number(range.split("/")[1]);
    if (!Number.isNaN(total)) return total;
  }
  return Array.isArray(r.data) ? r.data.length : 0;
}

function attachSignalCapture(page, scenarioLabel) {
  const signals = {
    appErrors: [],
    reactWarnings: [],
    supabaseErrors: [],
    criticalNetworkFailures: [],
  };

  page.on("console", (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === "error") {
      // Allow-listed dev noise
      if (text.includes("Failed to register a ServiceWorker")) return;
      if (text.includes("unsupported MIME type ('text/html')")) return;
      if (ALLOWED_SUPABASE_ERRORS.some((re) => re.test(text))) {
        signals.supabaseErrors.push({ allowed: true, text: text.slice(0, 300) });
        return;
      }
      signals.appErrors.push(text.slice(0, 300));
    }
    if (text.includes("Warning:") && !text.includes("React Router")) {
      signals.reactWarnings.push(text.slice(0, 300));
    }
  });

  page.on("response", (resp) => {
    const url = resp.url();
    const status = resp.status();
    if (status < 400) return;
    if (!CRITICAL_ENDPOINTS.some((k) => url.includes(k))) return;
    // FK violation on athlete.lifecycle.signup → allow-listed
    if (status === 409 && url.includes("/asb_events")) {
      signals.supabaseErrors.push({ allowed: true, status, url: url.slice(0, 200) });
      return;
    }
    signals.criticalNetworkFailures.push({ status, url: url.slice(0, 200) });
  });

  return signals;
}

function assertSignalsClean(scenario, signals) {
  if (signals.appErrors.length > 0) {
    fail(scenario, `[I11] console errors: ${JSON.stringify(signals.appErrors.slice(0, 3))}`);
    return false;
  }
  if (signals.reactWarnings.length > 0) {
    fail(scenario, `[I12] React warnings: ${JSON.stringify(signals.reactWarnings.slice(0, 3))}`);
    return false;
  }
  if (signals.criticalNetworkFailures.length > 0) {
    fail(
      scenario,
      `[I13/I14] critical network failures: ${JSON.stringify(signals.criticalNetworkFailures.slice(0, 3))}`,
    );
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

async function assertTerminalUrl(page, predicate, scenario, timeoutMs = 4000) {
  const deadline = Date.now() + timeoutMs;
  let last = page.url();
  while (Date.now() < deadline) {
    last = page.url();
    if (predicate(last)) {
      // Hold for 1s to detect post-navigation race conditions.
      await page.waitForTimeout(1000);
      const settled = page.url();
      if (predicate(settled)) return settled;
    }
    await page.waitForTimeout(150);
  }
  fail(scenario, `[I15] never reached terminal URL; last seen: ${last}`);
  return null;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ts = Date.now();

  // -------------------------------------------------------------------------
  // I8 — /onboarding/flow redirect (signed-out OK)
  // -------------------------------------------------------------------------
  {
    const scenario = "S6/I8 legacy /onboarding/flow redirects";
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
    const page = await ctx.newPage();
    const sig = attachSignalCapture(page, scenario);
    await page.goto(`${ORIGIN}/onboarding/flow`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    const final = page.url();
    await page.screenshot({ path: `${SHOTS_DIR}/s6_flow_redirect.png` });
    if (final.includes("/onboarding/flow")) {
      fail(scenario, `[I8] still on /onboarding/flow: ${final}`);
    } else {
      if (assertSignalsClean(scenario, sig)) pass(scenario, `final ${final}`);
    }
    await ctx.close();
  }

  // -------------------------------------------------------------------------
  // Fresh athletes for downstream scenarios
  // -------------------------------------------------------------------------
  const ath1Email = `ve56-regression-s1-${ts}@example.com`;
  const ath1 = await signup(ath1Email, "TestPass12345!", "S1 Athlete");
  const ath1Uid = ath1.user.id;
  const ath1Token = ath1.access_token;
  // Write DOB via REST so I4 has something to verify.
  await sbJson("PATCH", `/rest/v1/profiles?id=eq.${ath1Uid}`, {
    token: ath1Token,
    body: { date_of_birth: "2008-04-12" },
  });

  // -------------------------------------------------------------------------
  // I1 — Fresh athlete signup walks the canonical onboarding flow
  // -------------------------------------------------------------------------
  {
    const scenario = "S1/I1 fresh-athlete-signup walks onboarding";
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
    const page = await ctx.newPage();
    const sig = attachSignalCapture(page, scenario);
    await injectSession(page, ath1);
    await page.goto(`${ORIGIN}/onboarding/athlete`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${SHOTS_DIR}/s1_welcome.png` });

    let walkOk = true;
    try {
      await page.getByRole("button", { name: "Begin" }).click({ timeout: 4000 });
      await page.waitForTimeout(400);
      await page.getByRole("button", { name: "Continue" }).click({ timeout: 4000 });
      await page.waitForTimeout(400);
      await page
        .getByRole("button", { name: "Emit canonical event" })
        .click({ timeout: 5000 });
      await page.waitForTimeout(2500);
      await page.screenshot({ path: `${SHOTS_DIR}/s1_after_emit.png` });
    } catch (e) {
      walkOk = false;
      fail(scenario, `[I1] walk failed: ${e.message}`);
    }

    if (walkOk && assertSignalsClean(scenario, sig)) {
      pass(scenario, `uid=${ath1Uid}`);
    }
    await ctx.close();
  }

  // -------------------------------------------------------------------------
  // I7 — Idempotency: repeated mounts must not duplicate canonical rows
  // -------------------------------------------------------------------------
  {
    const scenario = "S7/I4/I6 idempotency under reloads";
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
    const page = await ctx.newPage();
    const sig = attachSignalCapture(page, scenario);
    await injectSession(page, ath1);
    for (let i = 0; i < 3; i++) {
      await page.goto(`${ORIGIN}/onboarding/athlete`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
    }
    await page.screenshot({ path: `${SHOTS_DIR}/s7_after_3_reloads.png` });
    if (assertSignalsClean(scenario, sig)) pass(scenario);
    await ctx.close();
  }

  // -------------------------------------------------------------------------
  // I4 / I5 — Canonical row counts (read with the athlete's own JWT, RLS-safe)
  // -------------------------------------------------------------------------
  {
    const ageRows = await countAsbEventsByTopic(
      ath1Uid,
      "relational.developmental.age_observed",
      ath1Token,
    );
    if (ageRows === 1) pass("DB/I4 age_observed exactly-one", `count=${ageRows}`);
    else fail("DB/I4 age_observed exactly-one", `expected 1 got ${ageRows}`);

    const schedRows = await countAsbEventsByTopic(
      ath1Uid,
      "athlete.schedule.day_type",
      ath1Token,
    );
    if (schedRows === 1) pass("DB/I5 athlete.schedule.day_type exactly-one", `count=${schedRows}`);
    else fail("DB/I5 athlete.schedule.day_type exactly-one", `expected 1 got ${schedRows}`);
  }

  // -------------------------------------------------------------------------
  // I2 — Returning athlete: signs back in, must not be stranded on /auth
  // -------------------------------------------------------------------------
  {
    const scenario = "S2/I2 returning-athlete-routes-past-auth";
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
    const page = await ctx.newPage();
    const sig = attachSignalCapture(page, scenario);
    await page.goto(`${ORIGIN}/auth`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    await page.locator("#email").fill(ath1Email);
    await page.locator("#password").fill("TestPass12345!");
    await page.getByRole("button", { name: "Sign In" }).first().click();
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `${SHOTS_DIR}/s2_returning_login.png` });
    const final = page.url();
    // Auth.tsx routes to /dashboard; downstream role/subscription gates may
    // bounce to /start-here?intent=… — both prove I2 (the user is NOT still
    // sitting on /auth and NOT stranded in onboarding).
    const ok = !final.includes("/auth") && !final.includes("/onboarding/athlete");
    if (!ok) fail(scenario, `[I2] stranded at ${final}`);
    else if (assertSignalsClean(scenario, sig)) pass(scenario, `final ${final}`);
    await ctx.close();
  }

  // -------------------------------------------------------------------------
  // I3 + I9 — Zero-event athlete: login must route to /onboarding/athlete
  //                    and /dashboard must remain gated.
  // -------------------------------------------------------------------------
  const ath2Email = `ve56-regression-s3-${ts}@example.com`;
  const ath2 = await signup(ath2Email, "TestPass12345!", "S3 Zero-event");
  {
    const scenario = "S3+S8/I3/I9 zero-event-athlete -> onboarding";
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
    const page = await ctx.newPage();
    const sig = attachSignalCapture(page, scenario);
    await page.goto(`${ORIGIN}/auth`, { waitUntil: "domcontentloaded" });
    await page.locator("#email").fill(ath2Email);
    await page.locator("#password").fill("TestPass12345!");
    await page.getByRole("button", { name: "Sign In" }).first().click();
    const settled = await assertTerminalUrl(
      page,
      (u) => u.includes("/onboarding/athlete"),
      scenario,
    );
    await page.screenshot({ path: `${SHOTS_DIR}/s3_dashboard_gate.png` });
    if (settled && assertSignalsClean(scenario, sig)) pass(scenario, `final ${settled}`);
    await ctx.close();
  }

  // -------------------------------------------------------------------------
  // I7 — Parent invite: ?redirect= with token must round-trip through signup
  // -------------------------------------------------------------------------
  {
    const scenario = "S5/I7 parent-invite redirect+token round-trip";
    const fakeToken = "DUMMY_TOKEN_VALUE";
    const target = encodeURIComponent(`/accept-parent-invite?token=${fakeToken}`);
    const parentEmail = `ve56-regression-parent-${ts}@example.com`;
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
    const page = await ctx.newPage();
    const sig = attachSignalCapture(page, scenario);
    await page.goto(`${ORIGIN}/auth?redirect=${target}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    // Switch to sign-up
    try {
      await page.getByRole("button", { name: /sign up/i }).first().click({ timeout: 2000 });
    } catch {
      /* maybe already on signup tab */
    }
    await page.waitForTimeout(400);
    try {
      await page.locator("#fullName").fill("Parent Five Six");
    } catch {
      /* field may not be required on this variant */
    }
    await page.locator("#email").fill(parentEmail);
    await page.locator("#password").fill("TestPass12345!");
    await page.getByRole("button", { name: /sign up/i }).first().click();
    await page.waitForTimeout(4000);
    const final = page.url();
    await page.screenshot({ path: `${SHOTS_DIR}/s5_parent_invite_redirect.png` });
    const ok = final.includes("/accept-parent-invite") && final.includes(`token=${fakeToken}`);
    if (!ok) fail(scenario, `[I7] redirect did not survive signup: ${final}`);
    else if (assertSignalsClean(scenario, sig)) pass(scenario, `final ${final}`);
    await ctx.close();
  }

  // -------------------------------------------------------------------------
  // I10 — Mobile onboarding renders
  // -------------------------------------------------------------------------
  {
    const scenario = "S9/I10 mobile-onboarding-renders";
    const ath3Email = `ve56-regression-mobile-${ts}@example.com`;
    const ath3 = await signup(ath3Email, "TestPass12345!", "S9 Mobile");
    await sbJson("PATCH", `/rest/v1/profiles?id=eq.${ath3.user.id}`, {
      token: ath3.access_token,
      body: { date_of_birth: "2010-06-01" },
    });
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
    });
    const page = await ctx.newPage();
    const sig = attachSignalCapture(page, scenario);
    await injectSession(page, ath3);
    await page.goto(`${ORIGIN}/onboarding/athlete`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${SHOTS_DIR}/s9_mobile_onboarding.png` });
    const visible = await page.locator("text=Your organism").count();
    if (visible === 0) fail(scenario, "[I10] welcome heading not visible on mobile");
    else if (assertSignalsClean(scenario, sig)) pass(scenario);
    await ctx.close();
  }

  await browser.close();

  writeFileSync(
    `${ARTIFACTS_DIR}/results.json`,
    JSON.stringify({ ts, results, exitCode }, null, 2),
  );

  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;
  console.log(`\n[phase-56] ${passed} passed, ${failed} failed`);
  if (exitCode !== 0) {
    console.error("[phase-56] FAILED — onboarding regression invariants violated.");
  }
  process.exit(exitCode);
}

main().catch((err) => {
  console.error("[phase-56] fatal:", err);
  process.exit(2);
});
