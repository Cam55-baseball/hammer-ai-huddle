/**
 * Phase 0 — Determinism Foundation
 *
 * Single source of truth for every version string that participates in the
 * deterministic cache fingerprint. Bumping any of these constants invalidates
 * the cache for that layer and only that layer.
 *
 * Contract (per Implementation Authorization):
 *   cache_fingerprint = SHA256(
 *     video_sha256_hex || ":" ||
 *     LANDMARK_MODEL_VERSION || ":" ||
 *     DETECTOR_VERSION || ":" ||
 *     METRIC_ENGINE_VERSION || ":" ||
 *     fps_true || ":" ||
 *     landing_time_sec_or_null || ":" ||
 *     direction_sign || ":" ||
 *     calibration_h_px
 *   )
 *
 * Prompt text, athlete-context, and AI model id are EXCLUDED from this
 * fingerprint by constitutional rule. They live on video_coaching_runs.
 */

export const LANDMARK_MODEL_ID = "blazepose_full" as const;
export const LANDMARK_MODEL_VERSION = "blazepose_full@0.0.0-stub" as const;
export const DETECTOR_VERSION = "events@0.0.0-stub" as const;
export const METRIC_ENGINE_VERSION = "metrics@0.0.0-stub" as const;
