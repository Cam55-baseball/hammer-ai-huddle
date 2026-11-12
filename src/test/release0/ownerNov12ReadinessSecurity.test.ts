import { describe, it, expect, beforeAll, vi } from "vitest";
import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
import {
  computeReadiness, NO_CHECKIN_RECOMMENDATION, NO_SLEEP_RECOMMENDATION, SLEEP_ONLY_NOTE,
  VAULT_READINESS_SELECT, weekPlanIntensity, weekPlanReadinessLine,
} from "../../../supabase/functions/hie-analyze/readiness";
import { readinessAdjustment, readinessOrNull, readinessPrompt } from "../../../supabase/functions/prescription-engine/readiness";
import {
  jobCallerAllowed, isServiceRoleBearer, ownOrTrusted, streakUserId, JOB_TOKEN_SHA256,
} from "../../../supabase/functions/_shared/auth/callerScope";

const NOW = new Date("2026-11-12T22:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600_000).toISOString();
const day = (iso: string) => iso.slice(0, 10);
const morning = (o: Record<string, unknown> = {}) => ({ entry_date: day(hoursAgo(2)), quiz_type: "morning", created_at: hoursAgo(2), sleep_quality: 5, pain_scale: null, pain_location: null, ...o });
const preLift = (pain: number) => ({ entry_date: day(hoursAgo(1)), quiz_type: "pre_lift", created_at: hoursAgo(1), sleep_quality: null, pain_scale: pain, pain_location: ["shoulder"] });
const score = (rows: Record<string, unknown>[]) => computeReadiness(rows, NOW).score;
const src = (p: string) => readFileSync(p, "utf8");

describe("Owner Nov 12 — hie-analyze readiness: no stress, nothing assumed", () => {
  it("best answers still give 100, with or without a pain answer", () => {
    expect(score([morning(), preLift(0)])).toBe(100);
    expect(score([morning()])).toBe(100);
  });
  it("new math: (sleep + pain) / 70 when pain was answered, sleep / 40 when not", () => {
    expect(score([morning({ sleep_quality: 3 }), preLift(0)])).toBe(77);
    expect(score([morning({ sleep_quality: 3 })])).toBe(60);
    expect(score([morning(), preLift(6)])).toBe(57);
    expect(score([morning({ sleep_quality: 2 }), preLift(6)])).toBe(23);
  });
  it("the stress answer is never read, defaulted or counted", () => {
    expect(score([morning({ stress_level: 1 })])).toBe(score([morning({ stress_level: 5 })]));
    expect(VAULT_READINESS_SELECT).not.toContain("stress");
    const code = src("supabase/functions/hie-analyze/readiness.ts").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(code).not.toMatch(/stress/i);
  });
  it("no pain answer = sleep only, said plainly; never assumed pain-free", () => {
    const r = computeReadiness([morning({ sleep_quality: 4 })], NOW);
    expect(r.basis).toBe("sleep_only");
    expect(r.recommendation.endsWith(SLEEP_ONLY_NOTE)).toBe(true);
    expect(computeReadiness([morning({ sleep_quality: 4 }), preLift(0)], NOW).basis).toBe("sleep_and_pain");
  });
  it("only a check-in from the last 3 days counts; older or none = unknown", () => {
    expect(computeReadiness([morning({ created_at: hoursAgo(73), entry_date: day(hoursAgo(73)) })], NOW))
      .toEqual({ score: null, recommendation: NO_CHECKIN_RECOMMENDATION, basis: null });
    expect(score([morning({ created_at: hoursAgo(71), entry_date: day(hoursAgo(71)) })])).toBe(100);
    expect(computeReadiness([], NOW).score).toBeNull();
    expect(NO_CHECKIN_RECOMMENDATION).toBe("No check-in in the last 3 days, so readiness is unknown.");
  });
  it("no sleep-quality answer that day = unknown", () => {
    expect(computeReadiness([preLift(3)], NOW)).toEqual({ score: null, recommendation: NO_SLEEP_RECOMMENDATION, basis: null });
  });
});

describe("Owner Nov 12 — an unknown score causes no readiness adjustment downstream", () => {
  it("hie-analyze sends the real score or null to prescription-engine, never a stand-in", () => {
    const code = src("supabase/functions/hie-analyze/index.ts");
    expect(code).not.toMatch(/\?\?\s*70\b/);
    expect(code).toContain("readiness_score: readinessScore,");
  });
  it("week plan: unknown keeps the unadjusted pattern; a known low score still lowers it", () => {
    for (let i = 0; i < 7; i++) expect(weekPlanIntensity(null, i)).toBe(weekPlanIntensity(80, i));
    expect(weekPlanIntensity(null, 0)).toBe("high");
    expect(weekPlanIntensity(50, 0)).toBe("medium");
    expect(weekPlanReadinessLine(null, "x")).not.toMatch(/\d+\/100|null/);
  });
  it("drill suggestions: unknown = no adjustment and no low-readiness rule", () => {
    expect(readinessAdjustment(null)).toBe(1.0);
    expect(readinessAdjustment(40)).toBe(0.7);
    expect(readinessAdjustment(55)).toBe(0.85);
    expect(readinessPrompt(null).line).not.toMatch(/\d/);
    expect(readinessPrompt(null).rule).not.toMatch(/< 60/);
    expect(readinessPrompt(45).rule).toMatch(/< 60/);
    expect(readinessOrNull(undefined)).toBeNull();
    expect(readinessOrNull(62)).toBe(62);
  });
});

describe("Owner Nov 12 — security batch 1", () => {
  beforeAll(() => { if (!globalThis.crypto?.subtle) vi.stubGlobal("crypto", webcrypto); });
  const h = (o: Record<string, string>) => new Headers(o);
  const ME = "11111111-1111-1111-1111-111111111111";
  const OTHER = "22222222-2222-2222-2222-222222222222";

  it("job credential or service-role key only; the public app key is refused", async () => {
    expect(await jobCallerAllowed(h({}), "svc")).toBe(false);
    expect(await jobCallerAllowed(h({ apikey: "anon", Authorization: "Bearer anon" }), "svc")).toBe(false);
    expect(await jobCallerAllowed(h({ "x-job-token": "wrong" }), "svc")).toBe(false);
    const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("t"));
    const hex = [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
    expect(await jobCallerAllowed(h({ "x-job-token": "t" }), "svc", hex)).toBe(true);
    expect(await jobCallerAllowed(h({ Authorization: "Bearer svc" }), "svc")).toBe(true);
    expect(await isServiceRoleBearer(h({ Authorization: "Bearer user-jwt" }), "svc")).toBe(false);
  });
  it("reuses the existing stored job-credential hash", () => {
    expect(JOB_TOKEN_SHA256).toBe(src("supabase/functions/wk-daily-plan-job/index.ts").match(/JOB_TOKEN_SHA256 = "([0-9a-f]{64})"/)![1]);
  });
  it("compute-hammer-state: own id only for a signed-in player; all players or another id needs a trusted caller", () => {
    expect(ownOrTrusted({ trusted: false, signedInUserId: null, requestedUserId: ME })).toMatchObject({ ok: false, status: 401 });
    expect(ownOrTrusted({ trusted: false, signedInUserId: ME, requestedUserId: ME })).toEqual({ ok: true, userId: ME });
    expect(ownOrTrusted({ trusted: false, signedInUserId: ME, requestedUserId: OTHER })).toMatchObject({ ok: false, status: 403 });
    expect(ownOrTrusted({ trusted: false, signedInUserId: ME, requestedUserId: null })).toMatchObject({ ok: false, status: 403 });
    expect(ownOrTrusted({ trusted: true, signedInUserId: null, requestedUserId: null })).toEqual({ ok: true, userId: null });
    expect(ownOrTrusted({ trusted: true, signedInUserId: null, requestedUserId: OTHER })).toEqual({ ok: true, userId: OTHER });
  });
  it("save-streak: the id comes from the token; a body id counts only with the service-role key", () => {
    expect(streakUserId({ serviceRole: false, signedInUserId: ME, bodyUserId: OTHER })).toEqual({ ok: true, userId: ME });
    expect(streakUserId({ serviceRole: false, signedInUserId: null, bodyUserId: OTHER })).toMatchObject({ ok: false, status: 401 });
    expect(streakUserId({ serviceRole: true, signedInUserId: null, bodyUserId: OTHER })).toEqual({ ok: true, userId: OTHER });
    expect(streakUserId({ serviceRole: true, signedInUserId: null, bodyUserId: null })).toMatchObject({ ok: false, status: 401 });
  });
  it("each service refuses before any client, body read or work", () => {
    const hie = src("supabase/functions/hie-analyze/index.ts");
    const gate = hie.indexOf("jobCallerAllowed(req.headers");
    expect(gate).toBeGreaterThan(0);
    expect(gate).toBeLessThan(hie.indexOf("const supabase = createClient(supabaseUrl, serviceKey)"));
    expect(gate).toBeLessThan(hie.indexOf("await req.json()"));

    const st = src("supabase/functions/save-streak/index.ts");
    expect(st.indexOf("if (!bearer) return unauthorized()")).toBeLessThan(st.indexOf("createClient("));
    expect(st.indexOf("if (!signedInUserId) return unauthorized()")).toBeLessThan(st.indexOf("await req.json()"));
    expect(st.indexOf("streakUserId(")).toBeLessThan(st.indexOf(".from('custom_activity_logs').insert"));

    const ch = src("supabase/functions/compute-hammer-state/index.ts");
    const serveAt = ch.indexOf("serve(async (req)");
    const handler = ch.slice(serveAt);
    expect(handler.indexOf("jobCallerAllowed(req.headers")).toBeLessThan(handler.indexOf("req.json()"));
    expect(handler.indexOf("ownOrTrusted(")).toBeLessThan(handler.indexOf("computeForUser("));
    expect(handler.indexOf("ownOrTrusted(")).toBeLessThan(handler.indexOf("logRun("));
  });
  it("every server caller of hie-analyze sends the service-role key", () => {
    for (const f of ["calculate-session", "hie-refresh-worker", "nightly-hie-process"]) {
      expect(src(`supabase/functions/${f}/index.ts`)).toMatch(/createClient\(\s*Deno\.env\.get\(['"]SUPABASE_URL['"]\)!,\s*Deno\.env\.get\(['"]SUPABASE_SERVICE_ROLE_KEY['"]\)!/);
    }
    expect(src("supabase/functions/hie-verify/index.ts")).toContain("Authorization: `Bearer ${serviceKey}`");
    expect(src("supabase/functions/nightly-mpi-process/index.ts")).toContain("'Authorization': `Bearer ${SERVICE_ROLE_KEY}`");
  });
});
