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
  // Injury-prevention markers. "Research links…" framing; never a diagnosis. Softball wording is its own text.
  arm_late_at_foot_strike: {
    baseball: ["Have your throwing hand up and above your elbow when your front foot lands.", "A study of young baseball throwers found that having the arm up in throwing position at landing went with less stress on the elbow and shoulder (Davis and colleagues). The evidence is moderate.", "Start your arm back early so it is up and ready as your front foot lands."],
    softball: ["Have your throwing hand up above your elbow when your front foot lands on your softball throw.", "Research on overhand throwers links an arm that is up and ready at landing with less elbow and shoulder stress. It comes from baseball studies, so treat it as a strong guide rather than proof for softball.", "Get the ball up early so your arm is ready when your front foot lands."],
  },
  trunk_lateral_tilt_at_release: {
    baseball: ["Stay tall — don't lean hard to your glove side as you let go.", "Two studies found that a big lean to the glove side went with more force on the elbow and shoulder, even though it can add speed (Oyama and colleagues; Solomito and colleagues). The evidence is moderate.", "Keep your head close to over your front foot as you throw."],
    softball: ["Stay tall through your softball throw instead of leaning to your glove side.", "Baseball research links a big glove-side lean with more elbow and shoulder force. Softball throws were not studied directly.", "Keep your head stacked over your front foot as you release."],
  },
  across_body_stride: {
    baseball: ["Step toward your target, not across your body.", "Stepping across your body makes the arm work harder to get the ball to the target. Research support is limited.", "Aim your front foot at your target on every throw."],
    softball: ["Step at your teammate, not across your body.", "A step across your body asks more of your arm. Research support is limited.", "Point your front foot at your target when you step."],
  },
  elbow_height_at_foot_strike: {
    baseball: ["Keep your elbow about level with your shoulders when you land.", "Lab and computer-model studies suggest a dropped or very high elbow adds elbow stress. The evidence is limited, so we show this without a grade.", "Let your elbow ride about shoulder height as you land."],
    softball: ["Keep your elbow near shoulder height when you land on your softball throw.", "Studies suggest a dropped elbow adds stress; the evidence is limited and comes from baseball, so there is no grade.", "Keep your elbow up near your shoulder line."],
  },
  elbow_height_at_release: {
    baseball: ["Keep your elbow up near your shoulder line as you let go.", "A dropped elbow at release is linked with more elbow stress in limited research. Shown without a grade.", "Stay tall and let your elbow stay up as your arm comes through."],
    softball: ["Keep your elbow up near your shoulders at release on your softball throw.", "Limited baseball research links a dropped elbow with more stress. Shown without a grade.", "Let the arm come through with the elbow up."],
  },
  front_knee_after_landing: {
    baseball: ["Let your front leg firm up after landing instead of sinking.", "A front leg that keeps bending may leave the arm to do more of the work. This link is weak in the research, so there is no grade.", "Land, then push into a firm front leg as you throw."],
    softball: ["Firm up your front leg after landing on your softball throw.", "A leg that keeps sinking may leave more work for the arm. The research is weak, so there is no grade.", "Land and brace your front leg as your arm comes through."],
  },
  arm_outside_body_frame: {
    baseball: ["Keep your arm from swinging wide behind your back.", "An arm that swings far behind the body is thought to load the front of the shoulder. The research is weak.", "Keep your arm path short and close to your body."],
    softball: ["Keep your arm from swinging wide behind you on your softball throw.", "An arm that swings far behind the body is thought to load the shoulder. The research is weak.", "Keep a short, compact arm path."],
  },
  deceleration_follow_through: {
    baseball: ["Let your arm finish all the way across your body.", "The shoulder works hardest to slow the arm after the ball is gone. We can't measure that force from a phone, so this is only what we saw. If your shoulder hurts after throwing, see a qualified professional rather than trying to fix it yourself.", "Let the arm keep going across and down after you let go."],
    softball: ["Let your arm finish across your body on your softball throw.", "Your shoulder works hard to slow the arm after the ball leaves. This is only what we saw. If your shoulder hurts after throwing, see a qualified professional.", "Let the arm keep travelling after the release."],
  },
};

export function throwingFacingTile(tile: ReportCardTileSpec, sport: string): ReportCardTileSpec {
  const entry = COPY[tile.key];
  if (!entry) return tile;
  const [standard, whatWhy, howToImprove] = sport === "softball" ? entry.softball : entry.baseball;
  return { ...tile, standard, thresholdChip: undefined, explainer: { whatWhy, howToImprove, encouragement: howToImprove } };
}