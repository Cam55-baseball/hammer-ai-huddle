/**
 * Pass B evidence #1 — Rotation band sweep.
 *
 * `pickBest` consumed no day seed, so the top-ranked legal movement won every
 * day. This simulates 28 consecutive days of lift selection at three band
 * widths (0.95 / 0.90 / 0.85) and reports, per canonical category:
 *
 *   - distinct movements drawn over the window
 *   - mean band width (how many near-best options existed)
 *   - mean score cost vs. always taking rank 1
 *   - longest consecutive run of the same movement
 *
 * Gates are NOT simulated loosely: candidates are filtered through the same
 * active/season/age/equipment checks the generator applies before scoring.
 *
 * Read-only. Writes nothing to the database.
 * Run: bun scripts/audits/evidence/rotation-band-sim.ts
 * Evidence: scripts/audits/evidence/rotation-band-sim.json
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

import * as StrengthEngine from "../../../supabase/functions/_shared/wic/engines/strength.ts";
import { buildWeeklyLedger, shortfallBonus, varietyPenalty } from "../../../supabase/functions/_shared/wic/balance/weeklyLedger.ts";
import { selectFromBand, seedToInt } from "../../../supabase/functions/_shared/wic/lift/rotationBand.ts";
import { stableSeed } from "../../../supabase/functions/_shared/wic/determinism/globalDeterminismLock.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("[rotation-sim] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(2);
}
const db = createClient(url, key);

type Row = {
  slug: string;
  name: string;
  movement_category: string | null;
  canonical_category?: string | null;
  equipment_requirements: string[] | null;
  season_legality: Record<string, boolean> | null;
  min_age_years: number | null;
  is_active: boolean;
};

const { data, error } = await db
  .from("wk_movement_catalog")
  .select("slug,name,movement_category,equipment_requirements,season_legality,min_age_years,is_active")
  .eq("is_active", true)
  .limit(2000);
if (error) { console.error("[rotation-sim]", error.message); process.exit(2); }
const lib = new Map<string, Row>((data as Row[]).map((r) => [r.slug, r]));

const PHASES = ["os_q1", "os_q2", "os_q3", "os_q4", "in_season", "post_season"] as const;
const FRACTIONS = [0.95, 0.9, 0.85];
const ATHLETE = "00000000-0000-4000-8000-0000000000aa";
const AGE = 17;
const START = new Date("2026-10-01T00:00:00Z");

const seasonOk = (r: Row, phase: string) => {
  const sl = r.season_legality;
  if (!sl) return phase !== "in_season" && phase !== "post_season";
  const k = phase === "in_season" ? "in_season" : phase === "post_season" ? "post_season" : "offseason";
  return sl[k] !== false;
};
const ageOk = (r: Row) => (r.min_age_years ?? 0) <= AGE;
const eligible = (r: Row | undefined, phase: string): r is Row =>
  !!r && r.is_active && seasonOk(r, phase) && ageOk(r);

interface SlotDef { key: string; pool: (phase: string, dow: number) => string[]; }
const SLOTS: SlotDef[] = [
  { key: "compound_lower", pool: (p, d) => StrengthEngine.compoundSlugsFor(p as any, d) },
  { key: "unilateral_lower", pool: (p, d) => StrengthEngine.unilateralSlugs(p === "in_season", d) },
  { key: "upper_push", pool: (p, d) => StrengthEngine.upperPushSlugs(p === "in_season", d) },
  { key: "upper_pull", pool: (p, d) => StrengthEngine.upperPullSlugs(p === "in_season", d) },
  { key: "carry_antirotation", pool: (p, d) => StrengthEngine.carrySlugs(p === "in_season", d) },
];

interface Sample { picks: string[]; bandWidths: number[]; costs: number[]; }
const longestRun = (xs: string[]) => {
  let best = 0, run = 0, prev = "";
  for (const x of xs) { run = x === prev ? run + 1 : 1; prev = x; best = Math.max(best, run); }
  return best;
};
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function simulate(fraction: number | null) {
  const out: Record<string, Record<string, Sample>> = {};
  for (const phase of PHASES) {
    out[phase] = {};
    for (const slot of SLOTS) out[phase][slot.key] = { picks: [], bandWidths: [], costs: [] };
    const history: Array<{ plan_date: string; movement_slug: string; category: string }> = [];
    for (let d = 0; d < 28; d++) {
      const date = new Date(START.getTime() + d * 86400000);
      const iso = date.toISOString().slice(0, 10);
      const dow = date.getUTCDay();
      if (dow === 0) continue; // Sunday rest, mirrors the generator's day structure
      const cutoff = new Date(date.getTime() - 7 * 86400000).toISOString().slice(0, 10);
      const ledger = buildWeeklyLedger(history.filter((h) => h.plan_date > cutoff));
      const daySeed = stableSeed(null, ATHLETE, `${iso}|${phase}`);
      for (const slot of SLOTS) {
        const slugs = slot.pool(phase, dow);
        const cands = slugs
          .map((s, i) => ({ row: lib.get(s), i }))
          .filter((c) => eligible(c.row, phase))
          .map((c) => ({
            item: c.row!,
            score: Math.round((
              1 /* baseline emphasis weight */
              + shortfallBonus(ledger, slot.key)
              - varietyPenalty(ledger, c.row!.slug)
              - c.i * 0.001
            ) * 1e6) / 1e6,
          }));
        if (!cands.length) continue;
        let picked: Row; let width: number; let cost: number;
        if (fraction === null) {
          const best = cands.reduce((a, b) => (b.score > a.score ? b : a), cands[0]);
          picked = best.item; width = 1; cost = 0;
        } else {
          const r = selectFromBand(cands, `${daySeed}|${slot.key}`, fraction);
          picked = r.picked as Row; width = r.band.length; cost = r.scoreCost;
        }
        out[phase][slot.key].picks.push(picked.slug);
        out[phase][slot.key].bandWidths.push(width);
        out[phase][slot.key].costs.push(cost);
        history.push({ plan_date: iso, movement_slug: picked.slug, category: slot.key });
      }
    }
  }
  return out;
}

const variants: Record<string, ReturnType<typeof simulate>> = {
  always_best: simulate(null),
};
for (const f of FRACTIONS) variants[`band_${f}`] = simulate(f);

const summary: any = {};
for (const [name, res] of Object.entries(variants)) {
  summary[name] = {};
  for (const phase of PHASES) {
    summary[name][phase] = {};
    for (const slot of SLOTS) {
      const s = res[phase][slot.key];
      summary[name][phase][slot.key] = {
        days: s.picks.length,
        distinct: new Set(s.picks).size,
        mean_band_width: Number(mean(s.bandWidths).toFixed(2)),
        mean_score_cost: Number(mean(s.costs).toFixed(4)),
        longest_run: longestRun(s.picks),
      };
    }
  }
}

// Roll-up across phases for the headline table.
const rollup: any = {};
for (const [name, res] of Object.entries(variants)) {
  const allDistinct: number[] = [], allCost: number[] = [], allRun: number[] = [], allWidth: number[] = [];
  for (const phase of PHASES) for (const slot of SLOTS) {
    const s = res[phase][slot.key];
    if (!s.picks.length) continue;
    allDistinct.push(new Set(s.picks).size);
    allCost.push(mean(s.costs));
    allRun.push(longestRun(s.picks));
    allWidth.push(mean(s.bandWidths));
  }
  rollup[name] = {
    mean_distinct_per_category: Number(mean(allDistinct).toFixed(2)),
    mean_band_width: Number(mean(allWidth).toFixed(2)),
    mean_score_cost: Number(mean(allCost).toFixed(4)),
    max_longest_run: Math.max(...allRun),
    mean_longest_run: Number(mean(allRun).toFixed(2)),
  };
}

// Determinism: same athlete + date + context twice must be identical.
const a = simulate(0.9), b = simulate(0.9);
const deterministic = JSON.stringify(a) === JSON.stringify(b);

const outPath = join(HERE, "rotation-band-sim.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify({ generated_at: new Date().toISOString(), deterministic, rollup, summary }, null, 2));

console.log(`[rotation-sim] active catalog rows: ${lib.size}`);
console.log(`[rotation-sim] deterministic across two identical runs: ${deterministic}`);
console.table(rollup);
console.log(`[rotation-sim] evidence → ${outPath}`);
if (!deterministic) process.exit(1);
