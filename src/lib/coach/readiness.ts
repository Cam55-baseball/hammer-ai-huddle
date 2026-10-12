/** Pure formatters for the coach "Readiness & pain" tab. Only what the player checked in. */
export interface Checkin {
  entry_date: string;
  quiz_type: string;
  physical_readiness: number | null;
  perceived_recovery: number | null;
  hours_slept: number | null;
  pain_location: string[] | null;
  pain_scale: number | null;
  soreness_locations: string[] | null;
  sleep_quality?: number | null;
  mental_energy?: number | null;
  mood_level?: number | null;
  stress_level?: number | null;
  note?: string | null;
}

export interface CheckinDone { entry_date: string; quiz_type: string; completed_at: string }

/** Attendance only (no health contents): how many check-in days in the last n days. */
export function checkinDays(done: CheckinDone[], today: string, n: number): number {
  const end = new Date(today + "T00:00:00Z").getTime();
  const start = end - (n - 1) * 86400000;
  return new Set(done.filter((d) => { const t = new Date(d.entry_date + "T00:00:00Z").getTime(); return t >= start && t <= end; }).map((d) => d.entry_date)).size;
}

const KIND: Record<string, string> = { morning: "Morning check-in", pre_lift: "Before training", night: "Night check-in" };
export const checkinKind = (t: string) => KIND[t] ?? "Check-in";

const area = (s: string) => s.replace(/_/g, " ");

/** Labeled facts from one check-in; skips anything not answered. */
export function checkinFacts(c: Checkin): string[] {
  const out: string[] = [];
  if (c.physical_readiness != null) out.push(`Body readiness: ${c.physical_readiness}/5`);
  if (c.hours_slept != null) out.push(`Sleep: ${c.hours_slept} h`);
  if (c.sleep_quality != null) out.push(`Sleep quality: ${c.sleep_quality}/5`);
  if (c.mental_energy != null) out.push(`Energy: ${c.mental_energy}/5`);
  if (c.mood_level != null) out.push(`Mood: ${c.mood_level}/5`);
  if (c.stress_level != null) out.push(`Stress: ${c.stress_level}/5`);
  if (c.pain_location && c.pain_location.length)
    out.push(`Pain: ${c.pain_location.map(area).join(", ")}${c.pain_scale != null ? ` (rating ${c.pain_scale})` : ""}`);
  if (c.soreness_locations && c.soreness_locations.length) out.push(`Sore: ${c.soreness_locations.map(area).join(", ")}`);
  if (c.note) out.push(`Note: ${c.note}`);
  return out;
}

/** Days in the window where the player reported pain anywhere. */
export function painDays(rows: Checkin[]): number {
  return new Set(rows.filter((r) => (r.pain_location ?? []).length > 0).map((r) => r.entry_date)).size;
}
