/**
 * Goal Emphasis + Weekly Balance — CI audit.
 *
 * Asserts:
 *  1. Emphasis weights always stay inside the constitutional bounds.
 *  2. Goal ordering measurably changes emphasis (goals are not decorative).
 *  3. Emphasis never zeroes a domain — baseline coverage always survives.
 *  4. A week that meets every floor produces no shortfall warnings.
 *  5. A push-heavy / lower-starved week is caught by the ledger.
 *  6. Shortfall + variety steering stay bounded (can never outrank legality).
 *
 * Run: npx tsx scripts/audits/goal-balance-audit.ts
 */
import {
  resolveGoalEmphasis,
  GOAL_DOMAINS,
  MIN_WEIGHT,
  MAX_WEIGHT,
  type GoalDomain,
} from "../../supabase/functions/_shared/wic/goals/emphasis.ts";
import {
  buildWeeklyLedger,
  evaluateWeeklyBalance,
  shortfallBonus,
  varietyPenalty,
  WEEKLY_FLOORS,
} from "../../supabase/functions/_shared/wic/balance/weeklyLedger.ts";

const failures: string[] = [];
const fail = (m: string) => failures.push(m);

const CATS: GoalDomain[] = ["speed", "power", "throwing", "hitting", "fielding"];

function profileFor(order: GoalDomain[]) {
  const p: Record<string, unknown> = {};
  order.forEach((c, i) => {
    p[`goal_${c}`] = "stated";
    p[`goal_${c}_rank`] = i + 1;
  });
  return p;
}

function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const out: T[][] = [];
  arr.forEach((x, i) => {
    for (const rest of permutations([...arr.slice(0, i), ...arr.slice(i + 1)])) {
      out.push([x, ...rest]);
    }
  });
  return out;
}

// 1 + 2 + 3 — emphasis bounds, ordering sensitivity, baseline survival.
const orders = permutations(CATS);
const signatures = new Set<string>();
for (const order of orders) {
  const e = resolveGoalEmphasis({ profile: profileFor(order), bodyGoals: [] });
  for (const d of GOAL_DOMAINS) {
    const w = e.weights[d];
    if (!(w >= MIN_WEIGHT && w <= MAX_WEIGHT)) {
      fail(`weight out of bounds for ${d}: ${w} (order ${order.join(">")})`);
    }
    if (w <= 0) fail(`domain ${d} zeroed out — baseline coverage lost`);
  }
  if (e.ranked[0] !== order[0]) {
    fail(`top-ranked goal not honoured: expected ${order[0]}, got ${e.ranked[0]}`);
  }
  signatures.add(GOAL_DOMAINS.map((d) => e.weights[d]).join(","));
}
if (signatures.size < orders.length / 2) {
  fail(`goal ordering barely changes emphasis: ${signatures.size} distinct signatures for ${orders.length} orderings`);
}

// Determinism — identical input, identical output.
const a = resolveGoalEmphasis({ profile: profileFor(CATS), bodyGoals: [] });
const b = resolveGoalEmphasis({ profile: profileFor(CATS), bodyGoals: [] });
if (JSON.stringify(a.weights) !== JSON.stringify(b.weights)) {
  fail("emphasis is not deterministic across identical inputs");
}

// No goals at all — pure baseline.
const baseline = resolveGoalEmphasis({ profile: {}, bodyGoals: [] });
if (!baseline.isBaselineOnly) fail("empty goals did not resolve to baseline-only");
for (const d of GOAL_DOMAINS) {
  if (baseline.weights[d] !== 1) fail(`baseline weight for ${d} is ${baseline.weights[d]}, expected 1`);
}

// 4 — a compliant week produces no shortfall warnings.
const compliantRows: Array<{ plan_date: string; movement_slug: string; category: string }> = [];
let n = 0;
for (const [cat, floor] of Object.entries(WEEKLY_FLOORS)) {
  for (let i = 0; i < (floor as number); i++) {
    compliantRows.push({
      plan_date: `2026-08-1${(n % 7) + 1}`,
      movement_slug: `${cat}-${i}`,
      category: cat,
    });
    n++;
  }
}
const good = buildWeeklyLedger(compliantRows);
const goodWarnings = evaluateWeeklyBalance(good, { isThrower: true });
const goodShortfalls = goodWarnings.filter((w) => w.code === "weekly_category_shortfall");
if (goodShortfalls.length > 0) {
  fail(`compliant week produced shortfalls: ${goodShortfalls.map((w) => w.message).join("; ")}`);
}

// 5 — push-heavy, lower-starved week must be caught.
const badRows = Array.from({ length: 6 }, (_, i) => ({
  plan_date: `2026-08-1${i + 1}`,
  movement_slug: `push-${i}`,
  category: "compound_upper_push",
}));
const bad = buildWeeklyLedger(badRows);
const badWarnings = evaluateWeeklyBalance(bad, { isThrower: true });
if (!badWarnings.some((w) => w.code === "weekly_upper_lower_imbalance")) {
  fail("push-only week did not trip the upper:lower band");
}
if (!badWarnings.some((w) => w.code === "weekly_category_shortfall" && (w.detail as any)?.category === "compound_lower")) {
  fail("push-only week did not report a compound_lower shortfall");
}

// 6 — steering stays bounded.
for (const cat of Object.keys(WEEKLY_FLOORS)) {
  const bonus = shortfallBonus(bad, cat);
  if (bonus < 0 || bonus > 0.45) fail(`shortfall bonus for ${cat} out of bounds: ${bonus}`);
}
const penalty = varietyPenalty(bad, "push-0");
if (penalty !== 0.25) fail(`variety penalty drifted: ${penalty}`);
if (varietyPenalty(bad, "never-used") !== 0) fail("unused slug wrongly penalised");

if (failures.length) {
  console.error("[goal-balance-audit] FAILED");
  for (const f of failures) console.error(" - " + f);
  process.exit(1);
}
console.log("[goal-balance-audit] PASSED");
