// Tissue Cost Scheduler — stage S3 shadow mode, database layer.
//
// SHADOW ONLY. Nothing here reads, writes or influences wk_prescriptions or
// any card. It fetches read-only inputs, runs decide() inside the v1.1 circuit
// breaker, and stores the result in wk_schedule_decisions.

import { TCS_CONFIG, TCS_THRESHOLDS_HASH, TCS_VERSION } from "../config.ts";
import { addDays } from "../tanks.ts";
import { decideGuarded, type GuardedDecision } from "../v11/guard.ts";
import {
  buildShadowInputs,
  type RawShadowData,
  SHADOW_ADAPTER_VERSION,
  type ShadowInputs,
} from "./adapter.ts";

export const SHADOW_VERSION = `${TCS_VERSION}_shadow`;

/** Minimal shape of the service-role client, so this file has no SDK import. */
export interface DbClient {
  from(table: string): any;
}

export interface ShadowSnapshot {
  adapter: string;
  today: string;
  timezone: string;
  profile: ShadowInputs["profile"];
  history: ShadowInputs["history"];
  calendar: ShadowInputs["calendar"];
  checkIns: ShadowInputs["checkIns"];
  adapterDiagnostics: string[];
}

export interface ShadowResult {
  userId: string;
  date: string;
  decision: GuardedDecision;
  snapshot: ShadowSnapshot;
}

const HORIZON_DAYS = 14;

/** §2 — read-only fetch of every documented input source. */
export async function fetchShadowData(
  db: DbClient,
  userId: string,
  today: string,
  timezone = "UTC",
): Promise<RawShadowData> {
  const windowStart = addDays(today, -TCS_CONFIG.historyWindowDays);
  const horizonEnd = addDays(today, HORIZON_DAYS);
  const rows = async (q: any) => ((await q).data ?? []) as any[];

  const [
    mpiRes,
    contextRes,
    prescriptions,
    sessionLogs,
    games,
    calendarEvents,
    practices,
    throwingReps,
    speedSessions,
    quizzes,
    dailyLogs,
  ] = await Promise.all([
    db.from("athlete_mpi_settings").select(
      "sport,primary_position,date_of_birth,season_status,preseason_start_date,preseason_end_date,in_season_start_date,in_season_end_date,post_season_start_date,post_season_end_date",
    ).eq("user_id", userId).maybeSingle(),
    db.from("athlete_context").select(
      "sport_primary,position_primary,season_phase,lifting_age_years,competition_level",
    ).eq("user_id", userId).maybeSingle(),
    rows(
      db.from("wk_prescriptions").select("plan_date,slot,movement_slug,cns_cost,sets,status")
        .eq("user_id", userId).gte("plan_date", windowStart).lte("plan_date", horizonEnd),
    ),
    rows(
      db.from("wk_session_logs").select("plan_date,movement_slug,sets_completed")
        .eq("user_id", userId).gte("plan_date", windowStart).lte("plan_date", today),
    ),
    rows(
      db.from("gp_games").select(
        "game_date,my_positions,is_starting_pitcher,is_doubleheader,ignored_for_training,deleted_at",
      ).eq("user_id", userId).gte("game_date", windowStart).lte("game_date", horizonEnd),
    ),
    rows(
      db.from("calendar_events").select(
        "event_date,event_type,is_starting_pitcher,is_doubleheader,ignored_for_training,deleted_at",
      ).eq("user_id", userId).gte("event_date", windowStart).lte("event_date", horizonEnd),
    ),
    rows(
      db.from("scheduled_practice_sessions").select(
        "scheduled_date,practice_kind,intensity,duration_minutes,status",
      ).eq("user_id", userId).gte("scheduled_date", windowStart).lte("scheduled_date", horizonEnd),
    ),
    rows(
      db.from("throwing_reps").select("created_at,metric,value,unit")
        .eq("user_id", userId).gte("created_at", windowStart),
    ),
    rows(
      db.from("speed_sessions").select("session_date,distances")
        .eq("user_id", userId).gte("session_date", windowStart).lte("session_date", today),
    ),
    rows(
      db.from("vault_focus_quizzes").select(
        "entry_date,hours_slept,sleep_quality,perceived_recovery,pain_location,pain_scale",
      ).eq("user_id", userId).gte("entry_date", windowStart).lte("entry_date", today),
    ),
    rows(
      db.from("athlete_daily_log").select(
        "entry_date,day_status,injury_mode,injury_body_region,game_logged",
      ).eq("user_id", userId).gte("entry_date", windowStart).lte("entry_date", today),
    ),
  ]);

  return {
    userId,
    today,
    timezone,
    windowStart,
    horizonEnd,
    mpi: (mpiRes as any)?.data ?? null,
    context: (contextRes as any)?.data ?? null,
    prescriptions: prescriptions as any,
    sessionLogs: sessionLogs as any,
    games: games as any,
    calendarEvents: calendarEvents as any,
    practices: practices as any,
    throwingReps: throwingReps as any,
    speedSessions: speedSessions as any,
    quizzes: quizzes as any,
    dailyLogs: dailyLogs as any,
  };
}

/** Pure: snapshot + guarded decision from already-fetched rows. */
export function decideFromRaw(raw: RawShadowData): ShadowResult {
  // Decide on the exact object that gets stored. A JSON round-trip drops
  // `undefined` fields, so hashing the pre-storage shape is the only way a
  // recompute from the snapshot can be byte-identical.
  const inputs = JSON.parse(JSON.stringify(buildShadowInputs(raw))) as ShadowInputs;
  const decision = decideGuarded(
    inputs.profile,
    inputs.history,
    inputs.calendar,
    inputs.checkIns,
    TCS_CONFIG,
    raw.today,
    raw.timezone,
  );
  return {
    userId: raw.userId,
    date: raw.today,
    decision,
    snapshot: {
      adapter: SHADOW_ADAPTER_VERSION,
      today: raw.today,
      timezone: raw.timezone,
      profile: inputs.profile,
      history: inputs.history,
      calendar: inputs.calendar,
      checkIns: inputs.checkIns,
      adapterDiagnostics: inputs.diagnostics,
    },
  };
}

/** Recompute a decision from a stored snapshot — used by the nightly check. */
export function decideFromSnapshot(snapshot: ShadowSnapshot): GuardedDecision {
  return decideGuarded(
    snapshot.profile,
    snapshot.history,
    snapshot.calendar,
    snapshot.checkIns,
    TCS_CONFIG,
    snapshot.today,
    snapshot.timezone ?? "UTC",
  );
}

export function decisionRow(result: ShadowResult, source: string) {
  const d = result.decision;
  return {
    user_id: result.userId,
    decision_date: result.date,
    version: SHADOW_VERSION,
    config_hash: d.configHash,
    thresholds_hash: TCS_THRESHOLDS_HASH,
    inputs_hash: d.inputsHash,
    inputs_snapshot: result.snapshot as unknown as Record<string, unknown>,
    tank_levels: d.tankLevels as unknown as Record<string, unknown>,
    allowed_class: d.allowedClass,
    timing: d.timing,
    next_heavy_date: d.nextHeavyDate,
    reasons: d.reasons,
    floors_applied: d.floorsApplied,
    diagnostics: [...result.snapshot.adapterDiagnostics, ...d.diagnostics],
    fallback_used: d.fallbackUsed === true,
    source,
  };
}

/** Fetch → decide → store. Never throws: shadow mode can never break a caller. */
export async function runShadowDecision(
  db: DbClient,
  userId: string,
  today: string,
  timezone = "UTC",
  source = "nightly",
): Promise<{ ok: boolean; fallback: boolean; error?: string }> {
  try {
    const raw = await fetchShadowData(db, userId, today, timezone);
    const result = decideFromRaw(raw);
    const { error } = await db
      .from("wk_schedule_decisions")
      .upsert(decisionRow(result, source), { onConflict: "user_id,decision_date,version" });
    if (error) return { ok: false, fallback: result.decision.fallbackUsed === true, error: error.message };
    return { ok: true, fallback: result.decision.fallbackUsed === true };
  } catch (e) {
    return { ok: false, fallback: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Two decisions match when every stored field is identical (§4). */
export function decisionsMatch(
  stored: {
    allowed_class: string;
    timing: string;
    next_heavy_date: string | null;
    inputs_hash: string;
    config_hash: string;
    reasons: unknown;
    floors_applied: unknown;
    tank_levels: unknown;
  },
  fresh: GuardedDecision,
): boolean {
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  return stored.allowed_class === fresh.allowedClass &&
    stored.timing === fresh.timing &&
    (stored.next_heavy_date ?? null) === (fresh.nextHeavyDate ?? null) &&
    stored.inputs_hash === fresh.inputsHash &&
    stored.config_hash === fresh.configHash &&
    same(stored.reasons, fresh.reasons) &&
    same(stored.floors_applied, fresh.floorsApplied) &&
    same(stored.tank_levels, fresh.tankLevels);
}
