/** Optional game facts stay missing until the logger explicitly enters them. */
const BALL_IN_PLAY_RESULTS = new Set(["1B", "2B", "3B", "HR", "GO", "FO", "LO", "E"]);
export function quickAtBatPayload(inning: number, result: string, direction: string | null) {
  return { inning, result, exit_direction: BALL_IN_PLAY_RESULTS.has(result) ? direction : null };
}

export function pitchEntryPayload(
  fields: Record<string, unknown>,
  perspective: "pitcher" | "hitter",
  location: { zone: number | null; outZone?: string | null },
) {
  const optional = ["inning", "pitch_no", "count_balls", "count_strikes", "pitch_velo"];
  const payload: Record<string, unknown> = { ...fields, perspective };
  for (const key of optional) {
    payload[key] = fields[key] === "" || fields[key] == null ? null : Number(fields[key]);
  }
  for (const key of ["pitch_type", "result", "pitcher_arm_slot", "pitcher_throws", "batter_handedness", "opponent_hitter_name", "notes"]) {
    payload[key] = fields[key] || null;
  }
  payload.location = location.zone != null || location.outZone ? location : null;
  return payload;
}