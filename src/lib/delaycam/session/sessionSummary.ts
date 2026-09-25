/**
 * Analyze Session — pure summary builder.
 *
 * Loops over the metric registry (not over whatever produced values), so every
 * metric the session could have shown gets a row: a value, or a plain reason.
 * Deterministic: same reps in -> same summary out.
 */
import type { FrameDensityTier } from "@/lib/biomech/pose/denseLandmarkCapture";
import type { MissingnessReason } from "@/lib/biomech/metrics/missingness";
import { metricsFor, TIER_MIN_FPS, tierMeets, type ReleaseStatus, type RepMetricValue } from "./metricRegistry";
import { SPLITTER_STATUS, type SessionModule, type UncertainWindow } from "./repSplitter";

export const SUMMARY_VERSION = "delaycam-summary@1.0.0";

export interface SummaryRep {
  rep_index: number;
  start_ms: number;
  end_ms: number;
  metrics: Record<string, RepMetricValue>;
}

export interface SummaryMetricRow {
  key: string;
  label: string;
  unit: string;
  release: ReleaseStatus;
  release_note: string | null;
  status: "measured" | "missing" | "not_released";
  n: number;
  median: number | null;
  min: number | null;
  max: number | null;
  sd: number | null;
  per_rep: (number | null)[];
  missing_by_reason: Partial<Record<MissingnessReason, number>>;
  missing_detail: string | null;
}

export interface SessionSummary {
  version: string;
  module: SessionModule;
  sport: "baseball" | "softball";
  duration_sec: number | null;
  fps: number | null;
  fps_tier: FrameDensityTier;
  tracking_coverage: number;
  rep_detection: {
    state: "confident" | "partial" | "uncertain";
    reason: MissingnessReason | null;
    release: typeof SPLITTER_STATUS;
    confident_reps: number;
    uncertain_windows: number;
    uncertain: UncertainWindow[];
  };
  reps: { rep_index: number; start_ms: number; end_ms: number }[];
  metrics: SummaryMetricRow[];
}

const r3 = (n: number) => Math.round(n * 1000) / 1000;

export function buildSessionSummary(args: {
  module: SessionModule;
  sport: "baseball" | "softball";
  duration_sec: number | null;
  fps: number | null;
  fps_tier: FrameDensityTier;
  coverage: number;
  detection_state: "confident" | "partial" | "uncertain";
  detection_reason: MissingnessReason | null;
  uncertain: readonly UncertainWindow[];
  reps: readonly SummaryRep[];
}): SessionSummary {
  const rows: SummaryMetricRow[] = metricsFor(args.module, args.sport).map((def) => {
    const base = {
      key: def.key,
      label: def.label,
      unit: def.unit,
      release: def.release,
      release_note: def.releaseNote ?? null,
    };
    if (def.release === "not_released" || !def.compute) {
      return { ...base, status: "not_released" as const, n: 0, median: null, min: null, max: null, sd: null, per_rep: [], missing_by_reason: {}, missing_detail: null };
    }
    const per: (number | null)[] = [];
    const miss: Partial<Record<MissingnessReason, number>> = {};
    let detail: string | null = null;
    for (const rep of args.reps) {
      const v = rep.metrics[def.key];
      if (v && "value" in v) per.push(v.value);
      else {
        per.push(null);
        if (v && "missing" in v) {
          miss[v.missing_reason] = (miss[v.missing_reason] ?? 0) + 1;
          detail = detail ?? v.detail ?? null;
        }
      }
    }
    if (!tierMeets(args.fps_tier, def.minTier) && !detail) {
      detail = `needs ${TIER_MIN_FPS[def.minTier]}fps, this session was ${args.fps ? Math.round(args.fps) : "unknown"}fps`;
    }
    const vals = per.filter((x): x is number => x != null).sort((a, b) => a - b);
    const n = vals.length;
    if (n === 0) {
      return { ...base, status: "missing" as const, n, median: null, min: null, max: null, sd: null, per_rep: per, missing_by_reason: miss, missing_detail: detail };
    }
    const mean = vals.reduce((s, x) => s + x, 0) / n;
    const median = n % 2 ? vals[(n - 1) / 2] : (vals[n / 2 - 1] + vals[n / 2]) / 2;
    const sd = n > 1 ? Math.sqrt(vals.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1)) : null;
    return {
      ...base,
      status: "measured" as const,
      n,
      median: r3(median),
      min: r3(vals[0]),
      max: r3(vals[n - 1]),
      sd: sd == null ? null : r3(sd),
      per_rep: per,
      missing_by_reason: miss,
      missing_detail: detail,
    };
  });

  return {
    version: SUMMARY_VERSION,
    module: args.module,
    sport: args.sport,
    duration_sec: args.duration_sec,
    fps: args.fps,
    fps_tier: args.fps_tier,
    tracking_coverage: args.coverage,
    rep_detection: {
      state: args.detection_state,
      reason: args.detection_reason,
      release: SPLITTER_STATUS,
      confident_reps: args.reps.length,
      uncertain_windows: args.uncertain.length,
      uncertain: [...args.uncertain],
    },
    reps: args.reps.map((r) => ({ rep_index: r.rep_index, start_ms: r.start_ms, end_ms: r.end_ms })),
    metrics: rows,
  };
}

/** Plain-language copy for canonical missingness reasons. */
export const REASON_COPY: Record<string, string> = {
  pose_not_detected: "We couldn't find you in the video.",
  out_of_frame: "You were out of the picture.",
  landmark_occluded: "Part of your body was blocked from view.",
  anchor_not_detected: "We couldn't find the moment this is measured from.",
  insufficient_temporal_resolution: "The camera wasn't fast enough for this.",
  pitcher_release_frame_missing: "We can't find the release moment yet — that detector isn't built.",
  peak_leg_lift_missing: "We couldn't find the top of your leg lift.",
  front_foot_first_contact_missing: "We couldn't find when your front foot landed.",
  front_foot_full_plant_missing: "We couldn't find when your front foot planted.",
  pose_model_is_stub: "Body tracking isn't available for this yet.",
  calibration_unavailable: "Needs a way to measure real distance, which doesn't exist yet.",
};
