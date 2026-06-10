import type { DisciplineContract } from "./shared";

/**
 * Baseball Hitting — 8 tile metric contract mapped to the existing
 * P1–P4 hitting doctrine (see supabase/functions/_shared/hittingPhases.ts).
 *
 * Phase | Tile                       | NN
 * ------|----------------------------|----
 * P1    | Hip Load Quality           | yes
 * P2    | Hand Load Position         | no
 * P3    | Stride Direction           | no
 * P3    | Heel Plant / Landing       | no
 * P4    | Sequencing                 | yes
 * P4    | Bat Path In/Out of Zone    | no
 * P4    | Back Elbow at Contact      | no
 * P4    | Hitter's Move Quality      | yes
 */
export const bhContract: DisciplineContract = {
  id: "bh",
  label: "Baseball Hitting",
  metrics: [
    {
      key: "hip_load_score_10",
      tileKey: "hip_load",
      label: "P1 Hip Load Quality (1-10)",
      kind: "number",
      unit: "score",
      range: [0, 10],
      prompt:
        "Score 1–10 for the back-hip load: balanced, controlled, BEFORE the hand load, " +
        "timed to the pitcher's delivery, no head drift toward pitcher, weight stays back. >=7 passes.",
    },
    {
      key: "hand_load_score_10",
      tileKey: "hand_load",
      label: "P2 Hand Load Position (1-10)",
      kind: "number",
      unit: "score",
      range: [0, 10],
      prompt:
        "Score 1–10 for the bat/scap/knob load behind the head AFTER the hip load. >=6 passes.",
    },
    {
      key: "stride_dir_deg_off_square",
      tileKey: "stride_direction",
      label: "Stride direction degrees off square to pitcher",
      kind: "number",
      unit: "degrees",
      range: [-45, 45],
      prompt:
        "Degrees the stride deviates from a square line to the pitcher. Positive = stepping out (bucket). " +
        "Negative = stepping in (across body). Absolute value <=15° passes.",
    },
    {
      key: "heel_plant_score_10",
      tileKey: "heel_plant",
      label: "P3 Heel Plant / Landing Quality (1-10)",
      kind: "number",
      unit: "score",
      range: [0, 10],
      prompt:
        "Score 1–10 for landing sideways, chest+shoulders square to plate, both feet down, " +
        "core max-tensioned, hips NOT turning shoulders. >=6 passes.",
    },
    {
      key: "sequencing_ok",
      tileKey: "sequencing",
      label: "Sequencing legal: Legs → Hands → Pause → Stride → Pause → Contact",
      kind: "boolean",
      prompt:
        "TRUE if the hitter's sequence is legal: Load legs → Load hands → Pause → Step/Stride → Pause → Get to contact. " +
        "FALSE if rushed, out of order, or pauses skipped.",
    },
    {
      key: "bat_path_score_10",
      tileKey: "bat_path",
      label: "Bat Path In/Out of Zone (1-10)",
      kind: "number",
      unit: "score",
      range: [0, 10],
      prompt:
        "Score 1–10 for elite bat path: enters the zone behind the ball, exits in front, long on-plane window. >=6 passes.",
    },
    {
      key: "back_elbow_past_bb_deg",
      tileKey: "back_elbow_contact",
      label: "Back elbow past belly button at contact (degrees)",
      kind: "number",
      unit: "degrees",
      range: [-45, 60],
      prompt:
        "Degrees the back elbow has driven PAST the belly button at contact, with shoulders square as long as possible. " +
        ">=0 passes (elbow at or past belly button).",
    },
    {
      key: "hitters_move_score_10",
      tileKey: "hitters_move",
      label: "P4 Hitter's Move Quality (1-10)",
      kind: "number",
      unit: "score",
      range: [0, 10],
      prompt:
        "Score 1–10 for the hitter's move: hands stay back, elbow leads, no casting/early barrel flip, " +
        "chest stays square, both hands to and through the ball. >=7 passes (P4 is the most important phase).",
    },
  ],
};
