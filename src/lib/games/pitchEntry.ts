/** Optional game facts stay missing until the logger explicitly enters them. */
const BALL_IN_PLAY_RESULTS = new Set(["1B", "2B", "3B", "HR", "GO", "FO", "LO", "E"]);
export function quickAtBatPayload(inning: number, result: string, direction: string | null) {
  return { inning, result, exit_direction: BALL_IN_PLAY_RESULTS.has(result) ? direction : null };
}

export function pitchEntryPayload(
  fields: Record<string, unknown>,
  perspective: "pitcher" | "hitter",
  location: { zone: number | null; outZone?: string | null },
  intent?: { zone: number | null; outZone?: string | null },
) {
  const optional = ["inning", "pitch_no", "count_balls", "count_strikes", "pitch_velo"];
  const payload: Record<string, unknown> = { ...fields, perspective };
  for (const key of optional) {
    const raw = fields[key];
    const number = typeof raw === "number" || (typeof raw === "string" && raw.trim() !== "") ? Number(raw) : NaN;
    payload[key] = Number.isFinite(number) ? number : null;
  }
  for (const key of ["pitch_type", "result", "pitcher_arm_slot", "pitcher_throws", "batter_handedness", "opponent_hitter_name", "notes"]) {
    payload[key] = fields[key] || null;
  }
  payload.location = location.zone != null || location.outZone ? location : null;
  const opportunity=Number(fields.batter_opportunity);
  payload.batter_opportunity=perspective==='pitcher'&&Number.isSafeInteger(opportunity)&&opportunity>0?opportunity:null;
  payload.batter_result=perspective==='pitcher'&&['K','BB','HBP','HR','out','hit','error','sacrifice','interference'].includes(String(fields.batter_result))?fields.batter_result:null;
  const inPlay = perspective === "pitcher" && ["in_play", "bunt_in_play"].includes(String(fields.result));
  payload.contact_quality = inPlay && ["weak", "medium", "hard", "barrel", "mishit"].includes(String(fields.contact)) ? fields.contact : null;
  payload.spray_bucket = inPlay && ["pull_air", "pull_ground", "center_air", "center_ground", "oppo_air", "oppo_ground"].includes(String(fields.spray)) ? fields.spray : null;
  payload.hard_hit = inPlay && typeof fields.hard_hit === "boolean" ? fields.hard_hit : null;
  payload.intent_location = perspective === "pitcher" && intent && (intent.zone != null || intent.outZone) ? intent : null;
  const bunt = perspective === 'hitter' && ['bunt_foul','bunt_in_play'].includes(String(fields.result));
  payload.bunt_type = bunt && ['squeeze','sac_3b','sac_1b','drag','push','hit'].includes(String(fields.bunt_type)) ? fields.bunt_type : null;
  payload.bunt_side = bunt && ['R','L'].includes(String(fields.bunt_side)) ? fields.bunt_side : null;
  payload.bunt_success = bunt && typeof fields.bunt_success === 'boolean' ? fields.bunt_success : null;
  delete payload.contact;
  delete payload.spray;
  return payload;
}