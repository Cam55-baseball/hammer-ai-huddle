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
}

const KIND: Record<string, string> = { morning: "Morning check-in", pre_lift: "Before training", night: "Night check-in" };
export const checkinKind = (t: string) => KIND[t] ?? "Check-in";

const area = (s: string) => s.replace(/_/g, " ");

/** Labeled facts from one check-in; skips anything not answered. */
export function checkinFacts(c: Checkin): string[] {
  const out: string[] = [];
  if (c.physical_readiness != null) out.push(`Body readiness: ${c.physical_readiness}/5`);
  if (c.hours_slept != null) out.push(`Sleep: ${c.hours_slept} h`);
  if (c.pain_location && c.pain_location.length)
    out.push(`Pain: ${c.pain_location.map(area).join(", ")}${c.pain_scale != null ? ` (rating ${c.pain_scale})` : ""}`);
  if (c.soreness_locations && c.soreness_locations.length) out.push(`Sore: ${c.soreness_locations.map(area).join(", ")}`);
  return out;
}

/** Days in the window where the player reported pain anywhere. */
export function painDays(rows: Checkin[]): number {
  return new Set(rows.filter((r) => (r.pain_location ?? []).length > 0).map((r) => r.entry_date)).size;
}
