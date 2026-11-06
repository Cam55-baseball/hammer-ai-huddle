/**
 * Owner Nov 5 (late): coach "Check-ins & readiness". Pure helpers over coach_athlete_checkins_28
 * (health-shared players only). Body readiness is the player's own 1–5 answer.
 */
export type ReadinessColor = "good" | "okay" | "low" | "none";
export const readinessColor = (r: number | null | undefined): ReadinessColor =>
  r == null || !Number.isFinite(Number(r)) ? "none" : Number(r) >= 4 ? "good" : Number(r) >= 3 ? "okay" : "low";
export const COLOR_LABEL: Record<ReadinessColor, string> = { good: "Good", okay: "Okay", low: "Low", none: "No answer" };

export interface CheckinRow {
  entry_date: string; readiness?: number | null; hours_slept?: number | null; sleep_quality?: number | null; energy?: number | null;
  soreness_locations?: string[] | null; pain_location?: string[] | null; pain_scale?: number | null; pain_scales?: Record<string, number> | null;
}
export interface DailyLogRow { entry_date: string; injury_mode?: boolean | null; injury_body_region?: string | null }
export interface LoadRow { plan_date: string; items: number }

const shift = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
export const lastDays = (today: string, n: number) => Array.from({ length: n }, (_, i) => shift(today, -(n - 1 - i)));

/** One point per day (latest readiness that day, null when none). */
export function readinessSeries(rows: readonly CheckinRow[], today: string, n: 14 | 28) {
  const byDay = new Map<string, number>();
  for (const r of rows) if (r.readiness != null && !byDay.has(r.entry_date)) byDay.set(r.entry_date, Number(r.readiness));
  return lastDays(today, n).map((d) => { const v = byDay.get(d) ?? null; return { date: d, readiness: v, color: readinessColor(v) }; });
}

export function missedDays(rows: readonly CheckinRow[], today: string, n: number): string[] {
  const have = new Set(rows.map((r) => r.entry_date));
  return lastDays(today, n).filter((d) => !have.has(d));
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function readinessMeaning(series: { readiness: number | null }[]): string {
  const vals = series.map((s) => s.readiness).filter((v): v is number => v != null);
  if (vals.length < 3) return "Not enough check-ins yet to see a pattern.";
  const recent = avg(vals.slice(-3))!, all = avg(vals)!;
  const c = readinessColor(Math.round(recent));
  if (c === "low") return "The player has felt run-down lately. Their plan lightens on low days; a quick talk can help.";
  if (recent < all - 0.5) return "Readiness is dropping compared with their usual. Worth keeping an eye on.";
  if (recent > all + 0.5) return "Readiness is climbing compared with their usual.";
  return c === "good" ? "The player has been feeling ready to train." : "Readiness is steady, in the okay range.";
}

export function missedMeaning(missed: number, n: number): string {
  if (missed === 0) return `Checked in every day for the last ${n} days.`;
  if (missed / n > 0.5) return `Missed more than half of the last ${n} days. Without check-ins the plan can't adjust to how they feel.`;
  return `Missed ${missed} of the last ${n} days.`;
}

/** Plain facts for one day's check-in (only what the player answered). */
export function checkinLine(r: CheckinRow): string[] {
  const out: string[] = [];
  if (r.readiness != null) out.push(`Body readiness ${r.readiness}/5 (${COLOR_LABEL[readinessColor(r.readiness)]})`);
  if (r.hours_slept != null) out.push(`Sleep ${r.hours_slept} h${r.sleep_quality != null ? `, quality ${r.sleep_quality}/5` : ""}`);
  if (r.energy != null) out.push(`Energy ${r.energy}/5`);
  if (r.soreness_locations?.length) out.push(`Sore: ${r.soreness_locations.map(pretty).join(", ")}`);
  if (r.pain_location?.length) out.push(`Pain flag: ${r.pain_location.map(pretty).join(", ")}${r.pain_scale != null ? ` (${r.pain_scale}/10)` : ""}`);
  return out;
}
export const pretty = (s: string) => String(s).replace(/_/g, " ");
export const ARM_AREAS = /shoulder|elbow|arm|forearm|wrist|bicep|tricep/i;
export function armFeel(r: CheckinRow): string | null {
  const arm = (r.pain_location ?? []).filter((a) => ARM_AREAS.test(a));
  const sore = (r.soreness_locations ?? []).filter((a) => ARM_AREAS.test(a));
  if (arm.length) return `Arm pain: ${arm.map(pretty).join(", ")}`;
  if (sore.length) return `Arm sore: ${sore.map(pretty).join(", ")}`;
  return r.readiness != null ? "Arm: no pain or soreness reported" : null;
}

/** Injury progress: per pain area, the pain numbers over time (oldest → newest) and direction. */
export function injuryLines(rows: readonly CheckinRow[], logs: readonly DailyLogRow[]) {
  const areas = new Map<string, { date: string; pain: number }[]>();
  for (const r of [...rows].reverse()) {
    for (const a of r.pain_location ?? []) {
      const p = Number(r.pain_scales?.[a] ?? r.pain_scale);
      if (Number.isFinite(p)) (areas.get(a) ?? areas.set(a, []).get(a)!).push({ date: r.entry_date, pain: p });
    }
  }
  for (const l of logs) if (l.injury_mode && l.injury_body_region && !areas.has(l.injury_body_region)) areas.set(l.injury_body_region, []);
  return [...areas.entries()].map(([area, pts]) => {
    const first = pts[0]?.pain, last = pts[pts.length - 1]?.pain;
    const meaning = pts.length < 2 ? "Not enough pain answers yet to see a trend."
      : last! < first! ? `Pain is going down (${first} → ${last} out of 10). Getting better.`
      : last! > first! ? `Pain is going up (${first} → ${last} out of 10). Their plan protects this area; check in with them.`
      : `Pain is about the same (${last} out of 10).`;
    return { area: pretty(area), points: pts, meaning };
  });
}

/** Recent training load: logged work items last 7 days vs their 28-day weekly average. */
export function loadLevel(load: readonly LoadRow[], today: string) {
  const last7 = new Set(lastDays(today, 7));
  const week = load.filter((l) => last7.has(l.plan_date)).reduce((n, l) => n + l.items, 0);
  const month = load.reduce((n, l) => n + l.items, 0);
  const usual = month / 4;
  const level: "high" | "usual" | "light" | "none" = month === 0 ? "none" : week > usual * 1.3 ? "high" : week < usual * 0.7 ? "light" : "usual";
  const meaning = level === "none" ? "No logged training in the last 28 days."
    : level === "high" ? "Training load is higher than usual this week, so the body is paying more. The plan adds recovery when needed."
    : level === "light" ? "Training load is lighter than usual this week."
    : "Training load is about their usual.";
  return { week, usualPerWeek: Math.round(usual), level, meaning };
}
