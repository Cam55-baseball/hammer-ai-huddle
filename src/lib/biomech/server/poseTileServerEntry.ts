/**
 * Server entry for the hitting pose tiles. Bundled (scripts/build-pose-tile-bundle.sh)
 * into supabase/functions/_shared/poseTiles.bundle.js so the edge runtime runs the
 * exact same code as the tests — one implementation, never a hand port.
 * Input is the stored landmark series text; output is tile results + verdicts.
 */
import { decodeLandmarkSeriesText } from "../pose/landmarkSeriesFormat";
import { runHittingPoseTiles } from "../metrics/hittingPoseTiles";
import { runHittingCardTiles, HITTING_CARD_TILES_VERSION } from "../metrics/hittingCardTiles";
import { runHittingOwnerTiles } from "../metrics/hittingOwnerTiles";
import type { Handedness } from "../side/strideSide";
import { evaluateMovementGate } from "../gates/movementGate";
import { runThrowingTiles } from "../metrics/throwingTiles";
import { runPitchingTiles } from "../metrics/pitchingTiles";
import { runPitchingCardTiles } from "../metrics/pitchingCardTiles";
import { runSoftballPitchingTiles } from "../metrics/softballPitchingTiles";

export type Verdict = "pass" | "fail" | null;
export function checkStoredLandmarkMovement(ndjson: string) {
  return evaluateMovementGate(decodeLandmarkSeriesText(ndjson));
}
export function runHittingTilesFromText(ndjson: string, side: Handedness | null, athleteHeightIn: number | null) {
  const s = decodeLandmarkSeriesText(ndjson);
  const pose = runHittingPoseTiles(s, { side });
  const card = runHittingCardTiles(s, { side });
  const owner = runHittingOwnerTiles(s, { side, athlete_height_in: athleteHeightIn });
  const v = (x: { verdict: string | null } | null | undefined): Verdict => (x?.verdict === "fail" ? "fail" : x?.verdict == null ? null : "pass");
  const verdicts: Record<string, Verdict> = {
    hip_load: v(pose.hip_load), head_discipline: v(pose.head_discipline),
    head_path_through_stride: v(owner.tile19), back_hip_socket_hold: v(owner.tile20),
    post_landing_hip_drift: v(card.post_landing_hip_drift), back_knee_flex_maintained: v(card.back_knee_flex_maintained),
    back_heel_early_rise: v(card.back_heel_early_rise),
    hands_stay_up_at_plant: v(card.hands_stay_up_at_plant),
  };
  return { engine_version: HITTING_CARD_TILES_VERSION, verdicts, pose, card, owner };
}

/** Throwing card (baseball + softball, one implementation). Stored as ai_analysis.throwing_tiles_deterministic. */
export function runThrowingTilesFromText(ndjson: string, side: Handedness | null) {
  return runThrowingTiles(decodeLandmarkSeriesText(ndjson), side);
}
/** Baseball pitching: the four rebuilt tiles + the eleven card tiles. Any arm slot. */
export function runPitchingFromText(ndjson: string, side: Handedness | null, athleteHeightIn: number | null) {
  const s = decodeLandmarkSeriesText(ndjson);
  return { tiles: runPitchingTiles(s, { throwing_side: side }), card: runPitchingCardTiles(s, { throwing_side: side, athlete_height_in: athleteHeightIn }) };
}

/** Softball windmill card (unvalidated). Stored as ai_analysis.softball_pitching_tiles_deterministic
 * so separation starts recording into the athlete ledger (owner ruling 2026-09-30). */
export function runSoftballPitchingFromText(ndjson: string, side: Handedness | null, pitchType: string | null) {
  return runSoftballPitchingTiles(decodeLandmarkSeriesText(ndjson), { throwing_side: side, pitch_type: pitchType });
}
