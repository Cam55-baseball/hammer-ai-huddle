/** Shared extraction of the generator's existing check-in reductions. */
export interface CheckInValues { sleep_hours?: number; cns_readiness?: number; soreness?: number; fatigue?: number; }
export interface Reduction { reason: string; detail: string; }
export function latestCheckInValues(events: readonly { topic_id: string; payload?: Record<string, unknown> | null }[]): CheckInValues | null {
  const out: CheckInValues = {};
  for (const event of events) {
    const key = event.topic_id === "behavioral.readiness" ? "cns_readiness" : event.topic_id === "behavioral.sleep" ? "sleep_hours" : event.topic_id === "behavioral.soreness" ? "soreness" : event.topic_id === "behavioral.fatigue" ? "fatigue" : null;
    const raw = event.payload?.[key === "sleep_hours" ? "hours" : "score"];
    if (!key || out[key] != null || raw == null) continue;
    const value = Number(raw);
    if (Number.isFinite(value)) out[key] = value;
  }
  return Object.keys(out).length ? out : null;
}
export function checkInReductions(baseCap: number, values: CheckInValues | null, dayIntent: "rest" | "skip" | "push" | null = null) {
  const sleep = Number(values?.sleep_hours ?? 7);
  const cnsReadiness = Number(values?.cns_readiness ?? 7);
  const soreness = Number(values?.soreness ?? 3);
  const reductions: Reduction[] = [];
  let cnsCap = baseCap;
  if (sleep < 6) { reductions.push({ reason: "sleep", detail: `Only ${sleep}h sleep — high-CNS work reduced.` }); cnsCap = Math.max(1, cnsCap - 1); }
  if (cnsReadiness <= 4) { reductions.push({ reason: "cns", detail: `Self-reported CNS readiness ${cnsReadiness}/10 — capping CNS units.` }); cnsCap = Math.max(1, cnsCap - 1); }
  if (soreness >= 8) reductions.push({ reason: "soreness", detail: `Reported soreness ${soreness}/10 — substituting regressions where possible.` });
  const dayIntentApplied = dayIntent === "rest";
  if (dayIntentApplied) {
    if (!reductions.some(r => r.reason === "sleep" || r.reason === "cns")) cnsCap = Math.max(1, cnsCap - 1);
    reductions.push({ reason: "day_intent", detail: "You chose an easier day in your check-in, so the hard work is dialled back." });
  }
  return { cnsCap, reductions, sleep, cnsReadiness, soreness, dayIntentApplied };
}