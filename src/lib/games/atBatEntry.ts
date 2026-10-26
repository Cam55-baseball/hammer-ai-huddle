import { optionalFlag } from "./fieldEntry";

/** An inning is required by the ledger; all other untouched facts remain missing. */
export function validAtBatInning(value: unknown): boolean {
  const inning = value === "" || value == null ? NaN : Number(value);
  return Number.isInteger(inning) && inning >= 1 && inning <= 30;
}

export function atBatEntryPayload(fields: Record<string, unknown>): Record<string, unknown> {
  if (!validAtBatInning(fields.inning)) throw new Error("Enter the inning (1–30).");
  if (!fields.result) throw new Error("Choose how the at-bat ended.");
  const payload = { ...fields };
  for (const key of ["inning", "count_balls", "count_strikes", "outs", "rbi", "lob", "h1_time_sec"]) {
    const value = fields[key];
    const number = value == null || (typeof value === "string" && value.trim() === "") ? NaN : Number(value);
    payload[key] = Number.isFinite(number) ? number : null;
  }
  for (const key of ["batting_side", "position_played", "contact_quality", "exit_direction", "runners_on", "opponent_pitcher_id"]) payload[key] = fields[key] || null;
  payload.is_pinch_hit = optionalFlag(fields.is_pinch_hit);
  const count=fields.pitch_count==null||fields.pitch_count===''?null:Number(fields.pitch_count);
  if(count!==null&&(!Number.isSafeInteger(count)||count<1))throw new Error('Total pitches must be a positive whole number.');
  payload.pitch_count=count;
  return payload;
}