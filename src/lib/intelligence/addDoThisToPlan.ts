/** Dates tried for "Add to today's work": today first, then the next six days. */
export function candidatePlanDates(today: Date, days = 7): string[] {
  const out: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() + i));
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export type AddAttempt = { saved?: boolean; warnings?: unknown[]; error?: string };

/**
 * Tries each date in order through the server's same-category safety save.
 * Stops at the first saved date or the first date that needs a warning answer.
 * Dates the server refuses (no matching session that day) move on to the next.
 */
export async function addToNextAppropriateSession(
  dates: string[],
  attempt: (date: string) => Promise<AddAttempt>,
): Promise<{ date: string | null; result: AddAttempt }> {
  let last: AddAttempt = { error: "No upcoming session of this kind. Nothing was saved." };
  let firstRefusal: AddAttempt | undefined;
  for (const date of dates) {
    const r = await attempt(date);
    if (r.saved === true || (r.warnings && r.warnings.length)) return { date, result: r };
    if (!firstRefusal && r.error) firstRefusal = r;
    last = r;
  }
  // Later date-gate errors must not conceal today's actual safety refusal.
  return { date: null, result: firstRefusal ?? last };
}

import { ELITE_DRILL_CATALOG, type EliteDrill } from "@/data/drills/eliteDrillCatalog";

const STOP = new Set(["drill", "drills", "the", "and", "with", "your", "a", "of", "to", "for", "in", "on", "sets", "reps", "rep", "set", "repetitions", "each", "side"]);
const words = (s: string) => new Set(s.toLowerCase().replace(/[^a-z\s-]/g, " ").split(/[\s-]+/).filter(w => w.length > 2 && !STOP.has(w)).map(w => w.replace(/s$/, "")));

/**
 * A "Do this" drill that is not itself a catalog drill is matched to a catalog
 * drill of the SAME category and sport by its tags (sub-skill, movement
 * patterns, fault keys, name and what it fixes). At least two shared tag words
 * are required; otherwise null and the button stays hidden (never faked).
 * The server still confirms the drill is linked to the original clip.
 */
export function matchCatalogDrill(drill: { id?: string | null; title?: string | null; purpose?: string | null; cue?: string | null; steps?: string[] } | null | undefined, area: string, sport: "baseball" | "softball", catalog: readonly EliteDrill[] = ELITE_DRILL_CATALOG): EliteDrill | null {
  const category = area.toLowerCase();
  const pool = catalog.filter(d => d.category === category && d.sports.includes(sport));
  if (drill?.id) { const exact = pool.find(d => d.id === drill.id); if (exact) return exact; }
  const src = words([drill?.title, drill?.purpose, drill?.cue, ...(drill?.steps ?? [])].filter(Boolean).join(" "));
  if (!src.size) return null;
  let best: EliteDrill | null = null; let bestScore = 0;
  for (const d of pool) {
    const tags = words([d.name, d.subSkill, d.fixes, ...d.movementPatterns, ...d.violationKeys.map(k => k.replace(/_/g, " "))].join(" "));
    let score = 0; for (const w of src) if (tags.has(w)) score++;
    if (score > bestScore) { best = d; bestScore = score; }
  }
  return bestScore >= 2 ? best : null;
}
