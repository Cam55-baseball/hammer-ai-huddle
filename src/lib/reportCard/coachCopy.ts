import type { ReportCardTileSpec } from "./types";

/** Display language only. The measured tile and its stored diagnostic values are unchanged. */
const HITTING: Record<string, [string, string, string]> = {
  hip_load: ["Balance on the back leg while you load.", "Your back side needs to stay balanced through the load. If it gives way early, the head and hips can drift toward the pitcher before you turn.", "Load into the back hip and hold your balance as you stride. Your back heel is allowed to rise as the hips turn."],
  hand_load: ["Set your hands behind your head as you load.", "Hands set behind your head give the back elbow room to lead. Hand depth alone is not a grade.", "Set your hands behind your head and keep the grip together before you stride."],
  p2_timing: ["Finish setting your hands before the pitch is on its way.", "Being set early is fine. Still moving your hands as the pitch arrives makes the stride rushed.", "Get set while the pitcher prepares to deliver, then stay quiet until you move."],
  eyes_tracking: ["Keep your head with your body through the stride.", "If your head gets out ahead of your body, your back side may have released the load too early. That makes the pitch harder to see and time.", "Hold your balance over the back leg and let your head travel with your turn, not ahead of it."],
  stride_direction: ["Stride toward the pitcher.", "A straight stride gives your hips room to turn without pulling you off line.", "Land your front foot toward the pitcher and let the hips turn around a stable landing."],
  heel_plant: ["Let your front heel settle when you land.", "Your front heel touching down gives you a stable front side, clears a path for your back elbow and helps keep your eyes steady. Your back heel can rise normally.", "Let the front heel settle on the ground as you land; do not force the back heel down."],
  p3_timing: ["Get your front foot down as the pitch comes out.", "Landing on time lets you keep seeing the pitch before you turn. Rushing forward early is not the answer.", "Start your load in time to land without lunging."],
  hands_outside_shoulders_at_landing: ["Keep your hands behind the back shoulder at landing.", "Hands with room outside the back shoulder give your back elbow a path into the turn.", "Pause at landing and check that your hands have room to stay back."],
  sequencing: ["Let the hips lead the turn.", "Your hips should start the move, followed by your torso, front shoulder and lead arm. When the shoulders jump ahead, power gets lost.", "Pause at landing, turn the hips first and let the upper body follow."],
  back_elbow_contact: ["Let the back elbow gain ground while the hands stay back.", "The elbow's path toward fair territory matters more than a fixed arm angle. Hands staying back create room for the elbow to lead.", "From a quiet landing, let the elbow move forward while the hands stay with the shoulder."],
  hitters_move: ["Stay loaded, land, then let the hips and back elbow lead.", "The move works when your balance, hands, stride, landing and turn hold together. A single good piece cannot make up for a broken sequence.", "Practice the full move slowly, then bring the same order into a swing."],
  shoulder_plane_steadiness: ["Hold your shoulder plane through the turn.", "A steady shoulder plane gives the barrel a better path. This is a continuous observation, not a pass-or-fail judgment.", "Turn while keeping the shoulders on the plane they started on."],
  finish_balance: ["Finish balanced after the turn.", "Staying on your line through the finish is a useful check on the move before it. The pose at the end alone does not prove contact quality.", "Swing through and notice whether you can finish without falling away."],
  shoulder_to_shoulder_hold: ["Keep your hands back while the elbow leads.", "Holding the hands behind the back shoulder leaves room for the elbow to lead. If the front shoulder opens early, that space is lost.", "Pause at landing and keep the hands quiet while the back elbow starts forward."],
};

const SOFTBALL_HITTING: Partial<Record<string, [string, string, string]>> = {
  p2_timing: ["Set your hands before the softball pitcher releases.", "The underhand delivery can bring the ball in quickly. Your hands should be set before release; being ready early is fine.", "Watch the pitching arm and finish your load before the ball leaves the hand."],
  p3_timing: ["Get your front foot down as the softball pitch is released.", "A settled front foot lets you keep watching the pitch and turn without lunging. The pitcher's leg lift is not your timing cue here.", "Work from a live underhand toss and land in time to see the ball before your turn."],
  stride_direction: ["Stride toward the softball pitcher.", "On the shorter softball field, striding toward the circle keeps your body on line and gives the hips room to turn.", "Land toward the pitching circle and let your hips turn around your front side."],
  heel_plant: ["Settle your front heel at landing.", "A grounded front heel gives your back elbow room to come through and keeps your eyes quiet on the softball pitch. The back heel may rise as you turn.", "Land toward the circle and let the front heel settle; don't pin your back heel down."],
};

export function coachFacingTile(tile: ReportCardTileSpec, sport: string): ReportCardTileSpec {
  const copy = sport === "softball" ? SOFTBALL_HITTING[tile.key] ?? HITTING[tile.key] : HITTING[tile.key];
  if (!copy) return tile;
  const [standard, whatWhy, howToImprove] = copy;
  return { ...tile, standard, thresholdChip: undefined,
    explainer: { whatWhy, howToImprove, encouragement: howToImprove } };
}