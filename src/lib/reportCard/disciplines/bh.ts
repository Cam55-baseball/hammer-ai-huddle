import type { ReportCardSpec, ReportCardTileSpec, TileState, AnalysisLike } from "../types";
import { readNumber, readBool, missingState } from "../metricReaders";

/**
 * Baseball Hitting — 8 tiles mapped to P1–P4 doctrine.
 * P1 Hip Load (NN) | P2 Hand Load | P3 Stride + Heel Plant | P4 Sequencing (NN) + Bat Path + Back Elbow + Hitter's Move (NN)
 */
const tiles: ReportCardTileSpec[] = [
  {
    key: "hip_load",
    name: "Hip Load",
    mode: "score_meter",
    standard: "≥7/10 — balanced, before hands",
    phase: "P1 Hip Load",
    nonNegotiable: true,
    explainer: {
      whatWhy:
        "Slow, controlled, balanced back-hip load BEFORE the hand load, timed to the pitcher's delivery. Bigger hip load = more swing power regardless of stride style.",
      howToImprove:
        "Mirror loads. Pause at peak hip load. Catch-play with intent on hip-then-hands timing.",
      encouragement: "Big hip load, big swing. Load it like you mean it.",
    },
    compute: (a) => {
      const m = readNumber(a, "hip_load_score_10");
      if (!m) return missingState(a, "hip_load_score_10");
      const status = m.value >= 7 ? "pass" : m.value >= 5 ? "warn" : "fail";
      return { status, score10: m.value, confidence: m.confidence };
    },
  },
  {
    key: "hand_load",
    name: "Hand Load",
    mode: "score_meter",
    standard: "≥6/10 — bat/scap loaded behind head",
    phase: "P2 Hand Load",
    explainer: {
      whatWhy:
        "Bat/scap/knob load behind the head locks the balance Phase 1 created. Style-permitted — graded when its absence causes consequences.",
      howToImprove: "Slow-tempo dry cuts. Scap pinch drills. Knob-to-back-hip checkpoint.",
      encouragement: "Quiet hands behind the head. Let the load do the work.",
    },
    compute: (a) => {
      const m = readNumber(a, "hand_load_score_10");
      if (!m) return missingState(a, "hand_load_score_10");
      const status = m.value >= 6 ? "pass" : m.value >= 4 ? "warn" : "fail";
      return { status, score10: m.value, confidence: m.confidence };
    },
  },
  {
    key: "stride_direction",
    name: "Stride Direction",
    mode: "pass_fail",
    standard: "Within 15° of square",
    phase: "P3 Stride / Landing",
    explainer: {
      whatWhy:
        "Your stride direction relative to a square line at the pitcher. Stepping out (in the bucket) or stepping in (across your body) both cost power. Within 15° of square keeps the chain efficient.",
      howToImprove: "Tape a stride line. Slow tempo tee work focused only on stride direction.",
      encouragement: "Square stride, square chance. Trust the line.",
    },
    compute: (a) => {
      const m = readNumber(a, "stride_dir_deg_off_square");
      if (!m) return missingState(a, "stride_dir_deg_off_square");
      return { status: Math.abs(m.value) <= 15 ? "pass" : "fail", confidence: m.confidence };
    },
  },
  {
    key: "heel_plant",
    name: "Heel Plant / Landing",
    mode: "score_meter",
    standard: "≥6/10 — sideways, square, both feet down",
    phase: "P3 Stride / Landing",
    explainer: {
      whatWhy:
        "Land SIDEWAYS, chest+shoulders square to plate, both feet down, core max-tensioned. Hips do NOT turn shoulders.",
      howToImprove: "Heel-plant pause drills. Mirror landings. Slow-mo side-view review.",
      encouragement: "Land it square. Hips stay loaded. Then explode.",
    },
    compute: (a) => {
      const m = readNumber(a, "heel_plant_score_10");
      if (!m) return missingState(a, "heel_plant_score_10");
      const status = m.value >= 6 ? "pass" : m.value >= 4 ? "warn" : "fail";
      return { status, score10: m.value, confidence: m.confidence };
    },
  },
  {
    key: "sequencing",
    name: "Sequencing",
    mode: "pass_fail",
    standard: "Legs → Hands → Pause → Stride → Pause → Contact",
    phase: "P4 Hitter's Move",
    nonNegotiable: true,
    explainer: {
      whatWhy:
        "Load legs → Load hands → Pause → Step/Stride → Pause → Get to contact. Out-of-order or rushed sequences collapse timing.",
      howToImprove: "Pause-pause tee rounds. Front-toss with sequence call-outs.",
      encouragement: "Two pauses, one swing. Slow is smooth, smooth is fast.",
    },
    compute: (a) => {
      const m = readBool(a, "sequencing_ok");
      if (!m) return missingState(a, "sequencing_ok");
      return { status: m.value ? "pass" : "fail", confidence: m.confidence };
    },
  },
  {
    key: "bat_path",
    name: "Bat Path In/Out of Zone",
    mode: "score_meter",
    standard: "Enters behind ball, exits in front",
    phase: "P4 Hitter's Move",
    explainer: {
      whatWhy:
        "Elite bat path enters the zone behind the ball and exits in front of it — a long, on-plane window that maximizes contact and damage.",
      howToImprove: "Tee work behind/under/in-front-of the ball. PVC plane constraint drills.",
      encouragement: "Long path through the zone — short path to the ball. Stay in it.",
    },
    compute: (a) => {
      const m = readNumber(a, "bat_path_score_10");
      if (!m) return missingState(a, "bat_path_score_10");
      const status = m.value >= 6 ? "pass" : m.value >= 4 ? "warn" : "fail";
      return { status, score10: m.value, confidence: m.confidence };
    },
  },
  {
    key: "back_elbow_contact",
    name: "Back Elbow at Contact",
    mode: "raw_passed",
    standard: "Past belly button, shoulders square",
    phase: "P4 Hitter's Move",
    explainer: {
      whatWhy:
        "Back elbow drives past the belly button while the chest stays square to the pitcher as long as possible. This unlocks rotational extension after contact and keeps your barrel in the zone longer.",
      howToImprove: "Catch-the-ball drills with both hands. Knob-to-back-hip then meet-the-ball.",
      encouragement: "Both hands to the ball, both hands through it. Stay square — let the elbow run.",
    },
    compute: (a) => {
      const m = readNumber(a, "back_elbow_past_bb_deg");
      if (!m) return missingState(a, "back_elbow_past_bb_deg");
      return { status: m.value >= 0 ? "pass" : "fail", value: `${Math.round(m.value)}°`, confidence: m.confidence };
    },
  },
  {
    key: "hitters_move",
    name: "Hitter's Move Quality",
    mode: "score_meter",
    standard: "≥7/10 — hands back, elbow leads",
    phase: "P4 Hitter's Move",
    nonNegotiable: true,
    explainer: {
      whatWhy:
        "Hands stay back, elbow leads, no casting/early barrel flip, chest stays square, both hands to and through the ball. This is the most important phase.",
      howToImprove: "Pause-at-launch tees. Front-arm post drills. Catch-the-ball-with-both-hands cue.",
      encouragement: "Trust the load. Let the elbow run. Stay square as long as you can.",
    },
    compute: (a) => {
      const m = readNumber(a, "hitters_move_score_10");
      if (!m) return missingState(a, "hitters_move_score_10");
      const status = m.value >= 7 ? "pass" : m.value >= 5 ? "warn" : "fail";
      return { status, score10: m.value, confidence: m.confidence };
    },
  },
];

export const bhReportCard: ReportCardSpec = {
  disciplineLabel: "Baseball Hitting",
  groupByPhase: true,
  tiles,
};
