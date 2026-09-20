/**
 * Upper-Body Plyometric System v1 (UBP) — §6 family definitions.
 *
 * Single source of truth for the catalog rows AND the pure rule engine. Rows
 * are inserted INACTIVE; nothing here is wired into generation.
 *
 * Naming law: no outside program, brand or coach names in any slug, name or
 * cue. Family 6 is "Rapid Sled Strap Press" for exactly this reason.
 */

export type UbTier = "U1" | "U2" | "U3";
export type Plane = "push" | "pull_h" | "pull_v" | "overhead" | "rotation";
export type Letter = "Base" | "A" | "B" | "C" | "D";

export const LETTER_PLANE: Record<Letter, Plane> = {
  Base: "push",
  A: "pull_h",
  B: "pull_v",
  C: "overhead",
  D: "rotation",
};

/** Gate family a movement's strength gate is read against (§3). */
export type GateFamily = "push" | "row" | "pullup" | "overhead" | "bench_catch" | "none";

export const PLANE_GATE: Record<Plane, GateFamily> = {
  push: "push",
  pull_h: "row",
  pull_v: "pullup",
  overhead: "overhead",
  rotation: "none",
};

export interface UbMovement {
  slug: string;
  name: string;
  family: number;
  familyName: string;
  letter: Letter;
  plane: Plane;
  tier: UbTier;
  equipment: string[];
  contactsPerRep: number;
  /** true when the row uses a barbell overhead catch — never for pitchers (§4). */
  barbellOverhead?: boolean;
  /** true when the row needs a partner to feed it. */
  partner?: boolean;
  cue: string;
  /** Existing catalog slug reused instead of inserting a new row. */
  reuseOf?: string;
  /** Approximate equivalent for the owner's movement in this plane (`≈` in §6). */
  approx?: boolean;
}

/** Quality-gate cue appended to every row (§5). */
export const QUALITY_GATE_CUE =
  "Stop the set on a slow catch, loud hands, flaring elbows, sagging hips, shrugging shoulders or a brace that breaks.";

/** U1 anchors — every regression chain ends at one of these (§8). */
export const U1_ANCHOR: Record<Plane, string> = {
  push: "ubp_f14_base_wall_chest_pass_rhythm",
  pull_h: "ubp_f14_a_band_rebound_row_rhythm",
  pull_v: "ubp_f14_b_overhead_wall_dribble",
  overhead: "ubp_f14_c_light_overhead_rhythm_throw",
  rotation: "bs_plyo_ball_wall_rebounds", // reused existing U1-equivalent row
};

/** U2 bridge per plane — the regression target for every U3 row. */
export const U2_BRIDGE: Record<Plane, string> = {
  push: "ubp_f01_base_pushup_drop_catch",
  pull_h: "ubp_f01_a_inverted_row_drop_catch",
  pull_v: "ubp_f01_b_pullup_drop_catch",
  overhead: "ubp_f01_c_landmine_press_drop_catch",
  rotation: "ubp_f01_d_hk_landmine_rotation_drop_catch",
};

type Spec = [letter: Letter, slugTail: string, name: string, equip: string[], contacts: number, cue: string, extra?: Partial<UbMovement>];

function fam(
  family: number,
  familyName: string,
  tier: UbTier | Partial<Record<Letter, UbTier>>,
  specs: Spec[],
): UbMovement[] {
  const pad = String(family).padStart(2, "0");
  return specs.map(([letter, tail, name, equip, contacts, cue, extra]) => ({
    slug: `ubp_f${pad}_${letter === "Base" ? "base" : letter.toLowerCase()}_${tail}`,
    name,
    family,
    familyName,
    letter,
    plane: LETTER_PLANE[letter],
    tier: typeof tier === "string" ? tier : (tier[letter] as UbTier),
    equipment: equip,
    contactsPerRep: contacts,
    cue,
    ...extra,
  }));
}

export const UB_MOVEMENTS: UbMovement[] = [
  ...fam(1, "Drop Catch", "U2", [
    ["Base", "pushup_drop_catch", "Push-Up Drop Catch", ["bodyweight", "box"], 1, "Drop to the boxes, catch soft, stick two seconds."],
    ["A", "inverted_row_drop_catch", "Inverted Row Drop Catch", ["low_bar"], 1, "Let the body drop, catch the bar, hold two seconds."],
    ["B", "pullup_drop_catch", "Pull-Up Drop Catch, Band Assisted", ["pull_up_bar", "bands"], 1, "Drop from the top, catch mid-hang, hold two seconds."],
    ["C", "landmine_press_drop_catch", "Landmine Press Drop Catch", ["landmine"], 1, "Let the bar fall an inch, catch it, hold two seconds."],
    ["D", "hk_landmine_rotation_drop_catch", "Half-Kneeling Landmine Rotation Drop Catch", ["landmine"], 1, "Catch the fall with the trunk, not the arms."],
  ]),
  ...fam(2, "Plyometric", "U3", [
    ["Base", "plyo_pushup", "Plyo Push-Up, Incline to Floor", ["bodyweight", "box"], 1, "Leave the ground, land soft, go again."],
    ["A", "plyo_inverted_row", "Plyo Inverted Row, Release and Re-Grip", ["low_bar"], 1, "Pull hard, let go, catch the bar."],
    ["B", "plyo_pullup", "Plyo Pull-Up, Release and Re-Grip, Band Assisted", ["pull_up_bar", "bands"], 1, "Pull to the top, release, catch under control."],
    ["C", "landmine_plyo_press", "Landmine Plyo Press, Release and Catch", ["landmine"], 1, "Punch, release, catch it clean."],
    ["D", "landmine_rotational_punch_throw", "Landmine Rotational Punch-Throw", ["landmine"], 1, "Turn the back hip, punch through.", { reuseOf: "bs_landmine_rotational_punch" }],
  ]),
  ...fam(3, "Drop, Pause, Explode", "U2", [
    ["Base", "pushup_clap", "Push-Up to Clap", ["bodyweight"], 1, "Pause two seconds at the bottom, then clap.", { reuseOf: "lift_clap_pushup_plyo" }],
    ["A", "inverted_row_release_clap", "Inverted Row to Release-Clap", ["low_bar"], 1, "Pause, pull, clap, catch the bar."],
    ["B", "pullup_mid_hang_pause", "Pull-Up, Mid-Hang Pause to Explosive Pull", ["pull_up_bar"], 1, "Hold mid-hang two seconds, then explode."],
    ["C", "landmine_press_pause_explode", "Landmine Press, Pause to Explosive Press", ["landmine"], 1, "Pause at the chest, then drive."],
    ["D", "mb_rotational_catch_pause_throw", "Rotational Med-Ball Catch, Pause, Throw", ["med_ball", "partner"], 1, "Catch, hold two seconds, then throw.", { partner: true }],
  ]),
  ...fam(4, "Partner Drop, Overhead", { Base: "U3", A: "U2", B: "U3", C: "U2", D: "U3" }, [
    ["Base", "seated_overhead_mb_catch_press_throw", "Seated Overhead Med-Ball Catch to Press-Throw", ["med_ball", "partner"], 1, "Catch overhead, press it straight back.", { partner: true }],
    ["A", "prone_plyo_ball_reverse_catch_throw", "Prone Plyo-Ball Reverse Catch to Throw", ["plyo_ball", "partner"], 1, "Chest stays down, arms do the work.", { partner: true, approx: true }],
    ["B", "overhead_catch_slam", "Overhead Catch to Slam", ["med_ball", "partner"], 1, "Catch high, slam through the floor.", { partner: true }],
    ["C", "sa_overhead_plyo_ball_catch_press_throw", "Single-Arm Overhead Plyo-Ball Catch to Press-Throw, Light", ["plyo_ball", "partner"], 1, "Light ball only, elbow stays high.", { partner: true }],
    ["D", "rotational_catch_shot_put_throw", "Rotational Catch to Shot-Put Throw", ["med_ball", "partner"], 1, "Catch, turn the hip, push it out.", { partner: true }],
  ]),
  ...fam(5, "Partner Drop, Chest", "U3", [
    ["Base", "supine_chest_catch_press_throw", "Supine Chest Catch to Press-Throw", ["med_ball", "partner", "bench"], 1, "Catch to the chest, press it back fast.", { partner: true }],
    ["A", "band_overspeed_row", "Band Overspeed Row", ["bands", "anchor"], 1, "Brake the snap, then pull back hard.", { approx: true }],
    ["B", "supine_pullover_catch_throw", "Supine Pullover Catch to Throw", ["med_ball", "partner", "bench"], 1, "Catch behind the head, throw over the chest.", { partner: true }],
    ["C", "incline_catch_press_throw", "Incline Catch to Press-Throw, 45 Degrees", ["med_ball", "partner", "bench"], 1, "Catch at the collarbone, press on the angle.", { partner: true }],
    ["D", "seated_rotational_catch_throw", "Seated Rotational Catch to Throw", ["med_ball", "partner"], 1, "Feet quiet, trunk does the turning.", { partner: true }],
  ]),
  ...fam(6, "Rapid Sled Strap Press", "U3", [
    ["Base", "sled_strap_rapid_press", "Sled Strap Rapid Press", ["sled", "strap"], 1, "Short, sharp punches, no reaching."],
    ["A", "sled_strap_rapid_row", "Sled Strap Rapid Row", ["sled", "strap"], 1, "Rip the strap to the ribs, reset fast."],
    ["B", "band_rapid_pull_down", "Band Rapid Pull-Down", ["bands", "anchor"], 1, "Snap the hands to the hips, control the return.", { approx: true }],
    ["C", "landmine_rapid_press", "Landmine Rapid Press", ["landmine"], 1, "Quick punches, ribs stay down.", { approx: true }],
    ["D", "sled_strap_rotational_punch", "Sled Strap Rotational Punch", ["sled", "strap"], 1, "Turn the back hip through each punch."],
  ]),
  ...fam(7, "Prowler Catch to Press", "U3", [
    ["Base", "prowler_catch_press", "Prowler Catch to Press", ["prowler", "bands"], 1, "Catch the handles, press straight back."],
    ["A", "strap_sled_catch_row", "Strap Sled Catch to Row", ["sled", "strap", "bands"], 1, "Catch, then rip it back to the ribs."],
    ["B", "band_pull_down_catch_drive", "Band Pull-Down Catch to Drive", ["bands", "anchor"], 1, "Catch the snap, drive the hands down.", { approx: true }],
    ["C", "high_handle_prowler_catch_press", "High-Handle Prowler Catch to Press", ["prowler", "bands"], 1, "Hands high, ribs down, press through."],
    ["D", "prowler_catch_rotational_press", "Prowler Catch to Rotational Press", ["prowler", "bands"], 1, "Catch square, press across the body."],
  ]),
  ...fam(8, "Prowler Catch and Stick", "U2", [
    ["Base", "prowler_catch_stick", "Prowler Catch and Stick", ["prowler", "bands"], 1, "Catch it and freeze two seconds."],
    ["A", "strap_sled_catch_stick", "Strap Sled Catch and Stick", ["sled", "strap", "bands"], 1, "Catch and hold, shoulders packed."],
    ["B", "band_pull_down_catch_stick", "Band Pull-Down Catch and Stick", ["bands", "anchor"], 1, "Catch the snap and hold it still.", { approx: true }],
    ["C", "high_handle_prowler_catch_stick", "High-Handle Prowler Catch and Stick", ["prowler", "bands"], 1, "Catch high, hold, ribs down."],
    ["D", "rotational_band_catch_stick", "Rotational Band Catch and Stick", ["bands", "anchor"], 1, "Resist the turn, hold square."],
  ]),
  ...fam(9, "Repeat Wall Throws", "U3", [
    ["Base", "repeat_chest_pass", "Repeat Wall Chest Pass", ["med_ball", "wall"], 1, "Fast hands, no pause between throws."],
    ["A", "rapid_band_rebound_row", "Rapid Band Rebound Row", ["bands", "anchor"], 1, "Short rips, let the band rebound.", { approx: true }],
    ["B", "repeat_overhead_slam", "Repeat Overhead Slam", ["med_ball"], 1, "Catch the bounce, slam again."],
    ["C", "repeat_overhead_wall_throw", "Repeat Overhead Wall Throw", ["med_ball", "wall"], 1, "Throw from overhead, catch, repeat."],
    ["D", "repeat_rotational_wall_throw", "Repeat Rotational Wall Throw", ["med_ball", "wall"], 1, "Turn the hip each throw, keep the rhythm."],
  ]),
  ...fam(10, "Catch and Stick", "U2", [
    ["Base", "chest_catch_stick", "Chest Catch and Stick", ["med_ball", "partner"], 1, "Catch to the chest, freeze two seconds.", { partner: true }],
    ["A", "behind_body_plyo_ball_catch_stick", "Behind-Body Plyo-Ball Catch and Stick", ["plyo_ball", "partner"], 1, "Catch behind the hip, hold still.", { partner: true, approx: true }],
    ["B", "overhead_catch_stick", "Overhead Catch and Stick", ["med_ball", "partner"], 1, "Catch overhead, lock the ribs down.", { partner: true }],
    ["C", "sa_overhead_plyo_ball_catch_stick", "Single-Arm Overhead Plyo-Ball Catch and Stick, Light", ["plyo_ball", "partner"], 1, "Light ball, elbow high, hold two seconds.", { partner: true }],
    ["D", "rotational_catch_stick", "Rotational Catch and Stick", ["med_ball", "partner"], 1, "Catch across the body, stop the turn.", { partner: true }],
  ]),
  ...fam(11, "Bench Catch", "U3", [
    ["Base", "bench_drop_catch", "Bench Drop Catch, Pins", ["smith_machine", "safety_pins", "bench"], 1, "Pins set, 30 to 40 percent, catch soft."],
    ["A", "chest_supported_row_drop_catch", "Chest-Supported Row Drop Catch", ["dumbbells", "bench"], 1, "Let it drop an inch, catch it clean."],
    ["B", "cable_pull_down_rapid_rebound", "Cable Pull-Down Rapid Rebound", ["cable"], 1, "Short rebounds, shoulders stay packed.", { approx: true }],
    ["C", "seated_landmine_drop_catch", "Seated Landmine Drop Catch", ["landmine", "bench"], 1, "Short drop, catch at the collarbone.", { approx: true }],
    ["D", "landmine_rotation_catch", "Landmine Rotation Catch", ["landmine"], 1, "Catch the fall with the trunk."],
  ]),
  ...fam(12, "Single-Arm Band Snaps", "U1", [
    ["Base", "sa_band_punch_snap", "Single-Arm Band Punch Snap", ["bands", "anchor"], 1, "Light band, fast punch, quiet body."],
    ["A", "sa_band_snap_row", "Single-Arm Band Snap Row", ["bands", "anchor"], 1, "Snap to the ribs, release slow."],
    ["B", "sa_band_snap_down", "Single-Arm Band Snap-Down", ["bands", "anchor"], 1, "Snap the hand to the hip, stay tall."],
    ["C", "sa_band_overhead_snap_y", "Single-Arm Band Overhead Snap, Y Pattern", ["bands", "anchor"], 1, "Snap to the Y, ribs down."],
    ["D", "sa_band_chop_snap", "Single-Arm Band Chop Snap", ["bands", "anchor"], 1, "Chop across, let the hip lead."],
  ]),
  ...fam(13, "Arm-Care Reactive", "U1", [
    ["A", "prone_plyo_ball_drops_ty", "Prone Plyo-Ball Drops, T and Y", ["plyo_ball", "bench"], 1, "Small fast drops, thumb up."],
    ["B", "reverse_plyo_ball_throws_9090", "90/90 Reverse Plyo-Ball Wall Throws", ["plyo_ball", "wall"], 1, "Elbow at shoulder height, fast and light."],
    ["C", "overhead_wall_dribbles", "Overhead Wall Dribbles", ["plyo_ball", "wall"], 1, "Small dribbles, arm stays overhead."],
    ["D", "rebounder_deceleration_catches", "Rebounder Deceleration Catches", ["plyo_ball", "rebounder"], 1, "Catch late, slow it down under control."],
  ]),
  ...fam(14, "Rhythmic Med Ball", "U1", [
    ["Base", "wall_chest_pass_rhythm", "Wall Chest-Pass Rhythm", ["med_ball", "wall"], 1, "Light ball, steady rhythm, quiet hands."],
    ["A", "band_rebound_row_rhythm", "Band Rebound Row Rhythm", ["bands", "anchor"], 1, "Easy rips in rhythm, no straining."],
    ["B", "overhead_wall_dribble", "Overhead Wall Dribble", ["plyo_ball", "wall"], 1, "Small overhead dribbles, stay tall."],
    ["C", "light_overhead_rhythm_throw", "Light Overhead Rhythm Throws", ["plyo_ball", "wall"], 1, "Light and fast, never max effort."],
    ["D", "rotational_wall_rhythm", "Rotational Wall Rhythm", ["plyo_ball", "wall"], 1, "Turn the hip, keep the beat.", { reuseOf: "bs_plyo_ball_wall_rebounds" }],
  ]),
  ...fam(15, "Iso to Explode", "U2", [
    ["Base", "pushup_bottom_hold_explode", "Push-Up Bottom Hold to Explode", ["bodyweight"], 1, "Hold three seconds at the bottom, then go."],
    ["A", "inverted_row_hold_release", "Inverted Row Hold to Release Row", ["low_bar"], 1, "Hold three seconds, then pull fast."],
    ["B", "pullup_mid_hang_hold_explode", "Pull-Up Mid-Hang Hold to Explode", ["pull_up_bar"], 1, "Hold three seconds mid-hang, then drive."],
    ["C", "landmine_press_hold_explode", "Landmine Press Hold to Explode", ["landmine"], 1, "Hold three seconds, then punch."],
    ["D", "band_rotation_hold_throw", "Band Rotation Hold to Throw", ["bands", "anchor"], 1, "Hold the turn three seconds, then release."],
  ]),
  ...fam(16, "Contrast Pairs", "U3", [
    ["Base", "bench_to_plyo_pushup", "Bench Press to Plyo Push-Up", ["barbell", "bench"], 1, "Heavy set, rest, then fast push-ups.", { reuseOf: "pap_bench_to_plyo_pushup" }],
    ["A", "row_to_band_snap_row", "Row to Band Snap Row", ["barbell", "bands", "anchor"], 1, "Heavy row, rest, then snap rows."],
    ["B", "pullup_to_band_snap_down", "Pull-Up to Band Snap-Down", ["pull_up_bar", "bands", "anchor"], 1, "Heavy pull-ups, rest, then snap-downs."],
    ["C", "landmine_press_to_landmine_plyo_press", "Landmine Press to Landmine Plyo Press", ["landmine"], 1, "Heavy press, rest, then release presses."],
    ["D", "landmine_rotation_to_rotational_shot_put", "Landmine Rotation to Rotational Shot-Put", ["landmine", "med_ball"], 1, "Heavy rotation, rest, then throw."],
  ]),
];

/** Regression chain: U3 → U2 bridge → U1 anchor; U2 → U1 anchor; U1 → null. */
export function regressionSlug(m: UbMovement): string | null {
  if (m.tier === "U1") return null;
  if (m.tier === "U2") return U1_ANCHOR[m.plane];
  const bridge = U2_BRIDGE[m.plane];
  return bridge === m.slug ? U1_ANCHOR[m.plane] : bridge;
}

/** Resolves the full chain down to the U1 anchor. Never empty for U2/U3. */
export function regressionChain(m: UbMovement): string[] {
  const chain: string[] = [];
  let next = regressionSlug(m);
  let guard = 0;
  while (next && guard++ < 5) {
    chain.push(next);
    const row = UB_MOVEMENTS.find((x) => (x.reuseOf ?? x.slug) === next || x.slug === next);
    next = row ? regressionSlug(row) : null;
  }
  return chain;
}

export function effectiveSlug(m: UbMovement): string {
  return m.reuseOf ?? m.slug;
}
