/**
 * Release A3 (owner Nov 9, healthkit_write_v1): save completed Hammers Today cards to Apple Health.
 * iPhone app only; the website never runs any of this.
 * - Opt-in per phone ("Save my Hammers workouts to Apple Health" in Settings). Off = nothing saved
 *   or deleted, at once. Health-data consent declines are respected (never asked).
 * - ONE workout per completed card: activity type by card, the REAL first-to-last logging times
 *   (no real times = skipped), distance only for logged sprint/conditioning distance. Never
 *   calories, heart rate or anything not measured.
 * - Apple's workout id is stored per completion (health_workout_writes); un-mark deletes exactly
 *   that workout, a re-mark writes it once.
 * - SILENT: no toasts or UI anywhere; a failure goes to the owner's System checks (never pushed)
 *   and to one quiet line under the Settings switch.
 */
import { Preferences } from "@capacitor/preferences";
import { supabase } from "@/integrations/supabase/client";
import { isNativeIos, loadNativeFlags } from "./nativeFlags";
import { setJournalSwitch, workTimes } from "./workTimeJournal";
export { noteWorkTime, workTimes, healthWriteJournalOn } from "./workTimeJournal";
import { hasHealthConsent } from "./healthSync";
import { HealthWorkouts, type HealthShareStatus } from "./healthWorkoutPlugin";
export { PERMISSION_OFF_NOTE, healthNote, setHealthNote } from "./healthNotes";
import { PERMISSION_OFF_NOTE, reportHealthProblem, setHealthNote } from "./healthNotes";

// ── Pure rules ─────────────────────────────────────────────────────────────────────────────

export type HkActivity =
  | "traditionalStrengthTraining" | "highIntensityIntervalTraining" | "baseball" | "softball"
  | "preparationAndRecovery" | "flexibility";

/** Card kind → Apple workout type (owner A3 rules). null = not a workout, never written. */
export function workoutTypeFor(kind: string, sport: string | null | undefined): HkActivity | null {
  switch (kind) {
    case "lifts":
    case "strength":
      return "traditionalStrengthTraining";
    case "conditioning":
    case "speed":
      return "highIntensityIntervalTraining";
    case "hitting":
    case "bat_speed":
    case "bunting":
    case "defense":
    case "throwing":
    case "pitching":
    case "baserunning": // owner Nov 9: baserunning practice saves like the other practice cards
      return sport === "softball" ? "softball" : "baseball";
    case "windmill":
      return "softball";
    case "warmup":
      return "preparationAndRecovery";
    case "mobility":
    case "tissue_care":
    case "recovery":
      return "flexibility";
    default:
      // Mind, Game IQ, fueling, games (no entered start/end times) and anything unlisted.
      return null;
  }
}

/** Only these cards may carry a distance, and only what was logged. */
export const DISTANCE_KINDS = new Set(["speed", "conditioning"]);

/** A single tap is not a duration: less than this between first and last logging is skipped. */
export const MIN_WORKOUT_SECONDS = 60;

export type TimeSpan = { first: number; last: number };

/** First-to-last real logging time across the card, or null (skip, never invent). */
export function honestWindow(spans: readonly TimeSpan[]): { start: string; end: string } | null {
  const ok = spans.filter((s) => Number.isFinite(s.first) && Number.isFinite(s.last) && s.last >= s.first);
  if (ok.length === 0) return null;
  const start = Math.min(...ok.map((s) => s.first));
  const end = Math.max(...ok.map((s) => s.last));
  if (end - start < MIN_WORKOUT_SECONDS * 1000) return null;
  return { start: new Date(start).toISOString(), end: new Date(end).toISOString() };
}

const FEET_TO_METERS = 0.3048;

/** Sum of logged round distances (canonical feet) from real log rows → meters, or null. */
export function loggedDistanceMeters(rows: ReadonlyArray<{ metrics?: unknown }>): number | null {
  let feet = 0;
  for (const r of rows) {
    const rounds = (r.metrics as { rounds?: unknown } | null | undefined)?.rounds;
    if (!Array.isArray(rounds)) continue; // bulk "Mark done" rows carry no logged rounds
    for (const round of rounds) {
      const d = (round as { distance?: unknown } | null)?.distance;
      if (typeof d === "number" && Number.isFinite(d) && d > 0) feet += d;
    }
  }
  return feet > 0 ? Math.round(feet * FEET_TO_METERS * 100) / 100 : null;
}

function shortHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Stable card identity per day. Block cards include their drill set (bunting shares hitting's modality). */
export function cardKeyFor(kind: "wk" | "block", modality: string, side: "L" | "R" | null | undefined, keys: readonly string[]): string {
  const base = `${kind}:${modality}${side ? `:${side}` : ""}`;
  return kind === "block" ? `${base}:${shortHash([...keys].sort().join("|"))}` : base;
}

// ── The per-phone switch (Preferences is the record; the journal keeps a sync copy) ───────

const switchKey = (uid: string) => `hm.health.write.on.${uid}`;

export async function healthWriteSwitchOn(userId: string): Promise<boolean> {
  const { value } = await Preferences.get({ key: switchKey(userId) });
  const on = value === "1";
  setJournalSwitch(userId, on);
  return on;
}

export async function loadHealthWriteSwitch(userId: string | null): Promise<void> {
  if (!userId || !isNativeIos()) { setJournalSwitch(null, false); return; }
  await healthWriteSwitchOn(userId);
}

async function setSwitch(userId: string, on: boolean) {
  if (on) await Preferences.set({ key: switchKey(userId), value: "1" });
  else await Preferences.remove({ key: switchKey(userId) });
  setJournalSwitch(userId, on);
}

// ── Switch on / off (Settings) ─────────────────────────────────────────────────────────────

export async function healthWriteStatus(): Promise<HealthShareStatus> {
  try { return (await HealthWorkouts.authorizationStatus()).workouts; } catch { return "unavailable"; }
}

export type WriteEligibility = "unavailable" | "no_consent" | "ready";

export async function healthWriteEligibility(userId: string | null): Promise<WriteEligibility> {
  if (!isNativeIos() || !userId) return "unavailable";
  const flags = await loadNativeFlags(userId);
  if (!flags.healthkit_write_v1) return "unavailable";
  try { if (!(await HealthWorkouts.isAvailable()).available) return "unavailable"; } catch { return "unavailable"; }
  return (await hasHealthConsent()) ? "ready" : "no_consent";
}

/** Turning the switch on asks Apple for WORKOUT WRITE permission (Apple shows its sheet only the first time). */
export async function turnOnHealthWrite(userId: string): Promise<{ on: boolean; note: string | null }> {
  if ((await healthWriteEligibility(userId)) !== "ready") return { on: false, note: null };
  try {
    const r = await HealthWorkouts.requestAuthorization();
    if (r.workouts !== "authorized") { await setSwitch(userId, false); setHealthNote(userId, "write", PERMISSION_OFF_NOTE); return { on: false, note: PERMISSION_OFF_NOTE }; }
    await setSwitch(userId, true);
    setHealthNote(userId, "write", null);
    return { on: true, note: null };
  } catch {
    await setSwitch(userId, false);
    return { on: false, note: "Couldn't reach Apple Health. Try again." };
  }
}

/** Off stops all saving (and deleting) immediately. */
export async function turnOffHealthWrite(userId: string): Promise<void> {
  await setSwitch(userId, false);
  setHealthNote(userId, "write", null);
}

// ── Write / remove one card ────────────────────────────────────────────────────────────────

export interface CardWorkoutInput {
  userId: string | null | undefined;
  planDate: string;
  /** Card kind for the type map (e.g. "lifts", "recovery", "hitting", "warmup"). */
  kind: string;
  sport: string | null | undefined;
  cardKey: string;
  /** Prescription ids / block task ids whose logging times define the card's real window. */
  keys: readonly string[];
}

export type WriteOutcome =
  | { done: "saved"; workoutId: string }
  | { done: "skipped"; reason: "web" | "flag_off" | "switch_off" | "not_workout" | "no_consent" | "no_real_times" | "permission_off" | "already_saved" | "busy" }
  | { done: "failed"; error: string };

const inflight = new Set<string>();
// deno-lint-ignore no-explicit-any
const db = () => supabase as any;

async function gate(userId: string | null | undefined): Promise<WriteOutcome | null> {
  if (!isNativeIos() || !userId) return { done: "skipped", reason: "web" };
  const flags = await loadNativeFlags(userId);
  if (!flags.healthkit_write_v1) return { done: "skipped", reason: "flag_off" };
  if (!(await healthWriteSwitchOn(userId))) return { done: "skipped", reason: "switch_off" };
  if (!(await hasHealthConsent())) return { done: "skipped", reason: "no_consent" };
  return null;
}

export async function writeCardWorkout(input: CardWorkoutInput): Promise<WriteOutcome> {
  try {
    const type = workoutTypeFor(input.kind, input.sport);
    if (!type) return { done: "skipped", reason: "not_workout" };
    const blocked = await gate(input.userId);
    if (blocked) return blocked;
    const userId = input.userId as string;
    const window = honestWindow(workTimes(userId, input.planDate, input.keys));
    if (!window) return { done: "skipped", reason: "no_real_times" };
    const lock = `${userId}|${input.planDate}|${input.cardKey}`;
    if (inflight.has(lock)) return { done: "skipped", reason: "busy" };
    inflight.add(lock);
    try {
      if ((await healthWriteStatus()) !== "authorized") {
        await reportHealthProblem(userId, "write", PERMISSION_OFF_NOTE, "permission off in iPhone Settings");
        return { done: "skipped", reason: "permission_off" };
      }
      const live = await db().from("health_workout_writes").select("id, status, hk_workout_id")
        .eq("user_id", userId).eq("plan_date", input.planDate).eq("card_key", input.cardKey).neq("status", "deleted").maybeSingle();
      if (live.error) throw new Error(live.error.message);
      if (live.data?.status === "saved") return { done: "skipped", reason: "already_saved" };

      let distance: number | null = null;
      if (DISTANCE_KINDS.has(input.kind) && input.keys.length > 0) {
        const logs = await db().from("wk_session_logs").select("prescription_id, metrics").eq("user_id", userId).in("prescription_id", [...input.keys]);
        if (logs.error) throw new Error(logs.error.message);
        distance = loggedDistanceMeters(logs.data ?? []);
      }

      let id: string | null = live.data?.id ?? null; // a pending row from an interrupted save: reuse its id (Health replaces, never duplicates)
      if (!id) {
        const ins = await db().from("health_workout_writes").insert({
          user_id: userId, plan_date: input.planDate, card_key: input.cardKey, modality: input.kind, activity_type: type,
          started_at: window.start, ended_at: window.end, distance_m: distance, status: "pending",
        }).select("id").single();
        if (ins.error) {
          if (ins.error.code === "23505") return { done: "skipped", reason: "already_saved" };
          throw new Error(ins.error.message);
        }
        id = ins.data.id as string;
      }
      let saved: { workoutId: string; distanceSaved: boolean };
      try {
        saved = await HealthWorkouts.saveWorkout({ completionId: id, activityType: type, start: window.start, end: window.end, ...(distance ? { distanceMeters: distance } : {}) });
      } catch (e) {
        await db().from("health_workout_writes").delete().eq("id", id).eq("status", "pending");
        throw e;
      }
      const upd = await db().from("health_workout_writes").update({
        status: "saved", hk_workout_id: saved.workoutId, distance_m: saved.distanceSaved ? distance : null, updated_at: new Date().toISOString(),
      }).eq("id", id);
      if (upd.error) throw new Error(upd.error.message);
      setHealthNote(userId, "write", null);
      return { done: "saved", workoutId: saved.workoutId };
    } finally {
      inflight.delete(lock);
    }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    if (input.userId) await reportHealthProblem(input.userId, "write", "The last workout couldn't be saved to Apple Health.", error);
    return { done: "failed", error };
  }
}

export type RemoveOutcome = { done: "deleted" | "nothing" } | { done: "skipped"; reason: string } | { done: "failed"; error: string };

/** Un-mark: delete exactly the Health workout saved for this card (only while saving is on). */
export async function removeCardWorkout(input: Pick<CardWorkoutInput, "userId" | "planDate" | "cardKey">): Promise<RemoveOutcome> {
  try {
    const blocked = await gate(input.userId);
    if (blocked) return { done: "skipped", reason: (blocked as { reason: string }).reason };
    const userId = input.userId as string;
    const live = await db().from("health_workout_writes").select("id, hk_workout_id")
      .eq("user_id", userId).eq("plan_date", input.planDate).eq("card_key", input.cardKey).neq("status", "deleted");
    if (live.error) throw new Error(live.error.message);
    const rows = (live.data ?? []) as { id: string; hk_workout_id: string | null }[];
    if (rows.length === 0) return { done: "nothing" };
    for (const r of rows) {
      await HealthWorkouts.deleteWorkout({ completionId: r.id, workoutId: r.hk_workout_id });
      const upd = await db().from("health_workout_writes").update({ status: "deleted", deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", r.id);
      if (upd.error) throw new Error(upd.error.message);
    }
    return { done: "deleted" };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    if (input.userId) await reportHealthProblem(input.userId, "write", "The last un-marked workout couldn't be removed from Apple Health.", error);
    return { done: "failed", error };
  }
}

export function _resetHealthWorkoutsForTests() { setJournalSwitch(null, false); inflight.clear(); }
