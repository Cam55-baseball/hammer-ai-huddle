/**
 * Apple Health read (owner Nov 8, healthkit_read_v1). READ ONLY.
 * - Only for people who accepted the app's health-data consent; anyone who declined is
 *   never asked unless they later opt in (Settings → Legal & privacy).
 * - Apple's permission sheet opens only when the person taps "Connect Apple Health".
 * - Syncs the last 30 days of sleep (asleep, in bed), heart-rate variability (SDNN) and
 *   resting heart rate on app open and at most daily, into wearable_metrics, deduped by
 *   Apple's sample id. Readiness math is unchanged.
 */
import { Health, type HealthSample, type HealthDataType } from "@capgo/capacitor-health";
import { Preferences } from "@capacitor/preferences";
import { supabase } from "@/integrations/supabase/client";
import { isNativeIos, loadNativeFlags } from "./nativeFlags";
import { myConsentStatus, AGREEMENT_SLUGS } from "@/lib/legal/legalV2";

export const HEALTH_READ_TYPES: HealthDataType[] = ["sleep", "heartRateVariability", "restingHeartRate"];
const DAY = 24 * 60 * 60_000;
const connectedKey = (uid: string) => `hm.health.connected.${uid}`;
const lastSyncKey = (uid: string) => `hm.health.lastSync.${uid}`;

export interface WearableRow {
  user_id: string;
  captured_at: string;
  ended_at: string | null;
  source: "healthkit";
  metric: "sleep_asleep" | "sleep_in_bed" | "hrv_sdnn" | "resting_hr";
  sample_id: string;
  device_name: string | null;
  hrv_ms: number | null;
  rhr_bpm: number | null;
  sleep_min: number | null;
  in_bed_min: number | null;
  raw: Record<string, unknown>;
  schema_version: number;
}

/** Pure: one Apple Health sample → one saved row (or null when it isn't one we keep). */
export function sampleToRow(userId: string, s: HealthSample): WearableRow | null {
  if (!s?.platformId || !s.startDate || !Number.isFinite(s.value)) return null;
  const base = {
    user_id: userId, captured_at: s.startDate, ended_at: s.endDate ?? null, source: "healthkit" as const,
    sample_id: s.platformId, device_name: s.sourceName ?? null,
    hrv_ms: null, rhr_bpm: null, sleep_min: null, in_bed_min: null, schema_version: 2,
    raw: { type: s.dataType, value: s.value, unit: s.unit, sleepState: s.sleepState ?? null, sourceId: s.sourceId ?? null },
  };
  const v = Math.round(s.value);
  switch (s.dataType) {
    case "heartRateVariability":
      return v > 0 && v < 500 ? { ...base, metric: "hrv_sdnn", hrv_ms: v } : null;
    case "restingHeartRate":
      return v >= 20 && v <= 250 ? { ...base, metric: "resting_hr", rhr_bpm: v } : null;
    case "sleep": {
      if (v <= 0 || v > 24 * 60) return null;
      if (s.sleepState === "inBed") return { ...base, metric: "sleep_in_bed", in_bed_min: v };
      if (s.sleepState && ["asleep", "light", "deep", "rem"].includes(s.sleepState)) return { ...base, metric: "sleep_asleep", sleep_min: v };
      return null; // "awake" segments are not sleep time
    }
    default:
      return null;
  }
}

/** Pure: samples → rows, one per Apple sample id. */
export function samplesToRows(userId: string, samples: HealthSample[]): WearableRow[] {
  const seen = new Set<string>();
  const out: WearableRow[] = [];
  for (const s of samples) {
    const r = sampleToRow(userId, s);
    if (!r || seen.has(r.sample_id)) continue;
    seen.add(r.sample_id);
    out.push(r);
  }
  return out;
}

export async function hasHealthConsent(): Promise<boolean> {
  try {
    const st = await myConsentStatus();
    return st[AGREEMENT_SLUGS.healthConsent]?.choice === "accepted";
  } catch {
    return false;
  }
}

export type HealthEligibility = "unavailable" | "no_consent" | "ready" | "connected";

/** Whether the "Connect Apple Health" button may show for this person, and its state. */
export async function healthEligibility(userId: string | null): Promise<HealthEligibility> {
  if (!isNativeIos() || !userId) return "unavailable";
  const flags = await loadNativeFlags(userId);
  if (!flags.healthkit_read_v1) return "unavailable";
  try { if (!(await Health.isAvailable()).available) return "unavailable"; } catch { return "unavailable"; }
  if (!(await hasHealthConsent())) return "no_consent";
  const { value } = await Preferences.get({ key: connectedKey(userId) });
  return value ? "connected" : "ready";
}

/** Saves rows in batches; repeated syncs never duplicate a sample. */
export async function saveRows(rows: WearableRow[]): Promise<number> {
  let saved = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await supabase.from("wearable_metrics").upsert(chunk as any, { onConflict: "user_id,sample_id", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
    saved += chunk.length;
  }
  return saved;
}

export async function syncAppleHealth(userId: string, now = Date.now()): Promise<{ rows: number }> {
  const startDate = new Date(now - 30 * DAY).toISOString();
  const endDate = new Date(now).toISOString();
  const all: HealthSample[] = [];
  for (const dataType of HEALTH_READ_TYPES) {
    try {
      const { samples } = await Health.readSamples({ dataType, startDate, endDate, limit: dataType === "sleep" ? 3000 : 1500 });
      all.push(...(samples ?? []));
    } catch (e) {
      console.warn("[health] read skipped", dataType, e);
    }
  }
  const rows = samplesToRows(userId, all);
  await saveRows(rows);
  await Preferences.set({ key: lastSyncKey(userId), value: String(now) });
  return { rows: rows.length };
}

/** Button tap: Apple's read-only permission sheet, then the first sync. */
export async function connectAppleHealth(userId: string): Promise<{ ok: boolean; rows?: number; error?: string }> {
  if ((await healthEligibility(userId)) === "unavailable") return { ok: false, error: "Apple Health isn't available here." };
  if (!(await hasHealthConsent())) return { ok: false, error: "Turn on Health information in Settings → Legal & privacy first." };
  try {
    await Health.requestAuthorization({ read: HEALTH_READ_TYPES, write: [] });
    await Preferences.set({ key: connectedKey(userId), value: new Date().toISOString() });
    const r = await syncAppleHealth(userId);
    return { ok: true, rows: r.rows };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't connect Apple Health." };
  }
}

/**
 * App open (force) and resume (daily): sync when connected and consent is still given.
 * A consent change to "declined" stops syncing at once.
 */
export async function maybeSyncAppleHealth(userId: string | null, opts: { force?: boolean; now?: number } = {}): Promise<boolean> {
  const now = opts.now ?? Date.now();
  if ((await healthEligibility(userId)) !== "connected" || !userId) return false;
  const { value } = await Preferences.get({ key: lastSyncKey(userId) });
  const last = Number(value ?? 0);
  if (!opts.force && last && now - last < DAY) return false;
  try { await syncAppleHealth(userId, now); return true; } catch (e) { console.warn("[health] sync failed", e); return false; }
}
