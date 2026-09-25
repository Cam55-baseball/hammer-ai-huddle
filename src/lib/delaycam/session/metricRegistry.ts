/**
 * DelayCam session metric registry.
 *
 * Every metric a session COULD show is declared here with the frame-density
 * tier it needs, the module/sport it applies to and its release status. The
 * session summary loops over this registry, so a metric that cannot be
 * measured still gets a row with an honest reason instead of vanishing.
 *
 * Adding a detector = adding/flipping an entry. No 60fps assumption anywhere:
 * tiers come from `classifyDensityTier`, and a session that meets a higher
 * tier unlocks the metrics that need it automatically.
 */
import { MISSINGNESS_REASONS, type MissingnessReason } from "@/lib/biomech/metrics/missingness";
import type { FrameDensityTier } from "@/lib/biomech/pose/denseLandmarkCapture";
import { findPeakLegLiftFrame } from "@/lib/biomech/anchors/peakLegLift";
import { findFrontFootStrikeFrame } from "@/lib/biomech/anchors/frontFootStrike";
import { computeTempoSec } from "@/lib/biomech/metrics/tempoSec";
import { toPeakLegLiftFrames, toPlantFrames } from "@/lib/biomech/pose/toAnchorFrames";
import type { PoseFrameRow } from "@/lib/biomech/pose/poseRunner";
import type { SessionModule } from "./repSplitter";

export const TIER_ORDER: readonly FrameDensityTier[] = ["below_floor", "t_low", "t_mid", "t_high"];
export function tierMeets(have: FrameDensityTier, need: FrameDensityTier): boolean {
  return TIER_ORDER.indexOf(have) >= TIER_ORDER.indexOf(need);
}
export const TIER_MIN_FPS: Record<FrameDensityTier, number> = { below_floor: 0, t_low: 30, t_mid: 60, t_high: 120 };

export type RepMetricValue =
  | { value: number; unit: string; confidence: number }
  | { missing: true; missing_reason: MissingnessReason; detail?: string };

export interface RepContext {
  readonly rows: readonly PoseFrameRow[]; // dense per-rep frames at native fps
  readonly fps: number;
  readonly tier: FrameDensityTier;
}

export type ReleaseStatus = "released" | "staff_validation" | "not_released";

export interface SessionMetricDef {
  readonly key: string;
  readonly label: string;
  readonly unit: string;
  readonly modules: readonly SessionModule[];
  readonly sports?: readonly ("baseball" | "softball")[];
  readonly minTier: FrameDensityTier;
  readonly release: ReleaseStatus;
  /** Plain-language reason shown when release !== "released". */
  readonly releaseNote?: string;
  readonly compute?: (ctx: RepContext) => RepMetricValue;
}

function tempo(ctx: RepContext): RepMetricValue {
  // Same anchor helpers the uploaded-clip report card uses — one method, not two.
  const lift = findPeakLegLiftFrame(toPeakLegLiftFrames(ctx.rows));
  const strike = findFrontFootStrikeFrame(toPlantFrames(ctx.rows));
  const m = computeTempoSec({
    peak_leg_lift_frame_index: lift.frame_index,
    front_foot_strike_frame_index: strike.frame_index,
    fps_true: ctx.fps,
  });
  if (m.value == null) {
    return { missing: true, missing_reason: m.missingness?.missing_reason ?? MISSINGNESS_REASONS.ANCHOR_NOT_DETECTED };
  }
  return { value: m.value, unit: "s", confidence: m.confidence.value ?? 0 };
}

export const SESSION_METRICS: readonly SessionMetricDef[] = [
  {
    key: "tempo_sec",
    label: "Tempo (leg lift to foot strike)",
    unit: "s",
    modules: ["pitching"],
    sports: ["baseball"],
    minTier: "t_low",
    release: "staff_validation",
    releaseNote: "Being checked on real DelayCam sessions before athletes see it.",
    compute: tempo,
  },
  {
    key: "shoulder_tilt_deg",
    label: "Shoulder tilt at release",
    unit: "°",
    modules: ["pitching", "throwing"],
    sports: ["baseball"],
    minTier: "t_mid",
    release: "staff_validation",
    releaseNote: "Being checked on real DelayCam sessions before athletes see it.",
    // No release-frame detector exists yet, so this is always honestly missing.
    compute: () => ({ missing: true, missing_reason: MISSINGNESS_REASONS.PITCHER_RELEASE_FRAME_MISSING }),
  },
  {
    key: "stride_pct_of_height",
    label: "Stride length",
    unit: "% height",
    modules: ["pitching", "throwing"],
    minTier: "t_low",
    release: "not_released",
    releaseNote: "Needs a way to measure real distance in the video, which doesn't exist yet.",
  },
  {
    key: "ball_speed_mph",
    label: "Ball speed",
    unit: "mph",
    modules: ["pitching", "throwing"],
    minTier: "t_high",
    release: "not_released",
    releaseNote: "Needs ball tracking and a 120fps or faster camera.",
  },
  {
    key: "bat_speed_mph",
    label: "Bat speed",
    unit: "mph",
    modules: ["hitting"],
    minTier: "t_high",
    release: "not_released",
    releaseNote: "Needs bat tracking and a 120fps or faster camera.",
  },
  {
    key: "time_to_contact_ms",
    label: "Time to contact",
    unit: "ms",
    modules: ["hitting"],
    minTier: "t_high",
    release: "not_released",
    releaseNote: "Needs a contact detector and a 120fps or faster camera.",
  },
  {
    key: "hitting_mechanics",
    label: "Swing mechanics",
    unit: "",
    modules: ["hitting"],
    minTier: "t_mid",
    release: "not_released",
    releaseNote: "Hitting analysis isn't released yet — we won't estimate what we can't measure directly.",
  },
];

export function metricsFor(module: SessionModule, sport: "baseball" | "softball"): SessionMetricDef[] {
  return SESSION_METRICS.filter((m) => m.modules.includes(module) && (!m.sports || m.sports.includes(sport)));
}

/** Compute every applicable, computable metric for one rep. Tier gate first. */
export function computeRepMetrics(
  module: SessionModule,
  sport: "baseball" | "softball",
  ctx: RepContext,
): Record<string, RepMetricValue> {
  const out: Record<string, RepMetricValue> = {};
  for (const def of metricsFor(module, sport)) {
    if (!def.compute) continue;
    if (!tierMeets(ctx.tier, def.minTier)) {
      out[def.key] = {
        missing: true,
        missing_reason: MISSINGNESS_REASONS.INSUFFICIENT_TEMPORAL_RESOLUTION,
        detail: `needs ${TIER_MIN_FPS[def.minTier]}fps, rep was ${Math.round(ctx.fps)}fps`,
      };
      continue;
    }
    out[def.key] = def.compute(ctx);
  }
  return out;
}
