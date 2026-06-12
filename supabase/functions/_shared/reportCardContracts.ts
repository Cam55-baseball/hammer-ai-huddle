/**
 * Server mirror of `src/lib/reportCard/contracts/*`.
 * Kept additive and identical in shape so the AI metrics extractor and the
 * client tile compute stay drift-free. Update both together.
 *
 * Doctrine notes:
 *  - All scored meters are 0..100 (`*_score_100`). Legacy `*_score_10` keys are
 *    preserved as OPTIONAL emit so historical records still render; the model
 *    is instructed to emit the `_100` form for new analyses.
 *  - PASS / FAIL tiles stay boolean.
 *  - Confidence is the model's MEASUREMENT confidence (frame clarity), not the
 *    athlete's quality.
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
      label: "Energy Angle (deg)",
      kind: "number",
      unit: "degrees",
      range: [0, 60],
      prompt:
        "Angle from the center mass of the plant foot to the front hip at PEAK LEG LIFT, measured in degrees. PASS at 18°, ELITE at 25°. Worked example: vertical thigh, no forward lean → ~10°; clear angled load over the rubber with hip stacked over plant foot → ~26°. If plant foot AND front hip are not simultaneously visible in the peak-leg-lift frame, set missing=true with reason 'Plant foot or front hip not visible at peak leg lift'.",
    },
    {
      key: "premature_shoulder_open_deg",
      tileKey: "hip_shoulder_separation",
      label: "Premature shoulder opening at landing (deg, negative = closed)",
      kind: "number",
      unit: "degrees",
      range: [-30, 60],
      prompt:
        "Degrees the throwing-side shoulder has rotated toward target BEFORE the front foot lands. 0 or negative = shoulders still closed (PASS). Positive = early opening (FAIL). Worked example: glove side still pointing at target at landing → ~-5°; chest already half-faced to plate at landing → ~+20°.",
    },
    {
      key: "tempo_sec",
      tileKey: "tempo",
      label: "Tempo: peak leg lift → front foot strike (seconds)",
      kind: "number",
      unit: "seconds",
      range: [0.4, 2.0],
      prompt:
        "Seconds from PEAK LEG LIFT to FRONT FOOT STRIKE. PASS ≤1.05s. Use displayed frame indices and the video's stated frame rate when computing.",
    },
    {
      key: "stride_pct_of_height",
      tileKey: "stride_length",
      label: "Stride length as % of athlete height",
      kind: "number",
      unit: "percent",
      range: [40, 130],
      prompt:
        "Stride length (back ankle at lift → front ankle at landing) as PERCENT of athlete standing height. PASS ≥90%. If full standing height is never visible (cannot calibrate), set missing=true with reason 'Athlete full height not visible — cannot calibrate stride %'.",
    },
    {
      key: "head_vertical_movement_pct",
      tileKey: "head_stability",
      label: "Vertical head movement as % of athlete height",
      kind: "number",
      unit: "percent",
      range: [0, 15],
      prompt:
        "Vertical bounce of the head from setup to release as PERCENT of athlete height. PASS ≤2%.",
    },
    {
      key: "glove_drift_outside_frame_in",
      tileKey: "glove_control",
      label: "Glove drift outside shoulder frame (inches)",
      kind: "number",
      unit: "inches",
      range: [-12, 24],
      prompt:
        "Inches the glove drifts OUTSIDE the shoulder frame during delivery. 0 or negative (stays inside) passes. If the glove leaves the visible camera frame, set missing=true with reason 'Glove left camera frame'.",
    },
    {
      key: "head_at_release_deg",
      tileKey: "head_at_release",
      label: "Head deviation from target line at release (deg)",
      kind: "number",
      unit: "degrees",
      range: [-45, 45],
      prompt:
        "Absolute degrees the head is offset from the target line at ball release. PASS ≤15°.",
    },
    {
      key: "shoulder_tilt_deg",
      tileKey: "shoulder_tilt_release",
      label: "Shoulder tilt from horizontal at release (deg)",
      kind: "number",
      unit: "degrees",
      range: [-45, 45],
      prompt:
        "Absolute degrees of shoulder tilt from horizontal at release. PASS ≤10°.",
    },
    {
      key: "lift_thrust_deg",
      tileKey: "lift_thrust",
      label: "Combined lift-and-thrust angle off the rubber (deg)",
      kind: "number",
      unit: "degrees",
      range: [0, 60],
      prompt:
        "Combined lift-and-thrust drive angle off the rubber. PASS ≥18°.",
    },
  ],
};

// ------- BH (Baseball Hitting) — 15-tile /100 doctrine -------
export const bhContract: DisciplineContract = {
  id: "bh",
  label: "Baseball Hitting",
  metrics: [
    // P1
    {
      key: "hip_stability_score_100",
      tileKey: "hip_load",
      label: "P1 Hip Load Stability (0–100)",
      kind: "number",
      unit: "score",
      range: [0, 100],
      prompt:
        "Score 0–100 for STABILITY of the back-hip load through P2. PASS at 70 = no body/head/front-foot drift while pitcher reaches peak knee lift. ELITE at 90 = stable AND a big, balanced load that stores power. Worked example: head drifts ~4% of body height toward pitcher during P2 → ~55; head/front foot still and load deeply balanced → ~85.",
    },
    // Legacy alias still accepted from old records.
    {
      key: "hip_load_score_10",
      tileKey: "hip_load",
      label: "[LEGACY] P1 Hip Load (1–10)",
      kind: "number",
      unit: "score",
      range: [0, 10],
      prompt:
        "Legacy 1–10 hip load score. Only emit this if you cannot estimate the 0–100 stability score. Prefer hip_stability_score_100.",
    },
    // P2
    {
      key: "hand_load_score_100",
      tileKey: "hand_load",
      label: "P2 Hand Load Position (0–100)",
      kind: "number",
      unit: "score",
      range: [0, 100],
      prompt:
        "Score 0–100 for the bat/scap/knob load behind the head AFTER P1 is stable. PASS at 65, ELITE at 88. Worked example: hands clearly loaded behind head with scap pinch, chest square → ~85; hands stay near front shoulder with no scap load → ~45.",
    },
    {
      key: "hand_load_score_10",
      tileKey: "hand_load",
      label: "[LEGACY] P2 Hand Load (1–10)",
      kind: "number",
      unit: "score",
      range: [0, 10],
      prompt: "Legacy 1–10 hand load score. Prefer hand_load_score_100.",
    },
    {
      key: "p2_timing_pass",
      tileKey: "p2_timing",
      label: "P2 timing aligned to pitcher peak knee lift",
      kind: "boolean",
      prompt:
        "TRUE if the hitter's hand load completes within ±150ms of the pitcher's PEAK KNEE LIFT. FALSE if early (drifts forward) or late (rushed P3). If pitcher knee lift not visible, set missing=true with reason 'Pitcher knee lift not in frame'.",
    },
    {
      key: "eyes_track_score_100",
      tileKey: "eyes_tracking",
      label: "Eyes / head tracking quality (0–100)",
      kind: "number",
      unit: "score",
      range: [0, 100],
      prompt:
        "Score 0–100 for how steady the head/eyes stay. PASS at 70, ELITE at 90. Lateral head movement TOWARD the pitcher is the biggest deduction. Worked example: head moves >4% of body height laterally → ~50; rock-steady head with eyes tracking the ball → ~92.",
    },
    // P3
    {
      key: "stride_dir_deg_off_square",
      tileKey: "stride_direction",
      label: "Stride direction degrees off square to pitcher",
      kind: "number",
      unit: "degrees",
      range: [-45, 45],
      prompt:
        "Degrees stride deviates from a square line to the pitcher. Positive = stepping out (bucket). Negative = stepping in (across body). |value|≤15° passes.",
    },
    {
      key: "heel_plant_score_100",
      tileKey: "heel_plant",
      label: "P3 Heel Plant / Landing Quality (0–100)",
      kind: "number",
      unit: "score",
      range: [0, 100],
      prompt:
        "Score 0–100 for landing sideways, chest+shoulders square to plate, both feet down, core tensioned, hips NOT turning shoulders open. PASS at 65, ELITE at 88. Worked example: shoulders rotate WITH hips at landing → ~45; sideways landing with shoulders still closed → ~85.",
    },
    {
      key: "heel_plant_score_10",
      tileKey: "heel_plant",
      label: "[LEGACY] P3 Heel Plant (1–10)",
      kind: "number",
      unit: "score",
      range: [0, 10],
      prompt: "Legacy 1–10 heel plant score. Prefer heel_plant_score_100.",
    },
    {
      key: "p3_timing_pass",
      tileKey: "p3_timing",
      label: "P3 timing aligned to pitcher release",
      kind: "boolean",
      prompt:
        "TRUE if the front foot is down within ±120ms of the pitcher reaching release point. FALSE if foot is down too early (drifting) or still in flight at release (late). If pitcher release point not visible, set missing=true with reason 'Pitcher release point not in frame'.",
    },
    {
      key: "hands_outside_shoulders_at_landing_pass",
      tileKey: "hands_outside_shoulders_at_landing",
      label: "Hands outside shoulder line at front-foot landing",
      kind: "boolean",
      prompt:
        "TRUE if at the frame of FRONT-FOOT STRIKE (landing) the hitter's hands sit HORIZONTALLY OUTSIDE the line of the back shoulder (further from the body centerline than the back shoulder). FALSE if hands are stacked inside the shoulders or pulled in front of the chest. If hands or back shoulder are not visible in the landing frame, set missing=true with reason 'Hands or back shoulder not visible at landing'.",
    },

    // P4
    {
      key: "sequencing_ok",
      tileKey: "sequencing",
      label: "Sequencing legal",
      kind: "boolean",
      prompt:
        "TRUE if sequence is: Load legs → Load hands → Pause → Stride → Pause → Contact. FALSE if rushed or out of order.",
    },
    {
      key: "bat_path_score_100",
      tileKey: "bat_path",
      label: "Bat Path In/Out of Zone (0–100)",
      kind: "number",
      unit: "score",
      range: [0, 100],
      prompt:
        "Score 0–100 for elite bat path: enters behind ball, exits in front, long on-plane window. PASS at 65, ELITE at 88.",
    },
    {
      key: "bat_path_score_10",
      tileKey: "bat_path",
      label: "[LEGACY] Bat Path (1–10)",
      kind: "number",
      unit: "score",
      range: [0, 10],
      prompt: "Legacy 1–10 bat path score. Prefer bat_path_score_100.",
    },
    {
      key: "on_plane_pct",
      tileKey: "on_plane",
      label: "% of swing arc on the pitch plane",
      kind: "number",
      unit: "percent",
      range: [0, 100],
      prompt:
        "Percentage of the swing arc that stays on the plane of the incoming pitch. PASS at 60%, ELITE at 85%. Worked example: barrel comes off plane immediately after contact → ~40%; long on-plane window through and past contact → ~85%.",
    },
    {
      key: "time_to_contact_ms",
      tileKey: "time_to_contact",
      label: "Time from swing start to contact (ms)",
      kind: "number",
      unit: "ms",
      range: [80, 400],
      prompt:
        "Milliseconds from SWING START to BALL-BARREL CONTACT. THIS IS A BREAD-AND-BUTTER METRIC — be elite-accurate. Frame anchors: (a) SWING START = the first frame in which the knob begins forward motion AFTER the hand-load has completed AND the hips have begun to clear (do NOT use load motion or stride motion as swing start); (b) CONTACT FRAME = the first frame in which the bat barrel overlaps the ball. Compute ms = (contact_frame - start_frame) * 1000 / fps. Use the video's stated frame rate. If fps is unknown, set missing=true with reason 'fps_unknown'. If either anchor frame is ambiguous (motion blur, occluded knob, off-camera contact), set missing=true with reason naming the specific landmark you could not lock. NEVER GUESS. PASS ≤175 ms, ELITE ≤150 ms.",
    },
    {
      key: "bat_speed_contact_mph",
      tileKey: "bat_speed_contact",
      label: "Bat speed through contact (mph proxy)",
      kind: "number",
      unit: "mph",
      range: [30, 110],
      prompt:
        "Estimated barrel speed AT contact, in mph. THIS IS A BREAD-AND-BUTTER METRIC — be elite-accurate. Method: measure peak translational speed of the BARREL TIP over a 2-frame window straddling the contact frame. Convert pixels/frame to mph using the bat length as the calibration ruler (default bat length = 33 in if unknown — note this assumption). Required visibility: full bat AND ball visible across the 2-frame window straddling contact, frame rate known. If the barrel is obscured at contact, if frame rate is unknown, or if motion blur prevents tracking the barrel tip across two consecutive frames, set missing=true with the specific reason. NEVER GUESS. PASS ≥65 mph, ELITE ≥75 mph.",
    },
    {
      key: "back_elbow_past_bb_deg",
      tileKey: "back_elbow_contact",
      label: "Back elbow past belly button at contact (degrees)",
      kind: "number",
      unit: "degrees",
      range: [-45, 60],
      prompt:
        "Degrees back elbow has driven PAST belly button at contact, shoulders square. PASS at ≥0°, ELITE at ≥20°.",
    },
    {
      key: "hitters_move_score_100",
      tileKey: "hitters_move",
      label: "P4 Hitter's Move Quality (0–100)",
      kind: "number",
      unit: "score",
      range: [0, 100],
      prompt:
        "Score 0–100: hands stay back, elbow leads, no casting/early barrel flip, chest stays square, contact made with the hands, barrel catapults last. PASS at 70, ELITE at 92.",
    },
    {
      key: "hitters_move_score_10",
      tileKey: "hitters_move",
      label: "[LEGACY] Hitter's Move (1–10)",
      kind: "number",
      unit: "score",
      range: [0, 10],
      prompt: "Legacy 1–10 hitter's move score. Prefer hitters_move_score_100.",
    },
    {
      key: "shoulder_plane_steadiness_score_100",
      tileKey: "shoulder_plane_steadiness",
      label: "Shoulder plane steadiness through P4 (0–100)",
      kind: "number",
      unit: "score",
      range: [0, 100],
      prompt:
        "Score 0–100 for how steady the SHOULDER PLANE remains from the start of shoulder rotation through contact. Measure the angle of the line between the two shoulders across the rotation window; the smaller the change, the higher the score. PASS at 70, ELITE at 90. Worked example: shoulder line wobbles or re-tilts mid-rotation → ~50; same tilt held from rotation start through contact → ~88.",
    },
    {
      key: "finish_balance_score_100",
      tileKey: "finish_balance",
      label: "Finish & Balance (0–100)",
      kind: "number",
      unit: "score",
      range: [0, 100],
      prompt:
        "Score 0–100 for post-contact balance, no fall-off, two-hand finish. PASS at 65, ELITE at 88.",
    },
    {
      key: "shoulder_to_shoulder_hold_pct_to_contact",
      tileKey: "shoulder_to_shoulder_hold",
      label: "Hands-to-back-shoulder spacing held: % of landing→contact window",
      kind: "number",
      unit: "percent",
      range: [0, 100],
      prompt:
        "BREAD-AND-BUTTER METRIC — be elite-accurate. Percentage of the LANDING→CONTACT window during which the spacing between the hand cluster and the back shoulder is HELD. Method: at the front-foot landing frame, measure the 2D distance between the hand cluster centroid and the back-shoulder joint (call this D0). For every frame from landing to contact, recompute that distance. The spacing is 'held' on a frame when distance ≥ 0.90 * D0. Return the % of frames in the landing→contact window where spacing was held. PASS at ≥50%, ELITE at ≥95% (held essentially all the way to contact). If hands or back shoulder are not trackable across the landing→contact window, set missing=true with the specific reason. NEVER guess.",
    },
    {
      key: "shoulder_to_shoulder_hold_pass",
      tileKey: "shoulder_to_shoulder_hold",
      label: "Hands stayed back through P4 (boolean fallback)",
      kind: "boolean",
      prompt:
        "TRUE only if hands-to-back-shoulder spacing remained at ≥90% of its landing-frame value across at least 50% of frames from landing to contact. Prefer emitting shoulder_to_shoulder_hold_pct_to_contact instead — only emit this boolean when you cannot estimate a percentage.",
    },
    {
      key: "front_shoulder_leak_before_contact",
      tileKey: "shoulder_to_shoulder_hold",
      label: "Front shoulder flew open / leaked out of sequence before contact",
      kind: "boolean",
      prompt:
        "TRUE if the front shoulder rotates open toward the pitcher BEFORE contact in a way that breaks the hip→shoulder sequence. Operational rule: measure the angle of the line between the two shoulders relative to the line from back shoulder to the pitcher. If that line rotates more than ~15° toward the pitcher before the contact frame (front shoulder has flown open ahead of the hips), set TRUE. This is an AUTO-FAIL trigger for the shoulder-to-shoulder hold tile — it nullifies the move regardless of spacing held.",
    },
    {
      key: "front_shoulder_leak_pct_of_window",
      tileKey: "shoulder_to_shoulder_hold",
      label: "% of landing→contact window at which the front shoulder first leaked",
      kind: "number",
      unit: "percent",
      range: [0, 100],
      prompt:
        "If front_shoulder_leak_before_contact is TRUE, return the percentage of the landing→contact window at which the leak FIRST crossed the ~15° threshold (e.g. 35 means about a third of the way from landing to contact). If no leak, set missing=true with reason 'no_leak'.",
    },
  ],
};

// ------- Throwing = BP minus rubber-only metrics -------
const THROWING_EXCLUDED = new Set(["energy_angle_deg", "tempo_sec", "lift_thrust_deg"]);
export const throwingContract: DisciplineContract = {
  id: "throwing",
  label: "Baseball Throwing",
  metrics: bpContract.metrics.filter((m) => !THROWING_EXCLUDED.has(m.key)),
};

/** Resolve contract from runtime module/sport. */
export function getContractFor(module: string, sport: string): DisciplineContract | null {
  if (module === "pitching" && sport === "baseball") return bpContract;
  if (module === "pitching" && sport === "softball") return { ...bpContract, id: "sb-pitching", label: "Softball Pitching" };
  if (module === "hitting" && sport === "baseball") return bhContract;
  if (module === "hitting" && sport === "softball") return { ...bhContract, id: "sh", label: "Softball Hitting" };
  if (module === "throwing") return throwingContract;
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
      "Structured per-tile measurements for the Hammer Report Card. Fill EVERY non-legacy key. Use missing=true ONLY when the frames cannot support a measurement — never to avoid hard numbers. Confidence is YOUR measurement confidence, not the athlete's quality.",
    properties,
    // Legacy `_score_10` keys are tolerated but NOT required.
    required: contract.metrics.filter((m) => !m.key.endsWith("_score_10")).map((m) => m.key),
  };
}

/** Compact human-readable prompt block listing every metric the model must fill. */
export function buildMetricsPromptBlock(contract: DisciplineContract): string {
  const lines = contract.metrics
    .filter((m) => !m.key.endsWith("_score_10"))
    .map((m, i) => `${i + 1}. ${m.key} (${m.kind}${m.unit ? `, ${m.unit}` : ""}) — ${m.prompt}`);
  return [
    `\n\n=== REPORT CARD METRICS (REQUIRED) ===`,
    `In addition to your normal output, fill the structured "metrics" object with one entry per key below.`,
    `Each entry: { value, confidence: 0..1, missing?: boolean, missing_reason?: string }.`,
    `NEVER skip a key. If you can SEE it, MEASURE it. If you genuinely cannot, set missing=true with a 1-sentence reason that names the specific landmark you could not see (e.g. "Plant foot not visible at peak leg lift", "Pitcher knee lift not in frame").`,
    `Confidence is YOUR measurement quality (frame clarity, angle), NOT athlete quality. When inferring from few frames or partial visibility, keep confidence ≤0.6.`,
    `Pitching/throwing landmark hints: rubber, plant foot, front hip at peak leg lift, glove side throughout delivery, front foot strike frame, release frame. Use FULL-BODY frames to calibrate stride %.`,
    `Hitting landmark hints: pitcher peak knee lift, pitcher release point, hitter front foot strike, bat barrel through the contact zone, back elbow and belly button at contact.`,
    ``,
    ...lines,
    ``,
    `=== END REPORT CARD METRICS ===\n\n`,
  ].join("\n");
}

/**
 * Build a focused PASS-2 prompt listing ONLY the metric keys that came back
 * missing in pass 1, with their original prompt language reattached so the
 * model has another shot at the specific landmarks it failed to read.
 */
export function buildSecondPassPromptBlock(
  contract: DisciplineContract,
  missingKeys: string[],
): string {
  const set = new Set(missingKeys);
  const lines = contract.metrics
    .filter((m) => set.has(m.key))
    .map((m, i) => `${i + 1}. ${m.key} (${m.kind}${m.unit ? `, ${m.unit}` : ""}) — ${m.prompt}`);
  return [
    `\n\n=== REPORT CARD METRICS — PASS 2 (TARGETED) ===`,
    `Pass 1 returned these keys as missing or unparseable. Look at the frames AGAIN, specifically for the landmarks each metric calls out. If — after re-examining — the landmark truly is not visible, return missing=true with a sharper reason. Otherwise emit a value with conservative confidence (≤0.6 is fine).`,
    `Return ONLY the metrics object. Do not change any other field.`,
    ``,
    ...lines,
    ``,
    `=== END PASS 2 ===\n\n`,
  ].join("\n");
}

/** Count how many required (non-legacy) keys came back as missing/unparseable. */
export function countMissing(
  contract: DisciplineContract,
  metrics: Record<string, unknown> | null | undefined,
): { missingKeys: string[]; total: number; ratio: number } {
  const required = contract.metrics.filter((m) => !m.key.endsWith("_score_10"));
  const total = required.length;
  if (!metrics || typeof metrics !== "object") {
    return { missingKeys: required.map((m) => m.key), total, ratio: 1 };
  }
  const missingKeys: string[] = [];
  for (const m of required) {
    const e = (metrics as Record<string, any>)[m.key];
    if (!e || typeof e !== "object") {
      missingKeys.push(m.key);
      continue;
    }
    if (e.missing === true) {
      missingKeys.push(m.key);
      continue;
    }
    if (m.kind === "number" && !(typeof e.value === "number" && Number.isFinite(e.value))) {
      missingKeys.push(m.key);
      continue;
    }
    if (m.kind === "boolean" && typeof e.value !== "boolean") {
      missingKeys.push(m.key);
    }
  }
  return { missingKeys, total, ratio: total === 0 ? 0 : missingKeys.length / total };
}
