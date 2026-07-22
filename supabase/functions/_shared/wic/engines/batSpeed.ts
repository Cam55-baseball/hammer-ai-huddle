// WIC Bat-Speed Engine — owns the rotational-power pool.
// Preferred slugs are surfaced first when the certifier resolves a template.
// Ordering is intentional: elastic_rotation & hip-sequencing primers seed
// P1/P2/P4 mechanics, then overload/underload contrast, then med-ball power,
// then PAP complexes. Beginners are protected by season/training-age gates
// on each slug (see wk_movement_catalog seed).
export const BAT_SPEED_PREFERRED = [
  // Hip / pelvis sequencing (P1/P2/P4 — Arakawa / OnBaseU)
  "bs_cable_hip_snap",
  "bs_banded_pelvic_dissoc",
  "bs_hip_contrast_swings",
  "bs_hip_assisted_swings",
  "bs_hip_resisted_swings",
  "band_resisted_swings",
  "cable_chops",
  // Overload / underload contrast (Driveline / DeRenne)
  "bs_contrast_swing_ladder",
  "bs_knob_loaded_swings",
  "bs_pvc_overspeed_swings",
  "bs_underload_composite_tee",
  "bs_bamboo_overload_tee",
  "bs_donut_ring_dry_swings",
  "bs_bat_speed_radar_intent_set",
  // Med-ball rotational power (Cressey / USATF throws)
  "bs_mb_side_wall_toss",
  "bs_mb_shotput_switch",
  "bs_mb_rebounder_rapid",
  "bs_mb_lateral_bound_toss",
  "med_ball_shot_put",
  // PAP / French contrast (Verkhoshansky / Cal Dietz)
  "bs_trapbar_jump_to_swing",
  "bs_french_contrast_swing",
  "bs_hip_thrust_to_mb_throw",
  "bs_cable_chop_to_swing",
  // Rotational strength & anti-rotation base
  "bs_landmine_rot_press",
  "bs_pallof_iso_hold",
  "bs_half_kneel_chop",
  "bs_half_kneel_lift",
];
