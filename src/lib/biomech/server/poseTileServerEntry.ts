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

export type Verdict = "pass" | "fail" | null;
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
    hands_stay_up_at_plant: v(card.hands_stay_up_at_plant),
  };
  return { engine_version: HITTING_CARD_TILES_VERSION, verdicts, pose, card, owner };
}
