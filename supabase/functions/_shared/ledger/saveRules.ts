/**
 * Release 0: the rules every measurement passes before the ONE save path (ledger-save → ledger_save).
 * Pure and hook-free so the edge function and tests use the same judge.
 *  - Only dictionary (canonical) metric keys.
 *  - Camera numbers: real counted fps is required and must reach the metric's required fps (gate 1);
 *    the value must be physically possible (gate 3). Missing beats fabricated: no defaults.
 *  - In-app (iPhone camera/sensor) measurements: iPhone only, movement consent when that switch is on,
 *    and a verified App Attest assertion when app_attest_v1 is on.
 */
export type SourceKind = "cv_measured" | "manual" | "healthkit" | "derived";

export interface DictRow {
  metric_key: string;
  unit: string;
  physical_min: number | null;
  physical_max: number | null;
  required_fps: number | null;
  in_app_only: boolean;
  privacy_class: "training" | "health";
}

export interface IncomingMeasurement {
  metric_key: string;
  value: number;
  unit?: string | null;
  captured_at?: string | null;
  source_kind: SourceKind;
  capture_fps?: number | null;
  device_model?: string | null;
  capture_conditions?: Record<string, unknown> | null;
  session_id?: string | null;
  rep_index?: number | null;
  confidence?: number | null;
  source_row_id?: string | null;
  side?: "left" | "right" | null;
}

export interface SaveContext {
  platform: "ios" | "web";
  movementConsentOn: boolean;
  movementConsentActive: boolean;
  attestOn: boolean;
  attested: boolean;
}

export type Verdict = { ok: true; inApp: boolean } | { ok: false; reason: string; status: number };

export function isInAppMeasurement(def: DictRow, m: IncomingMeasurement): boolean {
  return def.in_app_only || m.source_kind === "cv_measured";
}

export function judgeMeasurement(def: DictRow | undefined, m: IncomingMeasurement, ctx: SaveContext): Verdict {
  if (!def) return { ok: false, reason: "unknown_metric", status: 400 };
  if (!Number.isFinite(m.value)) return { ok: false, reason: "no_value", status: 400 };
  if (m.unit && m.unit !== def.unit) return { ok: false, reason: "unit_mismatch", status: 400 };
  const inApp = isInAppMeasurement(def, m);
  if (m.source_kind === "healthkit" || m.source_kind === "derived") return { ok: false, reason: "not_a_client_source", status: 400 };
  if (inApp) {
    if (ctx.platform !== "ios") return { ok: false, reason: "iphone_app_only", status: 403 };
    if (ctx.movementConsentOn && !ctx.movementConsentActive) return { ok: false, reason: "movement_consent_required", status: 403 };
    if (ctx.attestOn && !ctx.attested) return { ok: false, reason: "app_attest_required", status: 403 };
  }
  if (m.source_kind === "cv_measured") {
    if (m.capture_fps == null || !(m.capture_fps > 0)) return { ok: false, reason: "capture_fps_missing", status: 422 };
    if (def.required_fps != null && m.capture_fps < def.required_fps) return { ok: false, reason: "capture_fps_below_required", status: 422 };
    if (def.physical_min == null || def.physical_max == null) return { ok: false, reason: "no_physics_bounds", status: 422 };
    if (m.value < def.physical_min || m.value > def.physical_max) return { ok: false, reason: "physically_impossible", status: 422 };
  }
  return { ok: true, inApp };
}

/** Retry schedule for the database save (no silent drops; the final failure is logged for the owner). */
export const SAVE_RETRY_DELAYS_MS = [200, 600, 1500] as const;

export async function withRetries<T>(fn: () => Promise<T>, delays: readonly number[] = SAVE_RETRY_DELAYS_MS, sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))): Promise<{ ok: true; value: T; attempts: number } | { ok: false; error: string; attempts: number }> {
  let last = "unknown";
  for (let i = 0; i <= delays.length; i++) {
    try { return { ok: true, value: await fn(), attempts: i + 1 }; }
    catch (e) { last = e instanceof Error ? e.message : String(e); if (i < delays.length) await sleep(delays[i]); }
  }
  return { ok: false, error: last, attempts: delays.length + 1 };
}
