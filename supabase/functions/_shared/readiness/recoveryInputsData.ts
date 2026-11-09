// Release A2: reads the Apple Health recovery inputs for one player and one plan date (Today's
// readiness line, the player's own client). Read failures return null so the caller keeps the
// unadjusted readiness — never a guess.
// Owner Nov 9: stress answers and mental load are no longer read here (removed from readiness).
import { isSwitchOnFor, type FeatureSwitchRow } from "../wic/flags/featureSwitches.ts";
import {
  RECOVERY_SETTING_KEY, recoveryThresholdsFrom, type RecoveryFlags, type RecoveryInputs, type RecoveryThresholds,
  type HealthSampleRow,
} from "./recoveryAdjust.ts";
import { LEDGER_UNIFY_KEY, viaLedger, type LedgerDb } from "../ledger/ledgerRead.ts";

export const RECOVERY_FLAG_KEYS = { health: "readiness_health_v1" } as const;

const shift = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

// deno-lint-ignore no-explicit-any
type Db = { from: (t: string) => any; rpc?: (fn: string, args?: Record<string, unknown>) => any };

export interface LoadedRecoveryInputs { inputs: RecoveryInputs; flags: RecoveryFlags; thresholds: RecoveryThresholds }

export async function loadRecoveryInputs(db: Db, userId: string, planDate: string): Promise<LoadedRecoveryInputs | null> {
  const sw = await db.from("wk_feature_switches").select("feature_key, mode, allowlist, updated_by")
    .in("feature_key", [RECOVERY_FLAG_KEYS.health, LEDGER_UNIFY_KEY]);
  if (sw.error) return null;
  const rows = (sw.data ?? []) as FeatureSwitchRow[];
  const flags: RecoveryFlags = {
    health: isSwitchOnFor(rows.find((r) => r.feature_key === RECOVERY_FLAG_KEYS.health), userId),
  };
  // Release 0b: measurement numbers come through the ledger only when ledger_unify_v1 is on for this player.
  const ledgerOn = typeof db.rpc === "function" && isSwitchOnFor(rows.find((r) => r.feature_key === LEDGER_UNIFY_KEY), userId);
  const empty: RecoveryInputs = { planDate, health: [] };
  if (!flags.health) return { inputs: empty, flags, thresholds: recoveryThresholdsFrom(null) };

  const setting = await db.from("app_settings").select("setting_value").eq("setting_key", RECOVERY_SETTING_KEY).maybeSingle();
  if (setting.error) return null;
  const thresholds = recoveryThresholdsFrom(setting.data?.setting_value);

  const h = await db.from("wearable_metrics").select("id, user_id, captured_at, metric, hrv_ms, rhr_bpm, source")
    .eq("user_id", userId).eq("source", "healthkit").in("metric", ["hrv_sdnn", "resting_hr"])
    .gte("captured_at", `${shift(planDate, -(thresholds.healthBaselineDays - 1))}T00:00:00Z`)
    .lt("captured_at", `${shift(planDate, 1)}T00:00:00Z`).limit(5000);
  if (h.error) return null;
  // deno-lint-ignore no-explicit-any
  const health = (await viaLedger(db as LedgerDb, "wearable_metrics", (h.data ?? []) as any[], ledgerOn)) as HealthSampleRow[];
  return { inputs: { planDate, health }, flags, thresholds };
}
