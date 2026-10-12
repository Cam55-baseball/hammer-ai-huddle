/**
 * Lifting Blueprint proof — 8-week modeled simulation (read-only).
 * Uses the planner's own lists (engines/strength.ts), area map, opposite-pattern
 * rule, isolation gate and the catalog's age/season/eccentric legality.
 * Run: psql export of wk_movement_catalog to /tmp/catalog.json, then
 *   bun scripts/audits/blueprint-sim.ts > /tmp/blueprint-sim.json
 * Limits: models picks + fixed set counts; the live builder also reacts to
 * readiness, outings and swaps.
 */
import { readFileSync } from "node:fs";
import * as S from "../../supabase/functions/_shared/wic/engines/strength.ts";
import { AREAS, WEEKLY_MIN, isolationAllowed, isIsolation, overloadStep, robustnessAreas, robustnessPool, ROBUSTNESS_IN_SEASON_SETS, IN_SEASON_SESSION_SET_CAP, type Area } from "../../supabase/functions/_shared/wic/lift/blueprint.ts";
const ROBUST = process.env.ROBUST !== "0";
const GAMES = process.env.GAMES === "1"; // in-season games 2 days after each lift day -> freshness must block the slot
import { areasOf, oppositeLowerPool, weeklyCoverage } from "../../supabase/functions/_shared/wic/lift/areaMap.ts";

type Row = { slug: string; min_age_years: number | null; season_legality: Record<string, boolean> | null; eccentric_overload: boolean | null; active: boolean };
const cat = new Map<string, Row>((JSON.parse(readFileSync("/tmp/catalog.json", "utf8")) as Row[]).map((r) => [r.slug, r]));

const PHASES = ["os_q1", "os_q2", "os_q3", "os_q4", "in_season", "post_season"] as const;
const AGES = [13, 14, 16, 19];
const ROLES = ["pitcher", "position", "two_way"];
const SPORTS = ["baseball", "softball"];
const TRAINING = [0.5, 2.5, 5];
const GOALS = [null, "add_size"];

function legal(slug: string, age: number, phase: string): boolean {
  const r = cat.get(slug);
  if (!r || !r.active) return false;
  if ((r.min_age_years ?? 0) > age) return false;
  const inish = phase === "in_season" || phase === "post_season";
  if (inish && r.eccentric_overload) return false;
  const v = r.season_legality?.[phase];
  return typeof v === "boolean" ? v : !inish;
}

const violations: string[] = [];
let capBlocks = 0, robustRows = 0, freshnessBlocks = 0; const robustMissing: Record<string, number> = {};
let maxInSeasonSession = 0;
const results: any[] = [];
for (const role of ROLES) for (const sport of SPORTS) for (const age of AGES) for (const phase of PHASES) for (const ta of TRAINING) for (const goal of GOALS) {
  if (goal && (phase === "in_season" || phase === "post_season")) continue;
  const inS = phase === "in_season" || phase === "post_season";
  const days = inS ? [0, 3] : [0, 2, 4];
  const sets = inS ? { main: 3, second: 2, upper: 2, carry: 2, trunk: 2 } : { main: 4, second: 3, upper: 3, carry: 3, trunk: 2 };
  const weeks: Partial<Record<Area, number>>[] = [];
  const recent: Record<string, string[]> = {};
  const defaultSets = (slug: string) => Math.max(1, Math.min(4, (cat.get(slug) as any)?.default_sets ?? 2));
  const pick = (role: string, list: string[], extra: (s: string) => boolean = () => true) => {
    const ok = [...new Set(list)].filter((s) => legal(s, age, phase) && extra(s));
    const fresh = ok.filter((s) => !(recent[role] ?? []).includes(s));
    const p = fresh[0] ?? ok[0] ?? null;
    if (p) recent[role] = [p, ...(recent[role] ?? [])].slice(0, 2);
    return p;
  };
  for (let w = 0; w < 8; w++) {
    const rows: { slug: string; sets: number }[] = [];
    for (const d of days) {
      const dow = w * 7 + d;
      const iso = (s: string) => isolationAllowed(s, { phase, goalBlock: goal });
      const main = pick("main", S.compoundSlugsFor(phase as any, dow), iso);
      const uni = S.unilateralSlugs(inS, dow);
      const second = pick("second", [...oppositeLowerPool(uni, main, dow), ...uni], iso);
      const push = pick("push", S.upperPushSlugs(inS, dow), iso);
      const pull = pick("pull", S.upperPullSlugs(inS, dow), iso);
      const carry = pick("carry", S.carrySlugs(inS, dow), iso);
      const fin = inS ? null : pick("fin", S.TRUNK_FINISHER_SLUGS.filter(iso)); // builder: trunk finisher is off-season only
      const day: (readonly [string | null, number])[] = [[main, sets.main], [second, sets.second], [push, sets.upper], [pull, sets.upper], [carry, sets.carry], [fin, sets.trunk]];
      const freshBlocked = inS && GAMES; // a game 2 days later = within 48 h
      if (ROBUST && freshBlocked) freshnessBlocks++;
      if (ROBUST && !freshBlocked) {
        const used = new Set(day.map(([s]) => s));
        for (const area of robustnessAreas(phase, d, w * 7 + d)) {
          const r = pick("rob_" + area, robustnessPool(area, { phase, goalBlock: null }), (s) => iso(s) && !used.has(s));
          const sessionSets = day.reduce((a, [x, n]) => a + (x ? n : 0), 0);
          if (r && inS && sessionSets + ROBUSTNESS_IN_SEASON_SETS > IN_SEASON_SESSION_SET_CAP) { capBlocks++; continue; }
          if (r) { used.add(r); day.push([r, inS ? ROBUSTNESS_IN_SEASON_SETS : defaultSets(r)]); robustRows++; if (isIsolation(r)) violations.push(`robustness isolation ${r}`); if (cat.get(r)?.eccentric_overload && inS) violations.push(`in-season eccentric ${r}`); }
          else robustMissing[`${phase}:${area}:age${age}`] = (robustMissing[`${phase}:${area}:age${age}`] ?? 0) + 1;
        }
      }
      for (const [s, n] of day) if (s) {
        rows.push({ slug: s, sets: n });
        if (isIsolation(s) && !iso(s)) violations.push(`isolation ${s} ${phase} ${goal}`);
        if (!legal(s, age, phase)) violations.push(`illegal ${s} age ${age} ${phase}`);
      }
      const total = day.reduce((a, [x, n]) => a + (x ? n : 0), 0);
      if (inS) maxInSeasonSession = Math.max(maxInSeasonSession, total);
      if (inS && total > 13) violations.push(`in-season session volume ${total}`);
      if (inS && days.length > 2) violations.push("in-season lift days > 2");
    }
    weeks.push(weeklyCoverage(rows));
  }
  const avg = Object.fromEntries(AREAS.map((a) => [a, +(weeks.reduce((x, wk) => x + (wk[a] ?? 0), 0) / 8).toFixed(1)]));
  const min = WEEKLY_MIN[inS ? "in" : "off"];
  const gaps = AREAS.filter((a) => (avg[a] as number) < min[a]);
  results.push({ role, sport, age, phase, ta, goal, liftDays: days.length, avg, gaps });
  if (process.env.DUMP) for (const g of gaps) console.error(`${phase}|age${age}|${g}|${avg[g]}/${min[g]}`);
}

// Overload property check: a load step only ever follows a qualifying log.
let overloadBad = 0, loadSteps = 0;
for (let i = 0; i < 20000; i++) {
  const r = (n: number) => Math.floor(Math.random() * n);
  const inp = { region: (r(2) ? "lower" : "upper") as "lower" | "upper", verifiedMax: r(4) ? 50 + r(400) : null, repRange: [3, 5] as [number, number], currentReps: 2 + r(4), loggedAllReps: !!r(2), effort: 5 + r(5), targetEffort: 8, quality: 1 + r(5) };
  const s = overloadStep(inp);
  if (s.kind === "load") { loadSteps++; if (!(inp.loggedAllReps && inp.effort <= inp.targetEffort && inp.quality >= 4 && inp.verifiedMax && inp.currentReps >= 5)) overloadBad++; }
}

const gapCount: Record<string, number> = {};
for (const r of results) for (const g of r.gaps) gapCount[`${r.phase === "in_season" || r.phase === "post_season" ? "in" : "off"}:${g}`] = (gapCount[`${r.phase === "in_season" || r.phase === "post_season" ? "in" : "off"}:${g}`] ?? 0) + 1;
const byAge: Record<string, Record<string, number>> = {};
for (const age of AGES) { const rs = results.filter((r) => r.age === age); byAge[age] = Object.fromEntries(AREAS.map((a) => [a, +(rs.reduce((x, r) => x + r.avg[a], 0) / rs.length).toFixed(1)])); }
const byPhase: Record<string, Record<string, number>> = {};
for (const p of PHASES) { const rs = results.filter((r) => r.phase === p); byPhase[p] = Object.fromEntries(AREAS.map((a) => [a, +(rs.reduce((x, r) => x + r.avg[a], 0) / rs.length).toFixed(1)])); }
console.log(JSON.stringify({ robust: ROBUST, games: GAMES, robustRows, capBlocks, freshnessBlocks, robustMissing, maxInSeasonSession, combos: results.length, violations: violations.length, violationSamples: violations.slice(0, 10), overload: { loadSteps, overloadBad }, gapCount, byAge, byPhase, unused: areasOf("x") }, null, 1));
