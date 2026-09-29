import type { ReportCardTileSpec } from "./types";

/** Sport-specific language over one shared throwing measurement and gate. */
const COPY: Record<string, { baseball: string[]; softball: string[] }> = {
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
  // Injury-prevention FLAGS: no citations, no numbers, never a diagnosis; every flag ends with a review recommendation.
  trunk_rotation_before_foot_contact: {
    baseball: ["Shoulders wait until the front foot lands.", "Research on throwing mechanics links shoulders that start turning before the front foot lands to more stress on the elbow. This is a flag, not a grade, and it says nothing about whether your arm is hurt. Worth showing this to your coach or a qualified throwing or medical professional.", "Let the front foot land first, then let the shoulders turn.", "Your shoulders started turning before your front foot landed. Research on throwing mechanics links that timing to more stress on the elbow. Worth showing this to your coach or a qualified throwing or medical professional."],
    softball: ["Shoulders hold until your front foot lands on your softball throw.", "Research on overhand throwing links shoulders that turn before the front foot lands to more stress on the elbow. This is a flag, not a grade, and it says nothing about whether your arm is hurt. Worth showing this to your coach or a qualified throwing or medical professional.", "Land with your front foot first, then turn your shoulders to your teammate.", "Your shoulders started turning before your front foot landed. Research on overhand throwing links that timing to more stress on the elbow. Worth showing this to your coach or a qualified throwing or medical professional."],
  },
  shoulder_abduction_at_foot_contact: {
    baseball: ["Throwing elbow near shoulder height when your front foot lands.", "Research on throwing mechanics links an upper arm held well above or well below shoulder height at landing to more stress on the elbow. This is a flag, not a grade. Worth showing this to your coach or a qualified throwing or medical professional.", "Let the arm lift so the elbow sits about level with your shoulders as you land.", "Your throwing arm was well away from shoulder height when your front foot landed. Research links that position to more stress on the elbow. Worth showing this to your coach or a qualified throwing or medical professional."],
    softball: ["Throwing elbow near shoulder height as your front foot lands on your softball throw.", "Research on overhand throwing links an upper arm well above or well below shoulder height at landing to more elbow stress. This is a flag, not a grade. Worth showing this to your coach or a qualified throwing or medical professional.", "Bring the elbow up about level with your shoulders as you land.", "Your throwing arm was well away from shoulder height when your front foot landed. Research links that position to more stress on the elbow. Worth showing this to your coach or a qualified throwing or medical professional."],
  },
  elbow_flexion_at_foot_contact: {
    baseball: ["Throwing elbow clearly bent when your front foot lands.", "Research on throwing mechanics links a straighter throwing elbow at landing to more stress on the elbow. This is a flag, not a grade. Worth showing this to your coach or a qualified throwing or medical professional.", "Keep a good bend in the throwing elbow as the arm comes up.", "Your throwing elbow was fairly straight when your front foot landed. Research links that to more stress on the elbow. Worth showing this to your coach or a qualified throwing or medical professional."],
    softball: ["Throwing elbow clearly bent as your front foot lands on your softball throw.", "Research on overhand throwing links a straighter throwing elbow at landing to more elbow stress. This is a flag, not a grade. Worth showing this to your coach or a qualified throwing or medical professional.", "Keep the elbow bent as the ball comes up.", "Your throwing elbow was fairly straight when your front foot landed. Research links that to more stress on the elbow. Worth showing this to your coach or a qualified throwing or medical professional."],
  },
  horizontal_abduction_at_foot_contact: {
    baseball: ["Throwing arm does not drag far behind your body at landing.", "Research links an arm pulled far behind the body at landing to more stress on the front of the shoulder and the elbow. This needs a camera behind you, so it is not checked from the side. Worth showing this to your coach or a qualified throwing or medical professional.", "Keep the arm path close to your body.", "Your throwing arm was pulled far behind your body at landing. Research links that to more shoulder and elbow stress. Worth showing this to your coach or a qualified throwing or medical professional."],
    softball: ["Throwing arm does not drag far behind you at landing on your softball throw.", "Research links an arm pulled far behind the body to more shoulder and elbow stress. This needs a camera behind you. Worth showing this to your coach or a qualified throwing or medical professional.", "Keep a short arm path close to your body.", "Your throwing arm was pulled far behind your body at landing. Research links that to more shoulder and elbow stress. Worth showing this to your coach or a qualified throwing or medical professional."],
  },
  stride_foot_direction: {
    baseball: ["Front foot lands in line and points at your target.", "Research links a front foot that lands across the body or turned far in to more stress through the shoulder and elbow. This needs a camera behind or in front of you. Worth showing this to your coach or a qualified throwing or medical professional.", "Step straight at your target and land with the foot pointing there.", "Your front foot landed across your body or turned in. Research links that to more shoulder and elbow stress. Worth showing this to your coach or a qualified throwing or medical professional."],
    softball: ["Front foot lands in line and points at your teammate.", "Research links a front foot that lands across the body or turned far in to more shoulder and elbow stress. This needs a camera behind or in front of you. Worth showing this to your coach or a qualified throwing or medical professional.", "Step straight at your teammate and point the foot there.", "Your front foot landed across your body or turned in. Research links that to more shoulder and elbow stress. Worth showing this to your coach or a qualified throwing or medical professional."],
  },
  lead_knee_flexion: {
    baseball: ["Front knee softly bent at landing, then firming up.", "Research on throwing mechanics links a front knee that keeps bending after landing, or lands very straight or very deep, to more stress on the arm. This is a flag, not a grade. Worth showing this to your coach or a qualified throwing or medical professional.", "Land with a soft knee, then firm the front leg as you throw.", "Your front knee kept bending, or landed very straight or very deep. Research links that to more stress on the arm. Worth showing this to your coach or a qualified throwing or medical professional."],
    softball: ["Front knee softly bent at landing, then firming on your softball throw.", "Research links a front knee that keeps sinking, or lands very straight or very deep, to more stress on the arm. This is a flag, not a grade. Worth showing this to your coach or a qualified throwing or medical professional.", "Land soft, then brace the front leg as the ball comes through.", "Your front knee kept bending, or landed very straight or very deep. Research links that to more stress on the arm. Worth showing this to your coach or a qualified throwing or medical professional."],
  },
  contralateral_trunk_tilt: {
    baseball: ["Upper body stays tall instead of leaning hard to the glove side.", "Research links a big lean away from the throwing arm to more stress on the elbow. This needs a camera behind or in front of you. Worth showing this to your coach or a qualified throwing or medical professional.", "Keep your head close to over your front foot as you throw.", "Your upper body leaned hard away from your throwing arm. Research links that to more stress on the elbow. Worth showing this to your coach or a qualified throwing or medical professional."],
    softball: ["Upper body stays tall on your softball throw.", "Research links a big lean away from the throwing arm to more elbow stress. This needs a camera behind or in front of you. Worth showing this to your coach or a qualified throwing or medical professional.", "Keep your head stacked over your front foot as you let go.", "Your upper body leaned hard away from your throwing arm. Research links that to more stress on the elbow. Worth showing this to your coach or a qualified throwing or medical professional."],
  },
  sidearm_arm_slot: {
    baseball: ["Arm slot \u2014 a caution, never a fault.", "Some throwers are naturally low. Research links a sidearm slot to more stress on the inside of the elbow, so we point it out rather than grade it. This needs a camera behind or in front of you. Worth showing this to your coach or a qualified throwing or medical professional.", "No change needed just because of this \u2014 talk it through with your coach.", "Your arm came through from a low, sidearm slot. That is not wrong, but research links it to more stress on the inside of the elbow. Worth showing this to your coach or a qualified throwing or medical professional."],
    softball: ["Arm slot \u2014 a caution, never a fault.", "Some throwers are naturally low. Research links a sidearm slot to more stress on the inside of the elbow, so we point it out rather than grade it. This needs a camera behind or in front of you. Worth showing this to your coach or a qualified throwing or medical professional.", "No change needed just because of this \u2014 talk it through with your coach.", "Your arm came through from a low, sidearm slot. That is not wrong, but research links it to more stress on the inside of the elbow. Worth showing this to your coach or a qualified throwing or medical professional."],
  },
  stride_length: {
    baseball: ["Stride from your final step out toward your target.", "Measured from the last step before the throw. A full stride lets your legs share the work with your arm.", "Push off the final step and land long toward your target."],
    softball: ["Stride from your final step out toward your teammate.", "Measured from the last step before the softball throw. A full stride lets your legs share the work.", "Push off the final step and land long toward your teammate."],
  },
};

export function throwingFacingTile(tile: ReportCardTileSpec, sport: string): ReportCardTileSpec {
  const entry = COPY[tile.key];
  if (!entry) return tile;
  const [standard, whatWhy, howToImprove, raisedNote] = sport === "softball" ? entry.softball : entry.baseball;
  const compute: ReportCardTileSpec["compute"] = raisedNote
    ? (a) => { const st = tile.compute(a); return st.status === "warn" ? { ...st, note: raisedNote } : st; }
    : tile.compute;
  return { ...tile, standard, thresholdChip: undefined, compute, explainer: { whatWhy, howToImprove, encouragement: howToImprove } };
}