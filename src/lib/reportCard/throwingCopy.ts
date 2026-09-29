import type { ReportCardTileSpec } from "./types";

/** Sport-specific language over one shared throwing measurement and gate. */
const COPY: Record<string, { baseball: [string, string, string]; softball: [string, string, string] }> = {
  tempo: {
    baseball: ["Move from your gather to the front-foot landing without rushing.", "The gather and landing show how your throw comes together. This is an observation, not a grade.", "Gather, then move into a settled front-foot landing before you throw."],
    softball: ["Carry your gather into the front-foot landing on your softball throw.", "The move into landing matters whether you gather with a shuffle or crow hop.", "Gather smoothly and land ready to make the throw."],
  },
  energy_angle: {
    baseball: ["This check applies only to a sideways shuffle.", "A crow hop or walk-through is a different move; an angle from a sideways shuffle cannot judge it.", "Stay sideways through your shuffle and land toward your throwing target."],
    softball: ["This check is for a sideways softball shuffle only.", "A forward crow hop or walk-through does not share the same loading position.", "Stay sideways in the shuffle, then land toward your throwing target."],
  },
  shoulder_opening: {
    baseball: ["Keep your shoulders back until your front foot lands.", "Opening the upper body ahead of the landing can break the order of your throw.", "Let the front foot land before the throwing shoulder comes through."],
    softball: ["Hold your shoulders through the softball throw until landing.", "Your throwing side needs room to come through after the front side settles.", "Land first, then let the throwing shoulder follow."],
  },
  head_stability: {
    baseball: ["Keep your head steady through the throw.", "Your head moving off line can make the throwing target harder to hold.", "Keep your eyes on the target as you move into release."],
    softball: ["Keep your eyes steady on your softball throwing target.", "A quiet head helps you stay on line as your arm comes through.", "Hold your eyes toward your teammate through the throw."],
  },
};

export function throwingFacingTile(tile: ReportCardTileSpec, sport: string): ReportCardTileSpec {
  const entry = COPY[tile.key];
  if (!entry) return tile;
  const [standard, whatWhy, howToImprove] = sport === "softball" ? entry.softball : entry.baseball;
  return { ...tile, standard, thresholdChip: undefined, explainer: { whatWhy, howToImprove, encouragement: howToImprove } };
}