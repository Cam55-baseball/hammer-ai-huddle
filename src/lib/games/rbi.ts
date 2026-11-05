/**
 * RBI rules for player game logging (owner decision Nov 5 2026).
 * - Single/double/triple: RBIs = how many runners scored on the hit (never more than were on base).
 * - Home run: 1 for the batter + every runner on base.
 * - Sac fly: runners who scored (at least 1 when someone was on base).
 * - Walk / intentional walk / hit by pitch: 1 only when the bases were loaded.
 * - Anything else: no automatic RBI (the manual number is kept).
 */
export type Base = 1 | 2 | 3;

export const HIT_RESULTS = new Set(["1B", "2B", "3B"]);
export const FREE_PASS_RESULTS = new Set(["BB", "IBB", "HBP"]);

/** Results that ask "Anyone on base?". */
export function asksRunners(result: string | null | undefined): boolean {
  const r = (result ?? "").toUpperCase();
  return HIT_RESULTS.has(r) || r === "HR" || r === "SF" || FREE_PASS_RESULTS.has(r);
}

/** Results that ask "How many scored on this hit?". */
export function asksScored(result: string | null | undefined): boolean {
  const r = (result ?? "").toUpperCase();
  return HIT_RESULTS.has(r) || r === "SF";
}

export function parseRunners(value: string | null | undefined): Base[] {
  const v = (value ?? "").toLowerCase();
  if (!v || v === "none") return [];
  const out = new Set<Base>();
  for (const ch of v) if (ch === "1" || ch === "2" || ch === "3") out.add(Number(ch) as Base);
  return [...out].sort() as Base[];
}

export function formatRunners(bases: Base[]): string {
  return bases.length ? [...new Set(bases)].sort().join(",") : "none";
}

/** Returns the RBIs for one plate appearance, or null when the result has no automatic RBI rule. */
export function rbiForAtBat(result: string | null | undefined, runners: Base[], scored?: number | null): number | null {
  const r = (result ?? "").toUpperCase();
  const on = new Set(runners).size;
  if (r === "HR") return 1 + on;
  if (FREE_PASS_RESULTS.has(r)) return on === 3 ? 1 : 0;
  if (HIT_RESULTS.has(r) || r === "SF") {
    const n = Math.max(0, Math.min(on, Math.floor(Number(scored ?? 0)) || 0));
    if (r === "SF" && on > 0) return Math.max(1, n);
    return n;
  }
  return null;
}
