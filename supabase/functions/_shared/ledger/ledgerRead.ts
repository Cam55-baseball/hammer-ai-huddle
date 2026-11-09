/**
 * Release 0b: the ledger-backed READ path (switch ledger_unify_v1). Hook-free, shared by the app and edge functions.
 *
 * A reader keeps its own query (dates, notes, locations, ordering) and, only for athletes inside
 * ledger_unify_v1, swaps every measurement number in those rows for the ledger's value through the
 * database function `ledger_project_rows` (one mapping, the same one the parity check uses). Rows must
 * carry `id` and `user_id`; rows without them are returned untouched.
 *
 * While the switch is off (today, for everyone) nothing extra is queried and the rows are returned as-is.
 * A failed ledger read keeps the reader's own rows (the screen keeps working) and is logged, never hidden.
 */
import { isSwitchOnFor, type FeatureSwitchRow } from "../wic/flags/featureSwitches.ts";

export const LEDGER_UNIFY_KEY = "ledger_unify_v1" as const;

/** Source tables the ledger path can rebuild (must match public.ledger_project_row). */
export const LEDGER_READ_TABLES = [
  "vault_performance_tests", "vault_focus_quizzes", "wearable_metrics", "cv_velocity_measurements", "throwing_reps", "catching_reps",
  "gp_at_bats", "gp_pitches", "defensive_plays", "athlete_height_checks", "weight_entries", "speed_partner_timings", "custom_activity_logs",
  "combine_results", "baserunning_splits", "hie_snapshots", "athlete_load_tracking", "athlete_daily_log", "block_workout_metrics",
] as const;
export type LedgerReadTable = (typeof LEDGER_READ_TABLES)[number];

// deno-lint-ignore no-explicit-any
type Q = any;
export type LedgerDb = { from: (t: string) => Q; rpc: (fn: string, args?: Record<string, unknown>) => Q };

/** Is the ledger read path on for this athlete? One small read of the switch row; any failure = off. */
export async function ledgerUnifyOn(db: LedgerDb, athleteId: string | null | undefined): Promise<boolean> {
  if (!athleteId) return false;
  try {
    const { data, error } = await db.from("wk_feature_switches").select("feature_key, mode, allowlist, updated_by")
      .eq("feature_key", LEDGER_UNIFY_KEY).maybeSingle();
    if (error) return false;
    return isSwitchOnFor((data ?? null) as FeatureSwitchRow | null, athleteId);
  } catch {
    return false;
  }
}

/** Pure: which rows can be projected (they carry the identity the ledger is keyed by). */
export function projectable<T>(rows: readonly T[]): boolean {
  return rows.length > 0 && rows.every((r) => {
    const o = r as Record<string, unknown> | null;
    return !!o && typeof o.id === "string" && typeof o.user_id === "string";
  });
}

/**
 * Ledger path for a reader. `on` is the caller's ledgerUnifyOn answer (so one switch read serves several readers).
 * Off, empty, or rows without id/user_id → the rows unchanged, with no query.
 */
export async function viaLedger<T>(db: LedgerDb, table: LedgerReadTable, rows: T[], on: boolean): Promise<T[]> {
  if (!on || !projectable(rows)) return rows;
  try {
    const { data, error } = await db.rpc("ledger_project_rows", { _table: table, _rows: rows });
    if (error || !Array.isArray(data) || data.length !== rows.length) {
      console.error("[ledger-read] projection failed; showing the stored rows", table, error?.message ?? "shape");
      return rows;
    }
    return data as T[];
  } catch (e) {
    console.error("[ledger-read] projection failed; showing the stored rows", table, e instanceof Error ? e.message : String(e));
    return rows;
  }
}

/** Single-row convenience (maybeSingle readers). */
export async function viaLedgerOne<T>(db: LedgerDb, table: LedgerReadTable, row: T | null, on: boolean): Promise<T | null> {
  if (!row) return row;
  const [out] = await viaLedger(db, table, [row], on);
  return out ?? row;
}
