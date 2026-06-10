/**
 * Server mirror of `src/lib/reportCard/contracts/*`.
 * Kept additive and identical in shape so the AI metrics extractor and the
 * client tile compute stay drift-free. Update both together.
 */

export type MetricKind = "number" | "boolean";

export interface MetricSpec {
  key: string;
  label: string;
  kind: MetricKind;
  unit?: string;
  prompt: string;
  range?: [number, number];
  tileKey: string;
}

export interface DisciplineContract {
  id: "bp" | "bh" | "throwing" | "sb-pitching" | "sh";
  label: string;
  metrics: MetricSpec[];
}

// ------- BP (Baseball Pitching) -------
export const bpContract: DisciplineContract = {
  id: "bp",
  label: "Baseball Pitching",
  metrics: [
    {
      key: "energy_angle_deg",
      tileKey: "energy_angle",
      label: "Energy Angle",
      kind: "number",
      unit: "degrees",
      range: [0, 60],
      prompt:
        "Angle from the center mass of the plant foot to the front hip at PEAK LEG LIFT. Measure in degrees. 18 passes, 25 elite. If plant foot and front hip are not simultaneously visible, mark missing.",
    },
    {
      key: "premature_shoulder_open_deg",
      tileKey: "hip_shoulder_separation",
      label: "Premature shoulder opening (negative = still closed at landing)",
      kind: "number",
      unit: "degrees",
      range: [-30, 60],
      prompt:
        "Degrees the throwing-side shoulder has rotated toward target BEFORE front foot lands. 0 or negative = closed (PASS). Positive = early opening (FAIL).",
    },
    {
      key: "tempo_sec",
      tileKey: "tempo",
      label: "Tempo (peak leg lift -> front foot strike)",
      kind: "number",
      unit: "seconds",
      range: [0.4, 2.0],
      prompt:
        "Time in seconds from peak leg lift to front foot strike. <=1.05s passes.",
    },
    {
      key: "stride_pct_of_height",
      tileKey: "stride_length",
      label: "Stride length as % of athlete height",
      kind: "number",
      unit: "percent",
      range: [40, 130],
      prompt:
        "Stride length (back ankle at lift -> front ankle at landing) as % of athlete height. >=90% passes. If height cannot be approximated from frames, mark missing.",
    },
    {
      key: "head_vertical_movement_pct",
      tileKey: "head_stability",
      label: "Vertical head movement as % of athlete height",
      kind: "number",
      unit: "percent",
      range: [0, 15],
      prompt:
        "Vertical bounce of head from setup to release as % of athlete height. <=2% passes.",
    },
    {
      key: "glove_drift_outside_frame_in",
      tileKey: "glove_control",
      label: "Glove drift outside shoulder frame (inches)",
      kind: "number",
      unit: "inches",
      range: [-12, 24],
      prompt:
        "Inches glove drifts OUTSIDE the shoulder frame during delivery. 0 or negative passes. If glove leaves the visible frame, mark missing.",
    },
    {
      key: "head_at_release_deg",
      tileKey: "head_at_release",
      label: "Head deviation from target line at release",
      kind: "number",
      unit: "degrees",
      range: [-45, 45],
      prompt:
        "Absolute degrees head is offset from target line at release. <=15 passes.",
    },
    {
      key: "shoulder_tilt_deg",
      tileKey: "shoulder_tilt_release",
      label: "Shoulder tilt from horizontal at release",
      kind: "number",
      unit: "degrees",
      range: [-45, 45],
      prompt:
        "Absolute degrees of shoulder tilt from horizontal at release. <=10 passes.",
    },
    {
      key: "lift_thrust_deg",
      tileKey: "lift_thrust",
      label: "Combined lift-and-thrust angle off the rubber",
      kind: "number",
      unit: "degrees",
      range: [0, 60],
      prompt:
        "Combined lift-and-thrust drive angle off the rubber. >=18 passes.",
    },
  ],
};

// ------- BH (Baseball Hitting) -------
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
        "Score 1-10 for back-hip load: balanced, controlled, BEFORE the hand load, timed to pitcher delivery, no head drift, weight stays back. >=7 passes.",
    },
    {
      key: "hand_load_score_10",
      tileKey: "hand_load",
      label: "P2 Hand Load Position (1-10)",
      kind: "number",
      unit: "score",
      range: [0, 10],
      prompt:
        "Score 1-10 for bat/scap/knob load behind the head AFTER the hip load. >=6 passes.",
    },
    {
      key: "stride_dir_deg_off_square",
      tileKey: "stride_direction",
      label: "Stride direction degrees off square to pitcher",
      kind: "number",
      unit: "degrees",
      range: [-45, 45],
      prompt:
        "Degrees stride deviates from square line to pitcher. Positive = stepping out (bucket). Negative = stepping in (across body). |value|<=15 passes.",
    },
    {
      key: "heel_plant_score_10",
      tileKey: "heel_plant",
      label: "P3 Heel Plant / Landing Quality (1-10)",
      kind: "number",
      unit: "score",
      range: [0, 10],
      prompt:
        "Score 1-10 for landing sideways, chest+shoulders square to plate, both feet down, core tensioned, hips NOT turning shoulders. >=6 passes.",
    },
    {
      key: "sequencing_ok",
      tileKey: "sequencing",
      label: "Sequencing legal",
      kind: "boolean",
      prompt:
        "TRUE if sequence is: Load legs -> Load hands -> Pause -> Stride -> Pause -> Contact. FALSE if rushed or out of order.",
    },
    {
      key: "bat_path_score_10",
      tileKey: "bat_path",
      label: "Bat Path In/Out of Zone (1-10)",
      kind: "number",
      unit: "score",
      range: [0, 10],
      prompt:
        "Score 1-10 for elite bat path: enters behind ball, exits in front, long on-plane window. >=6 passes.",
    },
    {
      key: "back_elbow_past_bb_deg",
      tileKey: "back_elbow_contact",
      label: "Back elbow past belly button at contact (degrees)",
      kind: "number",
      unit: "degrees",
      range: [-45, 60],
      prompt:
        "Degrees back elbow has driven PAST belly button at contact, shoulders square. >=0 passes.",
    },
    {
      key: "hitters_move_score_10",
      tileKey: "hitters_move",
      label: "P4 Hitter's Move Quality (1-10)",
      kind: "number",
      unit: "score",
      range: [0, 10],
      prompt:
        "Score 1-10: hands stay back, elbow leads, no casting/early barrel flip, chest stays square, both hands to and through ball. >=7 passes.",
    },
  ],
};

/** Resolve contract from runtime module/sport. */
export function getContractFor(module: string, sport: string): DisciplineContract | null {
  if (module === "pitching" && sport === "baseball") return bpContract;
  if (module === "hitting" && sport === "baseball") return bhContract;
  // BH contract is a reasonable starting point for softball hitting too — same phases.
  if (module === "hitting" && sport === "softball") return bhContract;
  return null;
}

/** Build the JSON schema for a `metrics` object whose keys come from the contract. */
export function buildMetricsSchema(contract: DisciplineContract) {
  const properties: Record<string, unknown> = {};
  for (const m of contract.metrics) {
    const valueSchema =
      m.kind === "number"
        ? {
            type: "number",
            description: `Numeric measurement in ${m.unit ?? "units"}${
              m.range ? ` (typical range ${m.range[0]}..${m.range[1]})` : ""
            }. Null only when not measurable.`,
          }
        : { type: "boolean", description: "Boolean observation. Null only when not measurable." };

    properties[m.key] = {
      type: "object",
      description: m.prompt,
      properties: {
        value: { ...valueSchema, nullable: true },
        confidence: {
          type: "number",
          description:
            "Your measurement confidence 0..1 — NOT athlete quality. 1=clear frame and unambiguous; <0.5 = had to interpolate.",
        },
        missing: {
          type: "boolean",
          description: "TRUE only when the metric is genuinely not measurable from these frames.",
        },
        missing_reason: {
          type: "string",
          description:
            "If missing=true, ONE short sentence why (e.g. 'Camera angle hid front hip', 'Glove left frame before release').",
        },
      },
      required: ["confidence"],
    };
  }
  return {
    type: "object",
    description:
      "Structured per-tile measurements for the Hammer Report Card. Fill EVERY key. Use missing=true ONLY when the frames cannot support a measurement — never to avoid hard numbers. Confidence is YOUR measurement confidence, not the athlete's quality.",
    properties,
    required: contract.metrics.map((m) => m.key),
  };
}

/** Compact human-readable prompt block listing every metric the model must fill. */
export function buildMetricsPromptBlock(contract: DisciplineContract): string {
  const lines = contract.metrics.map(
    (m, i) =>
      `${i + 1}. ${m.key} (${m.kind}${m.unit ? `, ${m.unit}` : ""}) — ${m.prompt}`,
  );
  return [
    `\n\n=== REPORT CARD METRICS (REQUIRED) ===`,
    `In addition to your normal output, fill the structured "metrics" object with one entry per key below.`,
    `Each entry: { value, confidence: 0..1, missing?: boolean, missing_reason?: string }.`,
    `NEVER skip a key. If you can see it, measure it. If you genuinely cannot, set missing=true and give a 1-sentence reason.`,
    `Confidence is YOUR measurement quality (frame clarity, angle), NOT athlete quality.`,
    ``,
    ...lines,
    ``,
    `=== END REPORT CARD METRICS ===\n\n`,
  ].join("\n");
}
