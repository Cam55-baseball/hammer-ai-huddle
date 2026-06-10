import type { ReportCardSpec, ReportCardTileSpec, TileState, AnalysisLike } from "../types";

function num(a: AnalysisLike, k: string): number | null {
  const m = a.metrics?.[k];
  return typeof m === "number" && Number.isFinite(m) ? m : null;
}
function bool(a: AnalysisLike, k: string): boolean | null {
  const m = a.metrics?.[k];
  return typeof m === "boolean" ? m : null;
}
const missing = (): TileState => ({ status: "missing" });

const tiles: ReportCardTileSpec[] = [
  {
    key: "stride_direction",
    name: "Stride Direction",
    mode: "pass_fail",
    standard: "Within 15° of square",
    phase: "Stride",
    explainer: {
      whatWhy:
        "Your stride direction relative to a square line at the pitcher. Stepping out (in the bucket) or stepping in (across your body) both cost power and consistency. Within 15° of square keeps the chain efficient.",
      howToImprove:
        "Tape a stride line on the ground. Slow-tempo tee work focused only on stride direction. 'Step to the pitcher' verbal cue.",
      encouragement: "Square stride, square chance. Trust the line.",
    },
    compute: (a) => {
      const v = num(a, "stride_dir_deg_off_square");
      if (v == null) return missing();
      return { status: Math.abs(v) <= 15 ? "pass" : "fail" };
    },
  },
  {
    key: "bat_path",
    name: "Bat Path In/Out of Zone",
    mode: "score_meter",
    standard: "Enters behind ball, exits in front",
    phase: "Hitter's Move",
    explainer: {
      whatWhy:
        "Elite bat path enters the zone behind the ball and exits in front of it — a long, on-plane window that maximizes contact and damage.",
      howToImprove:
        "Tee work behind/under/in-front-of the ball. Bat-path constraint drills with a PVC plane. Slow-motion video on every round.",
      encouragement: "Long path through the zone — short path to the ball. Stay in it.",
    },
    compute: (a) => {
      const v = num(a, "bat_path_score_10");
      if (v == null) return missing();
      return { status: v >= 6 ? "pass" : v >= 4 ? "warn" : "fail", score10: v };
    },
  },
  {
    key: "back_elbow_contact",
    name: "Back Elbow at Contact",
    mode: "raw_passed",
    standard: "Past belly button, shoulders square",
    phase: "Hitter's Move",
    explainer: {
      whatWhy:
        "Back elbow drives past the belly button while the chest stays square to the pitcher as long as possible. This unlocks rotational extension after contact and keeps your barrel in the zone longer.",
      howToImprove:
        "Catch-the-ball drills with both hands. Knob-to-back-hip then 'meet the ball' progression. Front-arm post drills against a wall.",
      encouragement: "Both hands to the ball, both hands through it. Stay square — let the elbow run.",
    },
    compute: (a) => {
      const v = num(a, "back_elbow_past_bb_deg");
      if (v == null) return missing();
      return { status: v >= 0 ? "pass" : "fail", value: `${Math.round(v)}°` };
    },
  },
  {
    key: "sequencing",
    name: "Sequencing",
    mode: "pass_fail",
    standard: "Legs → Hands → Pause → Stride → Pause → Contact",
    phase: "Hitter's Move",
    explainer: {
      whatWhy:
        "Hitter's Move sequence: Load legs → Load hands → Pause → Step/Stride → Pause → Get to contact. Out-of-order or rushed sequences collapse timing and surrender the at-bat.",
      howToImprove:
        "Pause-pause tee rounds. Front-toss with a coach calling out the sequence stops. Mirror dry-cuts focused on the two pauses.",
      encouragement: "Two pauses, one swing. Slow is smooth, smooth is fast.",
    },
    compute: (a) => {
      const ok = bool(a, "sequencing_ok");
      if (ok == null) return missing();
      return { status: ok ? "pass" : "fail" };
    },
  },
];

export const bhReportCard: ReportCardSpec = {
  disciplineLabel: "Baseball Hitting",
  groupByPhase: true,
  tiles,
};
