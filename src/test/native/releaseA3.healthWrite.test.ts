import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks: iPhone, switches, Preferences, consent, the custom writer and an in-memory backend ──
const native = vi.hoisted(() => ({ on: true }));
const flags = vi.hoisted(() => ({ write: "all" as string, read: "all" as string }));
const consent = vi.hoisted(() => ({ choice: "accepted" as string | null }));
const prefs = vi.hoisted(() => new Map<string, string>());
const writer = vi.hoisted(() => ({
  status: "authorized" as string,
  isAvailable: vi.fn(async () => ({ available: true })),
  authorizationStatus: vi.fn(async () => ({ workouts: writer.status, distance: writer.status })),
  requestAuthorization: vi.fn(async () => ({ workouts: writer.status })),
  saveWorkout: vi.fn(async (_o: any) => ({ workoutId: `HK-${++writer.n}`, distanceSaved: true })),
  deleteWorkout: vi.fn(async (_o: any) => ({ deleted: 1 })),
  n: 0,
}));
const health = vi.hoisted(() => ({
  isAvailable: vi.fn(async () => ({ available: true })),
  requestAuthorization: vi.fn(async () => ({})),
  readSamples: vi.fn(async () => ({ samples: [] as any[] })),
}));
const db = vi.hoisted(() => ({ tables: {} as Record<string, any[]>, seq: 0 }));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => native.on, getPlatform: () => (native.on ? "ios" : "web") },
  registerPlugin: () => writer,
}));
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
vi.mock("@/integrations/supabase/client", () => {
  type F = { op: string; col: string; val: any };
  const rows = (t: string) => (db.tables[t] ??= []);
  const match = (r: any, fs: F[]) => fs.every((f) => f.op === "eq" ? r[f.col] === f.val : f.op === "neq" ? r[f.col] !== f.val : (f.val as any[]).includes(r[f.col]));
  const builder = (t: string) => {
    const st: { op: string; fs: F[]; payload?: any; single?: "single" | "maybe" } = { op: "select", fs: [] };
    const run = () => {
      if (t === "wk_feature_switches") {
        return { data: [
          { feature_key: "healthkit_write_v1", mode: flags.write, allowlist: [], updated_by: null },
          { feature_key: "healthkit_read_v1", mode: flags.read, allowlist: [], updated_by: null },
        ], error: null };
      }
      if (st.op === "insert") {
        const r = { id: `row-${++db.seq}`, ...st.payload };
        if (t === "health_workout_writes" && rows(t).some((x) => x.status !== "deleted" && x.user_id === r.user_id && x.plan_date === r.plan_date && x.card_key === r.card_key)) {
          return { data: null, error: { code: "23505", message: "duplicate" } };
        }
        rows(t).push(r);
        return { data: st.single ? { id: r.id } : null, error: null };
      }
      if (st.op === "upsert") { rows(t).push(...(Array.isArray(st.payload) ? st.payload : [st.payload])); return { data: null, error: null }; }
      const hit = rows(t).filter((r) => match(r, st.fs));
      if (st.op === "update") { hit.forEach((r) => Object.assign(r, st.payload)); return { data: null, error: null }; }
      if (st.op === "delete") { db.tables[t] = rows(t).filter((r) => !match(r, st.fs)); return { data: null, error: null }; }
      if (st.single) return { data: hit[0] ?? null, error: null };
      return { data: hit, error: null };
    };
    const b: any = {
      select: () => b,
      insert: (p: any) => { st.op = "insert"; st.payload = p; return b; },
      upsert: (p: any) => { st.op = "upsert"; st.payload = p; return b; },
      update: (p: any) => { st.op = "update"; st.payload = p; return b; },
      delete: () => { st.op = "delete"; return b; },
      eq: (col: string, val: any) => { st.fs.push({ op: "eq", col, val }); return b; },
      neq: (col: string, val: any) => { st.fs.push({ op: "neq", col, val }); return b; },
      in: (col: string, val: any[]) => { st.fs.push({ op: "in", col, val }); return b; },
      gte: () => b, lt: () => b, limit: () => b, order: () => b,
      single: () => { st.single = "single"; return b; },
      maybeSingle: () => { st.single = "maybe"; return b; },
      then: (res: any, rej: any) => Promise.resolve(run()).then(res, rej),
    };
    return b;
  };
  return { supabase: { from: builder, auth: { getUser: async () => ({ data: { user: { id: "u" } } }) } } };
});

import {
  workoutTypeFor, honestWindow, loggedDistanceMeters, cardKeyFor, writeCardWorkout, removeCardWorkout,
  turnOnHealthWrite, turnOffHealthWrite, loadHealthWriteSwitch, healthWriteEligibility, healthNote,
  PERMISSION_OFF_NOTE, _resetHealthWorkoutsForTests, MIN_WORKOUT_SECONDS,
} from "@/lib/native/healthWorkouts";
import { noteWorkTime, workTimes } from "@/lib/native/workTimeJournal";
import { _resetHealthNotesForTests } from "@/lib/native/healthNotes";
import { clearNativeFlags, loadNativeFlags } from "@/lib/native/nativeFlags";
import { connectAppleHealth, disableAppleHealthRead, maybeSyncAppleHealth } from "@/lib/native/healthSync";

const DATE = "2026-11-09";
const T0 = Date.parse("2026-11-09T16:00:00Z");
const card = (over: Partial<Parameters<typeof writeCardWorkout>[0]> = {}) => ({
  userId: "u", planDate: DATE, kind: "lifts", sport: "baseball", cardKey: "wk:lifts", keys: ["rx1", "rx2"], ...over,
});

async function switchOn() {
  await loadNativeFlags("u");
  expect((await turnOnHealthWrite("u")).on).toBe(true);
}
function logged(key: string, ...minutes: number[]) { for (const m of minutes) noteWorkTime("u", DATE, key, T0 + m * 60_000); }

beforeEach(() => {
  native.on = true; flags.write = "all"; flags.read = "all"; consent.choice = "accepted"; writer.status = "authorized"; writer.n = 0;
  prefs.clear(); db.tables = {}; db.seq = 0; localStorage.clear();
  clearNativeFlags(); _resetHealthWorkoutsForTests(); _resetHealthNotesForTests();
  for (const f of [writer.requestAuthorization, writer.saveWorkout, writer.deleteWorkout, health.requestAuthorization, health.readSamples]) f.mockClear();
});

describe("A3 type mapping (owner rules)", () => {
  it("maps each card kind to the Apple workout type", () => {
    expect(workoutTypeFor("lifts", "baseball")).toBe("traditionalStrengthTraining");
    expect(workoutTypeFor("conditioning", "baseball")).toBe("highIntensityIntervalTraining");
    expect(workoutTypeFor("speed", "softball")).toBe("highIntensityIntervalTraining");
    for (const k of ["hitting", "defense", "throwing", "pitching", "bunting", "bat_speed"]) {
      expect(workoutTypeFor(k, "baseball")).toBe("baseball");
      expect(workoutTypeFor(k, "softball")).toBe("softball");
    }
    expect(workoutTypeFor("windmill", "softball")).toBe("softball");
    expect(workoutTypeFor("warmup", "baseball")).toBe("preparationAndRecovery");
    for (const k of ["mobility", "tissue_care", "recovery"]) expect(workoutTypeFor(k, "baseball")).toBe("flexibility");
  });
  it("Mind, Game IQ, fueling and games are never workouts", () => {
    for (const k of ["mind", "game_iq", "fueling", "game"]) expect(workoutTypeFor(k, "baseball")).toBeNull();
  });
});

describe("A3 honest times", () => {
  it("first-to-last real logging time; a single tap or no times is skipped", () => {
    expect(honestWindow([])).toBeNull();
    expect(honestWindow([{ first: T0, last: T0 }])).toBeNull();
    expect(honestWindow([{ first: T0, last: T0 + (MIN_WORKOUT_SECONDS - 1) * 1000 }])).toBeNull();
    expect(honestWindow([{ first: T0 + 5 * 60_000, last: T0 + 9 * 60_000 }, { first: T0, last: T0 + 2 * 60_000 }]))
      .toEqual({ start: "2026-11-09T16:00:00.000Z", end: "2026-11-09T16:09:00.000Z" });
  });
  it("a card with no real logged times writes nothing to Apple Health", async () => {
    await switchOn();
    expect(await writeCardWorkout(card())).toEqual({ done: "skipped", reason: "no_real_times" });
    expect(writer.saveWorkout).not.toHaveBeenCalled();
  });
  it("writes the real start and end, no calories or heart rate", async () => {
    await switchOn();
    logged("rx1", 0, 6); logged("rx2", 10, 21);
    const r = await writeCardWorkout(card());
    expect(r).toMatchObject({ done: "saved" });
    const arg = writer.saveWorkout.mock.calls[0][0];
    expect(arg).toEqual({ completionId: expect.any(String), activityType: "traditionalStrengthTraining", start: "2026-11-09T16:00:00.000Z", end: "2026-11-09T16:21:00.000Z" });
    expect(Object.keys(arg).join(",")).not.toMatch(/calor|energy|heart/i);
  });
});

describe("A3 distance only for logged sprint/conditioning distance", () => {
  it("sums logged round distances (feet → meters); bulk Mark done rows carry none", () => {
    expect(loggedDistanceMeters([{ metrics: { rounds: [{ distance: 180 }, { distance: 180 }] } }, { metrics: null }])).toBeCloseTo(109.73, 2);
    expect(loggedDistanceMeters([{ metrics: null }, {}])).toBeNull();
  });
  it("conditioning sends the logged distance; a lift never sends one", async () => {
    await switchOn();
    db.tables.wk_session_logs = [{ user_id: "u", prescription_id: "c1", metrics: { rounds: [{ distance: 300 }] } }];
    logged("c1", 0, 12);
    await writeCardWorkout(card({ kind: "conditioning", cardKey: "wk:conditioning", keys: ["c1"] }));
    expect(writer.saveWorkout.mock.calls[0][0]).toMatchObject({ activityType: "highIntensityIntervalTraining", distanceMeters: 91.44 });
    db.tables.wk_session_logs.push({ user_id: "u", prescription_id: "rx1", metrics: { rounds: [{ distance: 300 }] } });
    logged("rx1", 0, 30);
    await writeCardWorkout(card({ keys: ["rx1"] }));
    expect(writer.saveWorkout.mock.calls[1][0]).not.toHaveProperty("distanceMeters");
  });
});

describe("A3 no duplicates, un-mark deletes, re-mark writes once", () => {
  it("a second write for the same card is refused; the id is stored per completion", async () => {
    await switchOn();
    logged("rx1", 0, 25);
    await writeCardWorkout(card());
    expect(await writeCardWorkout(card())).toEqual({ done: "skipped", reason: "already_saved" });
    await Promise.all([writeCardWorkout(card()), writeCardWorkout(card())]);
    expect(writer.saveWorkout).toHaveBeenCalledTimes(1);
    expect(db.tables.health_workout_writes).toHaveLength(1);
    expect(db.tables.health_workout_writes[0]).toMatchObject({ status: "saved", hk_workout_id: "HK-1", card_key: "wk:lifts", activity_type: "traditionalStrengthTraining" });
  });
  it("un-mark deletes exactly that workout; a re-mark writes it once", async () => {
    await switchOn();
    logged("rx1", 0, 25);
    await writeCardWorkout(card());
    const first = db.tables.health_workout_writes[0];
    expect(await removeCardWorkout(card())).toEqual({ done: "deleted" });
    expect(writer.deleteWorkout).toHaveBeenCalledWith({ completionId: first.id, workoutId: "HK-1" });
    expect(first.status).toBe("deleted");
    await writeCardWorkout(card());
    await writeCardWorkout(card());
    expect(writer.saveWorkout).toHaveBeenCalledTimes(2);
    expect(db.tables.health_workout_writes.filter((r) => r.status === "saved")).toHaveLength(1);
  });
  it("a failed Apple save leaves no saved row, so a later try can still write once", async () => {
    await switchOn();
    logged("rx1", 0, 25);
    writer.saveWorkout.mockRejectedValueOnce(new Error("HK busy"));
    expect(await writeCardWorkout(card())).toMatchObject({ done: "failed" });
    expect(db.tables.health_workout_writes ?? []).toHaveLength(0);
    expect(await writeCardWorkout(card())).toMatchObject({ done: "saved" });
  });
  it("block cards get distinct keys per drill set (bunting shares hitting's modality)", () => {
    expect(cardKeyFor("block", "hitting", null, ["hitting:tee"])).not.toBe(cardKeyFor("block", "hitting", null, ["hitting:bunt"]));
    expect(cardKeyFor("block", "hitting", null, ["b", "a"])).toBe(cardKeyFor("block", "hitting", null, ["a", "b"]));
    expect(cardKeyFor("wk", "bat_speed", "L", ["x"])).toBe("wk:bat_speed:L");
  });
});

describe("A3 switches stop immediately; nothing when off", () => {
  it("save switch off: nothing written or deleted, and no logging times recorded", async () => {
    await switchOn();
    logged("rx1", 0, 25);
    await writeCardWorkout(card());
    await turnOffHealthWrite("u");
    logged("rx3", 0, 25);
    expect(workTimes("u", DATE, ["rx3"])).toEqual([]);
    expect(await writeCardWorkout(card({ cardKey: "wk:speed", kind: "speed", keys: ["rx1"] }))).toEqual({ done: "skipped", reason: "switch_off" });
    expect(await removeCardWorkout(card())).toEqual({ done: "skipped", reason: "switch_off" });
    expect(writer.saveWorkout).toHaveBeenCalledTimes(1);
    expect(writer.deleteWorkout).not.toHaveBeenCalled();
  });
  it("switch flag off, or the website: nothing written, Apple never asked", async () => {
    flags.write = "off";
    await loadNativeFlags("u");
    expect(await healthWriteEligibility("u")).toBe("unavailable");
    expect((await turnOnHealthWrite("u")).on).toBe(false);
    expect(await writeCardWorkout(card())).toEqual({ done: "skipped", reason: "flag_off" });
    native.on = false; clearNativeFlags();
    expect(await writeCardWorkout(card())).toEqual({ done: "skipped", reason: "web" });
    expect(writer.requestAuthorization).not.toHaveBeenCalled();
    expect(writer.saveWorkout).not.toHaveBeenCalled();
  });
  it("read switch off stops reading at once, including a sync already running", async () => {
    await connectAppleHealth("u");
    health.readSamples.mockClear();
    await disableAppleHealthRead("u");
    expect(await maybeSyncAppleHealth("u", { force: true })).toBe(false);
    expect(health.readSamples).not.toHaveBeenCalled();
    await connectAppleHealth("u");
    db.tables.wearable_metrics = [];
    health.readSamples.mockImplementation(async () => { await disableAppleHealthRead("u"); return { samples: [{ dataType: "restingHeartRate", value: 55, startDate: "2026-11-08T06:00:00Z", platformId: "R9" }] }; });
    await maybeSyncAppleHealth("u", { force: true });
    expect(db.tables.wearable_metrics).toEqual([]);
    health.readSamples.mockImplementation(async () => ({ samples: [] }));
  });
});

describe("A3 consent gating", () => {
  it("someone who declined health-data consent is never asked and nothing is written", async () => {
    consent.choice = "declined";
    await loadNativeFlags("u");
    expect(await healthWriteEligibility("u")).toBe("no_consent");
    expect((await turnOnHealthWrite("u")).on).toBe(false);
    expect(writer.requestAuthorization).not.toHaveBeenCalled();
    prefs.set("hm.health.write.on.u", "1"); // even if the switch was on before declining
    await loadHealthWriteSwitch("u");
    logged("rx1", 0, 25);
    expect(await writeCardWorkout(card())).toEqual({ done: "skipped", reason: "no_consent" });
    expect(writer.saveWorkout).not.toHaveBeenCalled();
  });
  it("asks Apple for WORKOUT WRITE permission only when the switch is turned on", async () => {
    await loadNativeFlags("u");
    expect(writer.requestAuthorization).not.toHaveBeenCalled();
    await turnOnHealthWrite("u");
    expect(writer.requestAuthorization).toHaveBeenCalledTimes(1);
    expect(health.requestAuthorization).not.toHaveBeenCalled();
  });
});

describe("A3 quiet failures (System checks, no interruption)", () => {
  it("permission revoked in iPhone Settings: skipped, owner System checks row, one quiet Settings line", async () => {
    await switchOn();
    writer.status = "denied";
    logged("rx1", 0, 25);
    expect(await writeCardWorkout(card())).toEqual({ done: "skipped", reason: "permission_off" });
    expect(healthNote("u", "write")).toBe(PERMISSION_OFF_NOTE);
    expect(db.tables.plan_check_failures).toEqual([expect.objectContaining({ user_id: "u", check_key: "apple_health" })]);
  });
  it("a save error never throws to the card", async () => {
    await switchOn();
    logged("rx1", 0, 25);
    writer.saveWorkout.mockRejectedValueOnce(new Error("boom"));
    await expect(writeCardWorkout(card())).resolves.toMatchObject({ done: "failed" });
    expect(db.tables.plan_check_failures?.[0]).toMatchObject({ check_key: "apple_health" });
  });
});
