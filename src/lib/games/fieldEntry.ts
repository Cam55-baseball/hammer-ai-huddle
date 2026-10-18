/** Optional logger facts remain unknown until the logger explicitly enters them. */
export function optionalFlag(value: unknown): boolean | null {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return null;
}

function optionalNumber(value: unknown): number | null {
  if (value === "" || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function defenseEntryPayload(f: Record<string, any>): Record<string, any> {
  const payload = { ...f };
  for (const key of ["inning", "time_to_first_sec", "pop_time_sec", "arm_velo"]) payload[key] = optionalNumber(f[key]);
  for (const key of ["error_flag", "assist", "putout"]) payload[key] = optionalFlag(f[key]);
  for (const key of ["throwing_side", "play_type", "shift", "result", "spray_direction", "batted_ball_type"]) payload[key] = f[key] || null;
  if (typeof f.result === "string" && /^e\s*-?\s*[1-9]$/i.test(f.result.trim())) payload.error_flag = true;
  const extras: string[] = [];
  if (f.throw_base) extras.push(`throw→${f.throw_base}`);
  if (f.route_quality) extras.push(`route:${f.route_quality}`);
  if (f.infield_rep_type) extras.push(`rep:${f.infield_rep_type}`);
  if (f.blocked === true) extras.push("blocked");
  if (extras.length) payload.notes = [f.notes, `[${extras.join(" · ")}]`].filter(Boolean).join(" ");
  for (const key of ["throw_base", "route_quality", "infield_rep_type", "blocked"]) delete payload[key];
  return payload;
}

export function baserunEntryPayload(f: Record<string, any>): Record<string, any> {
  const payload = { ...f };
  for (const key of ["inning", "base_from", "base_to", "lead_steps", "pitcher_time_to_home_sec", "catcher_pop_time_sec", "run_time_sec"]) payload[key] = optionalNumber(f[key]);
  for (const key of ["success", "is_pinch_run"]) payload[key] = optionalFlag(f[key]);
  for (const key of ["pitcher_arm_side", "pitch_type_ran_on"]) payload[key] = f[key] || null;
  return payload;
}