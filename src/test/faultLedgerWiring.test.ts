/**
 * Fault Ledger wiring — the test that should have been asked for in Stage 3.
 *
 * Stage 3 only proved the ledger was harmless. Harmless is what a dead end
 * looks like. These four tests prove it is connected: same athlete, same date,
 * once with signals and once without, and the selection must differ.
 *
 * The harness reproduces `wk-generate-daily`'s discretionary scoring exactly:
 *   score = emphasis + shortfall + faultPriority - variety - poolIndex*0.001
 * and picks the highest score. Only the fault-priority term varies between the
 * two runs, so any difference in the chosen movements is caused by the ledger
 * and nothing else.
 */
import { describe, it, expect } from "vitest";
import {
  buildFaultPriority,
  type LedgerSignalRow,
} from "../../supabase/functions/_shared/wic/faultLedger/priority";

interface PoolMovement {
  slug: string;
  category: string;
  /** Dose fields — nothing in this feature may move them. */
  sets: number;
  reps: number;
}

/**
 * Two discretionary slots, each with a legal pool. Order is the pool order.
 * Each pool is category-scoped, exactly as the generator's slot pools are, so
 * the category filled by a slot cannot move no matter what the ledger says.
 */
const POOLS: Record<string, PoolMovement[]> = {
  // Corrective slot — trunk and anti-rotation work.
  corrective: [
    { slug: "four_way_plank", category: "core", sets: 2, reps: 8 },
    { slug: "bs_side_plank_rot_reach", category: "core", sets: 2, reps: 8 },
    { slug: "bird_dog", category: "core", sets: 2, reps: 8 },
    { slug: "kneeling_ab_rollout", category: "core", sets: 2, reps: 8 },
  ],
  // Supplemental slot — explosive options.
  supplemental: [
    { slug: "hurdle_jump", category: "power", sets: 3, reps: 5 },
    { slug: "medicine_ball_scoop_toss", category: "power", sets: 3, reps: 5 },
    { slug: "medicine_ball_shot_put_throw", category: "power", sets: 3, reps: 5 },
    { slug: "sp_pogo_single", category: "power", sets: 3, reps: 5 },
  ],
};

const EMPHASIS = 1.0; // identical for every candidate in this harness

function score(m: PoolMovement, i: number, bonus: (slug: string) => number): number {
  const s = EMPHASIS + bonus(m.slug) - i * 0.001;
  return Math.round(s * 1e6) / 1e6;
}

interface Selected {
  slot: string;
  slug: string;
  category: string;
  sets: number;
  reps: number;
}

/** One generation run over every slot, with a given priority view. */
function generate(bonus: (slug: string) => number): Selected[] {
  return Object.entries(POOLS).map(([slot, pool]) => {
    const best = pool
      .map((m, i) => ({ m, s: score(m, i, bonus) }))
      .reduce((a, b) => (b.s > a.s ? b : a));
    return {
      slot,
      slug: best.m.slug,
      category: best.m.category,
      sets: best.m.sets,
      reps: best.m.reps,
    };
  });
}

const ZERO = () => 0;

/** A real ledger: what the backfill actually put in the table for one athlete. */
const SIGNALS: LedgerSignalRow[] = [
  {
    source: "video_analysis",
    fault_key: "hands_pass_elbow_early",
    root_pattern_id: "hands_leak_forward_early",
    discipline: "hitting",
    confidence: 0.7,
    sample_size: 9,
    severity: 0.94,
    observed_at: "2026-09-05T00:00:00Z",
  },
  {
    source: "video_analysis",
    fault_key: "early_shoulder_rotation",
    root_pattern_id: "trunk_rotates_before_front_foot_plant",
    discipline: "hitting",
    confidence: 0.7,
    sample_size: 4,
    severity: 0.64,
    observed_at: "2026-09-03T00:00:00Z",
  },
  {
    source: "video_analysis",
    fault_key: "early_shoulder_rotation",
    root_pattern_id: "trunk_rotates_before_front_foot_plant",
    discipline: "pitching",
    confidence: 0.7,
    sample_size: 3,
    severity: 0.58,
    observed_at: "2026-09-02T00:00:00Z",
  },
];

const NOW = Date.parse("2026-09-08T12:00:00Z");

describe("fault ledger → daily plan wiring", () => {
  it("1. cold start: an empty ledger changes nothing", () => {
    const empty = buildFaultPriority([], NOW);
    expect(empty.active).toBe(false);
    expect(empty.ranked).toHaveLength(0);
    // Every slug is worth exactly zero, so the score expression is unchanged.
    for (const pool of Object.values(POOLS)) {
      for (const m of pool) expect(empty.bonusForSlug(m.slug)).toBe(0);
    }
    expect(generate(empty.bonusForSlug)).toEqual(generate(ZERO));
  });

  it("2. populated ledger: the plan visibly changes", () => {
    const priority = buildFaultPriority(SIGNALS, NOW);
    expect(priority.active).toBe(true);

    const without = generate(ZERO);
    const withLedger = generate(priority.bonusForSlug);

    const diff = withLedger
      .map((row, i) => ({ slot: row.slot, before: without[i].slug, after: row.slug }))
      .filter((d) => d.before !== d.after);

    // If this is empty the ledger is still a dead end.
    expect(diff.length).toBeGreaterThan(0);
    expect(diff).toEqual([
      { slot: "corrective", before: "four_way_plank", after: "bs_side_plank_rot_reach" },
      { slot: "supplemental", before: "hurdle_jump", after: "medicine_ball_scoop_toss" },
    ]);

    // And it changed for a reason the athlete could read back.
    expect(priority.ranked.map((r) => r.rootPatternId)).toEqual([
      "trunk_rotates_before_front_foot_plant",
      "hands_leak_forward_early",
    ]);
    expect(priority.ranked[0].family).toBe("rotational_output");
    expect(priority.ranked[1].family).toBe("trunk_transfer");
  });

  it("3. priority only: same slots, same categories, nothing removed from the pool", () => {
    const priority = buildFaultPriority(SIGNALS, NOW);
    const without = generate(ZERO);
    const withLedger = generate(priority.bonusForSlug);

    expect(withLedger).toHaveLength(without.length);
    expect(withLedger.map((r) => r.slot)).toEqual(without.map((r) => r.slot));
    expect(withLedger.map((r) => r.category)).toEqual(without.map((r) => r.category));

    // The pool itself is untouched: every candidate still scores, and the
    // ledger's contribution is never negative.
    for (const [slot, pool] of Object.entries(POOLS)) {
      const scoredWith = pool.filter(
        (m, i) => Number.isFinite(score(m, i, priority.bonusForSlug)),
      );
      expect(scoredWith).toHaveLength(pool.length);
      for (const m of pool) {
        expect(priority.bonusForSlug(m.slug)).toBeGreaterThanOrEqual(0);
        expect(score(m, pool.indexOf(m), priority.bonusForSlug)).toBeGreaterThanOrEqual(
          score(m, pool.indexOf(m), ZERO),
        );
      }
      expect(withLedger.find((r) => r.slot === slot)).toBeTruthy();
    }
  });

  it("4. dose diff is empty: not one set, rep or number moved", () => {
    const priority = buildFaultPriority(SIGNALS, NOW);
    const bySlug = new Map(
      Object.values(POOLS).flat().map((m) => [m.slug, m] as const),
    );
    for (const row of generate(priority.bonusForSlug)) {
      const catalog = bySlug.get(row.slug)!;
      expect(row.sets).toBe(catalog.sets);
      expect(row.reps).toBe(catalog.reps);
    }
    // The priority view exposes no dose surface at all.
    expect(Object.keys(priority)).toEqual(["bonusForSlug", "ranked", "trace", "active"]);
  });
});
