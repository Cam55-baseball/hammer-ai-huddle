/** Round 8 Step 5d — pitching personal bests from the player's own logs (record only). */
export interface PitchLogRow { plan_date: string; movement_slug: string; metrics: any }
export interface PitchingBests {
  topVelo: { mph: number; date: string } | null;
  latestVelo: { mph: number; date: string } | null;
  bestStrikePct: { pct: number; pitches: number; date: string } | null;
  pitches28: number;
}
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; };

export function computePitchingBests(rows: PitchLogRow[], today: string): PitchingBests {
  const sorted = [...rows].sort((a, b) => a.plan_date.localeCompare(b.plan_date));
  let topVelo: PitchingBests["topVelo"] = null, latestVelo: PitchingBests["latestVelo"] = null;
  let bestStrikePct: PitchingBests["bestStrikePct"] = null, pitches28 = 0;
  const cutoff = new Date(new Date(today + "T12:00:00Z").getTime() - 27 * 864e5).toISOString().slice(0, 10);
  for (const r of sorted) {
    const rounds: any[] = Array.isArray(r.metrics?.rounds) ? r.metrics.rounds : [];
    const velos = [num(r.metrics?.throw_velo_mph), ...rounds.map((x) => num(x?.peak_velo))].filter((v): v is number => v != null && v < 115);
    if (velos.length) {
      const v = Math.max(...velos);
      latestVelo = { mph: v, date: r.plan_date };
      if (!topVelo || v > topVelo.mph) topVelo = { mph: v, date: r.plan_date };
    }
    const pitches = rounds.reduce((s, x) => s + (num(x?.pitches) ?? 0), 0);
    const strikes = rounds.reduce((s, x) => s + (num(x?.strikes) ?? 0), 0);
    if (r.plan_date >= cutoff && r.plan_date <= today) pitches28 += pitches;
    // Strike % only counts with at least 15 pitches and strikes ≤ pitches.
    if (pitches >= 15 && strikes <= pitches) {
      const pct = Math.round((strikes / pitches) * 100);
      if (!bestStrikePct || pct > bestStrikePct.pct) bestStrikePct = { pct, pitches, date: r.plan_date };
    }
  }
  return { topVelo, latestVelo, bestStrikePct, pitches28 };
}
