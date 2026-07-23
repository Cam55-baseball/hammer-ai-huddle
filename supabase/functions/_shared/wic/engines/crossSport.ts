// Phase 10 — Cross-Sport engine slug pools.
//
// Weightless Object Sport Training (WOST) — hand-eye, rhythm, and CNS
// coordination patterning without load. Prioritized for game-day early
// activation and offseason back-end cross-sport slots.

// Legacy primer list kept for fallback compatibility.
export const GAME_DAY_PRIMER_SLUGS = ["contralateral_cross_crawl", "frc_cars_full_body", "fp_arm_line_spiral"];

// Game-day early activation: low-impact WOST + gentle coordination primers.
// These carry zero CNS cost and are legal on every day type.
export const CROSS_SPORT_LOW_IMPACT_PREFERRED: string[] = [
  "wost_balloon_keepup_partner",
  "wost_scarf_partner_volley",
  "wost_tennis_ball_wall_react",
  "wost_beanbag_balance_walk",
  "wost_shuttle_tap_up",
  "wost_light_bat_shadow_tap",
];

// Offseason back-end cross-sport: full coordination catalog.
// Youth/beginner lifecycles benefit most; still legal for all ages.
export const CROSS_SPORT_COORDINATION_PREFERRED: string[] = [
  "wost_tennis_ball_self_rally",
  "wost_tennis_ball_cross_body",
  "wost_tennis_ball_clap_catch",
  "wost_tennis_ball_one_hand_catch",
  "wost_scarf_juggle_2",
  "wost_scarf_juggle_3",
  "wost_scarf_cross_body_catch",
  "wost_scarf_one_hand_snatch",
  "wost_balloon_keep_up",
  "wost_balloon_hand_switch",
  "wost_beanbag_toss_catch",
  "wost_beanbag_foot_flip",
  "wost_reaction_drop_catch",
  "wost_coin_finger_roll",
  "wost_rhythm_ball_tap",
  "wost_mini_frisbee_toss",
  "wost_mini_frisbee_roll_catch",
  "wost_mirror_me_ball_toss",
  "wost_partner_alt_rapid_catch",
  // Legacy fallbacks so the selector never runs empty.
  "cross_sport_basketball",
  "cross_sport_bike",
  "cross_sport_soccer",
  "cross_sport_swim",
];
