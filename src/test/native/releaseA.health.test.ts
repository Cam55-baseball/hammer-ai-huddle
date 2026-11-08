import { describe, it, expect, vi, beforeEach } from "vitest";

const native = vi.hoisted(() => ({ on: true }));
const consent = vi.hoisted(() => ({ choice: "accepted" as string | null }));
const prefs = vi.hoisted(() => new Map<string, string>());
const health = vi.hoisted(() => ({
  isAvailable: vi.fn(async () => ({ available: true })),
  requestAuthorization: vi.fn(async () => ({})),
  readSamples: vi.fn(async () => ({ samples: [] as any[] })),
}));
const upserts = vi.hoisted(() => [] as any[]);

vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => native.on, getPlatform: () => (native.on ? "ios" : "web") } }));
vi.mock("@capgo/capacitor-health", () => ({ Health: health }));
vi.mock("@capacitor/preferences", () => ({
  Preferences: {
    get: async ({ key }: any) => ({ value: prefs.get(key) ?? null }),
    set: async ({ key, value }: any) => { prefs.set(key, value); },
    remove: async ({ key }: any) => { prefs.delete(key); },
  },
}));
vi.mock("@/lib/legal/legalV2", () => ({
  AGREEMENT_SLUGS: { healthConsent: "health-data-consent" },
  myConsentStatus: async () => (consent.choice ? { "health-data-consent": { choice: consent.choice } } : {}),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (t: string) => ({
      select: () => ({ in: async () => ({ data: [{ feature_key: "healthkit_read_v1", mode: "all", allowlist: [], updated_by: null }] }) }),
      upsert: async (rows: any, opts: any) => { upserts.push({ t, rows, opts }); return { error: null }; },
    }),
  },
}));

import { sampleToRow, samplesToRows, connectAppleHealth, healthEligibility, maybeSyncAppleHealth, HEALTH_READ_TYPES } from "@/lib/native/healthSync";
import { clearNativeFlags } from "@/lib/native/nativeFlags";

const s = (over: any) => ({ dataType: "heartRateVariability", value: 48.6, unit: "millisecond", startDate: "2026-11-07T07:00:00Z", endDate: "2026-11-07T07:01:00Z", sourceName: "Ava's Apple Watch", platformId: "UUID-1", ...over });

beforeEach(() => {
  native.on = true; consent.choice = "accepted"; prefs.clear(); upserts.length = 0; clearNativeFlags();
  health.requestAuthorization.mockClear(); health.readSamples.mockClear();
});

describe("Apple Health parsing (healthkit_read_v1)", () => {
  it("HRV (SDNN), resting HR and sleep become rows with device name and Apple's sample id", () => {
    expect(sampleToRow("u", s({}))).toMatchObject({ metric: "hrv_sdnn", hrv_ms: 49, sample_id: "UUID-1", device_name: "Ava's Apple Watch", source: "healthkit", captured_at: "2026-11-07T07:00:00Z" });
    expect(sampleToRow("u", s({ dataType: "restingHeartRate", value: 54, unit: "bpm", platformId: "R1" }))).toMatchObject({ metric: "resting_hr", rhr_bpm: 54, hrv_ms: null });
    expect(sampleToRow("u", s({ dataType: "sleep", value: 412, unit: "minute", sleepState: "deep", platformId: "S1" }))).toMatchObject({ metric: "sleep_asleep", sleep_min: 412 });
    expect(sampleToRow("u", s({ dataType: "sleep", value: 480, unit: "minute", sleepState: "inBed", platformId: "S2" }))).toMatchObject({ metric: "sleep_in_bed", in_bed_min: 480, sleep_min: null });
  });

  it("drops awake segments, impossible values and samples without an id", () => {
    expect(sampleToRow("u", s({ dataType: "sleep", value: 20, sleepState: "awake" }))).toBeNull();
    expect(sampleToRow("u", s({ dataType: "restingHeartRate", value: 400 }))).toBeNull();
    expect(sampleToRow("u", s({ platformId: undefined }))).toBeNull();
  });

  it("dedupes by sample id, and saving ignores rows already stored for that person", async () => {
    expect(samplesToRows("u", [s({}), s({}), s({ platformId: "UUID-2" })]).map((r) => r.sample_id)).toEqual(["UUID-1", "UUID-2"]);
    health.readSamples.mockResolvedValue({ samples: [s({}), s({})] });
    expect((await connectAppleHealth("u")).ok).toBe(true);
    expect(upserts[0]).toMatchObject({ t: "wearable_metrics", opts: { onConflict: "user_id,sample_id", ignoreDuplicates: true } });
    expect(upserts[0].rows).toHaveLength(1);
  });
});

describe("Apple Health consent and sync timing", () => {
  it("asks Apple read-only, for sleep, HRV and resting HR, only when Connect is tapped", async () => {
    health.readSamples.mockResolvedValue({ samples: [] });
    await connectAppleHealth("u");
    expect(health.requestAuthorization).toHaveBeenCalledWith({ read: HEALTH_READ_TYPES, write: [] });
    expect(HEALTH_READ_TYPES).toEqual(["sleep", "heartRateVariability", "restingHeartRate"]);
    const call = (health.readSamples.mock.calls[0] as any)[0];
    expect(new Date(call.endDate).getTime() - new Date(call.startDate).getTime()).toBe(30 * 24 * 60 * 60_000);
  });

  it("someone who declined the health-data consent is never shown Apple's sheet", async () => {
    consent.choice = "declined";
    expect(await healthEligibility("u")).toBe("no_consent");
    expect((await connectAppleHealth("u")).ok).toBe(false);
    expect(health.requestAuthorization).not.toHaveBeenCalled();
  });

  it("web: unavailable, nothing read", async () => {
    native.on = false;
    expect(await healthEligibility("u")).toBe("unavailable");
    expect(await maybeSyncAppleHealth("u", { force: true })).toBe(false);
    expect(health.readSamples).not.toHaveBeenCalled();
  });

  it("syncs on every app open, and on resume at most once a day; stops if consent is withdrawn", async () => {
    health.readSamples.mockResolvedValue({ samples: [] });
    await connectAppleHealth("u");
    health.readSamples.mockClear();
    const now = Date.now();
    expect(await maybeSyncAppleHealth("u", { now: now + 60_000 })).toBe(false);
    expect(await maybeSyncAppleHealth("u", { force: true, now: now + 60_000 })).toBe(true);
    expect(await maybeSyncAppleHealth("u", { now: now + 60_000 + 25 * 3600_000 })).toBe(true);
    consent.choice = "declined";
    expect(await maybeSyncAppleHealth("u", { force: true })).toBe(false);
  });
});
