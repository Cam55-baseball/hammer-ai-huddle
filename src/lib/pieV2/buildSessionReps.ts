/**
 * PIE V2 — capture-surface adapter.
 *
 * Converts the optional `PitchingV2MicroInput` panel payload (a single
 * collapsed view of the scored signals across the session) into a
 * canonical `PieV2RepInput[]` for `finalizePieV2Session`.
 *
 * The panel is intentionally a single "session-level" rep: it captures
 * one observation per signal per session. Missingness is preserved
 * exactly — undefined fields stay undefined.
 *
 * Subordinate to PIE V2 missingness doctrine: nothing is imputed.
 */
import type { PieV2RepInput } from "./types";

export type PitchingV2MicroInputValue = Partial<
  Pick<
    PieV2RepInput,
    | "energy_angle_deg"
    | "eyes_on_target"
    | "shoulders_closed_to_footstrike"
    | "leg_lift_to_footstrike_sec"
    | "stride_pct_body_height"
    | "head_vertical_drop_pct"
    | "hips_fired_toward_target"
    | "glove_inside_frame"
    | "head_offset_from_belly_line_deg"
    | "shoulder_horizontal_offset_deg"
    | "rear_foot_drag_foot_lengths"
    | "rear_foot_drag_direction_clean"
    | "release_extension_ft"
    | "arm_slot_deg"
    | "athlete_reported_pain"
  >
>;

export function hasAnyPieV2Field(v: PitchingV2MicroInputValue | undefined): boolean {
  if (!v) return false;
  return Object.values(v).some((x) => x !== undefined && x !== null);
}

export function buildSessionRepsFromMicroInput(args: {
  session_id: string;
  athlete_id: string;
  occurred_at?: string;
  value: PitchingV2MicroInputValue;
}): PieV2RepInput[] {
  if (!hasAnyPieV2Field(args.value)) return [];
  const occurred_at = args.occurred_at ?? new Date().toISOString();
  const rep: PieV2RepInput = {
    rep_id: `${args.session_id}-pieV2-microinput`,
    session_id: args.session_id,
    athlete_id: args.athlete_id,
    occurred_at,
    provenance: "manual",
    ...args.value,
  };
  return [rep];
}
