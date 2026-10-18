/** Optional game facts stay missing until the logger explicitly enters them. */
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