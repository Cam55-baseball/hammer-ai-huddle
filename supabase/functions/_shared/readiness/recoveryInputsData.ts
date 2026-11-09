// Release A2: reads the recovery inputs for one player and one plan date. Shared by the plan
// builder (service client, explicit user filter) and Today's readiness line (the player's own
// client). Read failures return null so the caller keeps the unadjusted readiness — never a guess.
import { isSwitchOnFor, type FeatureSwitchRow } from "../wic/flags/featureSwitches.ts";
import {
  RECOVERY_SETTING_KEY, recoveryThresholdsFrom, type RecoveryFlags, type RecoveryInputs, type RecoveryThresholds,
  type StressAnswer, type HealthSampleRow, type MentalLoadRow,
} from "./recoveryAdjust.ts";
import { LEDGER_UNIFY_KEY, viaLedger, type LedgerDb } from "../ledger/ledgerRead.ts";

export const RECOVERY_FLAG_KEYS = { mentalLoad: "mental_load_v1", health: "readiness_health_v1" } as const;

const shift = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

// deno-lint-ignore no-explicit-any
type Db = { from: (t: string) => any; rpc?: (fn: string, args?: Record<string, unknown>) => any };

export interface LoadedRecoveryInputs { inputs: RecoveryInputs; flags: RecoveryFlags; thresholds: RecoveryThresholds }

export async function loadRecoveryInputs(db: Db, userId: string, planDate: string): Promise<LoadedRecoveryInputs | null> {
  const sw = await db.from("wk_feature_switches").select("feature_key, mode, allowlist, updated_by")
    .in("feature_key", [RECOVERY_FLAG_KEYS.mentalLoad, RECOVERY_FLAG_KEYS.health, LEDGER_UNIFY_KEY]);
  if (sw.error) return null;
  const rows = (sw.data ?? []) as FeatureSwitchRow[];
  const flags: RecoveryFlags = {
    mentalLoad: isSwitchOnFor(rows.find((r) => r.feature_key === RECOVERY_FLAG_KEYS.mentalLoad), userId),
    health: isSwitchOnFor(rows.find((r) => r.feature_key === RECOVERY_FLAG_KEYS.health), userId),
  };
  // Release 0b: measurement numbers come through the ledger only when ledger_unify_v1 is on for this player.
  const ledgerOn = typeof db.rpc === "function" && isSwitchOnFor(rows.find((r) => r.feature_key === LEDGER_UNIFY_KEY), userId);
  const viaL = <T,>(table: "vault_focus_quizzes" | "wearable_metrics", r: T[]) => viaLedger(db as LedgerDb, table, r, ledgerOn);
  const empty: RecoveryInputs = { planDate, stress: [], mentalLoads: [], health: [] };
  if (!flags.mentalLoad && !flags.health) return { inputs: empty, flags, thresholds: recoveryThresholdsFrom(null) };

  const setting = await db.from("app_settings").select("setting_value").eq("setting_key", RECOVERY_SETTING_KEY).maybeSingle();
  if (setting.error) return null;
  const thresholds = recoveryThresholdsFrom(setting.data?.setting_value);
  const inputs: RecoveryInputs = { ...empty };

  if (flags.mentalLoad) {
    const [quiz, quick, ledger] = await Promise.all([
      db.from("vault_focus_quizzes").select("id, user_id, stress_level, created_at").eq("user_id", userId)
        .eq("entry_date", planDate).eq("quiz_type", "morning").not("stress_level", "is", null).limit(5),
      db.from("asb_events").select("payload, occurred_at").eq("athlete_id", userId).eq("topic_id", "behavioral.stress")
        .gte("occurred_at", `${planDate}T00:00:00Z`).lt("occurred_at", `${shift(planDate, 1)}T00:00:00Z`).limit(20),
      db.from("athlete_metric_observations").select("value, capture_context").eq("user_id", userId)
        .eq("metric_key", "mental_load").eq("source", "manual")
        .gte("recorded_at", `${shift(planDate, -(thresholds.mentalWindowDays + 3))}T00:00:00Z`).limit(1000),
    ]);
    if (quiz.error || quick.error || ledger.error) return null;
    const stress: StressAnswer[] = [];
    for (const q of await viaL("vault_focus_quizzes", (quiz.data ?? []) as any[])) stress.push({ at: String(q.created_at), value: Number(q.stress_level), scale: 5 });
    for (const e of quick.data ?? []) {
      const v = Number((e.payload as Record<string, unknown> | null)?.score);
      if (Number.isFinite(v)) stress.push({ at: String(e.occurred_at), value: v, scale: 10 });
    }
    const loads: MentalLoadRow[] = [];
    for (const r of ledger.data ?? []) {
      const d = (r.capture_context as Record<string, unknown> | null)?.activity_date;
      if (typeof d === "string" && Number.isFinite(Number(r.value))) loads.push({ activity_date: d.slice(0, 10), value: Number(r.value) });
    }
    inputs.stress = stress;
    inputs.mentalLoads = loads;
  }

  if (flags.health) {
    const h = await db.from("wearable_metrics").select("id, user_id, captured_at, metric, hrv_ms, rhr_bpm, source")
      .eq("user_id", userId).eq("source", "healthkit").in("metric", ["hrv_sdnn", "resting_hr"])
      .gte("captured_at", `${shift(planDate, -(thresholds.healthBaselineDays - 1))}T00:00:00Z`)
      .lt("captured_at", `${shift(planDate, 1)}T00:00:00Z`).limit(5000);
    if (h.error) return null;
    inputs.health = (await viaL("wearable_metrics", (h.data ?? []) as any[])) as HealthSampleRow[];
  }
  return { inputs, flags, thresholds };
}
