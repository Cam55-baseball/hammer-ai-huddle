// Stage 1 evidence — Safe Plan fatal-injection harness.
// Forces every fatal the validator can raise, one at a time, and asserts the
// Safe Plan ladder still returns renderable rows.
//
// Run: deno run -A scripts/audits/safe-plan-injection.ts

import { validate } from "../../supabase/functions/_shared/wic/validator.ts";
import { buildSafePlan } from "../../supabase/functions/_shared/wic/safePlan.ts";

type Rx = Parameters<typeof validate>[0]["prescriptions"][number];

const timeRow = (slug: string, name: string, order: number): Rx => ({
  engine: "recovery",
  slot: "warmup",
  sequence_role: "trunk_primer",
  movement_slug: slug,
  movement_name: name,
  sets: null,
  reps: null,
  dosage_unit: "seconds",
  duration_seconds: 60,
  sequence_order: order,
  why_payload: { progression: { block: 1, week: 1, source: "test" } },
} as unknown as Rx);

const liftRow = (slug: string, name: string, role: string, sets: number, reps: number): Rx => ({
  engine: "strength",
  slot: "lift",
  sequence_role: role,
  movement_slug: slug,
  movement_name: name,
  sets,
  reps,
  dosage_unit: "reps",
  why_payload: { progression: { block: 1, week: 1, source: "test" }, session_shape: { ok: true } },
} as unknown as Rx);

function baseSession(): Rx[] {
  return [
    timeRow("wu_a", "Cat Cow", 0),
    liftRow("m_arm", "Band Pull Apart", "arm_care", 2, 12),
    liftRow("m_trunk", "Dead Bug", "trunk_primer", 2, 10),
    liftRow("m_lower", "Goblet Squat", "compound_lower", 3, 8),
    liftRow("m_push", "Push Up", "upper_push", 3, 10),
    liftRow("m_pull", "Inverted Row", "upper_pull", 3, 10),
  ];
}

const injections: Array<[string, () => { rxs: Rx[]; phase: string; isGameDay: boolean }]> = [
  ["duplicate_slug", () => { const r = baseSession(); r.push({ ...r[3] }); return { rxs: r, phase: "os_q1", isGameDay: false }; }],
  ["duplicate_name", () => { const r = baseSession(); r.push({ ...r[3], movement_slug: "m_lower_2" }); return { rxs: r, phase: "os_q1", isGameDay: false }; }],
  ["duplicate_sets_reps", () => { const r = baseSession(); r.push(liftRow("m_extra", "Split Squat", "compound_lower", 3, 10)); return { rxs: r, phase: "os_q1", isGameDay: false }; }],
  ["dose_outside_envelope", () => { const r = baseSession(); r[3] = liftRow("m_lower", "Goblet Squat", "compound_lower", 9, 45); return { rxs: r, phase: "in_season", isGameDay: false }; }],
  ["missing_role", () => { const r = baseSession().filter((x) => x.sequence_role !== "upper_pull"); return { rxs: r, phase: "os_q1", isGameDay: false }; }],
  ["unregistered_slot", () => { const r = baseSession(); r.push({ ...liftRow("m_ghost", "Ghost Drill", "supplemental", 2, 8), slot: "nonexistent_slot" } as Rx); return { rxs: r, phase: "os_q1", isGameDay: false }; }],
  ["game_day_forbidden_slot", () => ({ rxs: baseSession(), phase: "in_season", isGameDay: true })],
  ["ordering_violation", () => { const r = baseSession(); const a = r[1]; r[1] = r[5]; r[5] = a; return { rxs: r, phase: "os_q1", isGameDay: false }; }],
  ["responsibility_violation", () => { const r = baseSession(); r.push({ ...liftRow("m_cond", "Tempo Run", "conditioning", 1, 1), slot: "lift", engine: "conditioning" } as Rx); return { rxs: r, phase: "os_q1", isGameDay: false }; }],
  ["progression_lineage_missing", () => { const r = baseSession(); r[3] = { ...r[3], why_payload: {} } as Rx; return { rxs: r, phase: "os_q1", isGameDay: false }; }],
  ["session_shape_below_floor", () => ({ rxs: [baseSession()[0]], phase: "os_q1", isGameDay: false })],
  ["re_exposure_window_violation", () => { const r = baseSession(); r.push(liftRow("m_lower", "Front Squat", "compound_lower", 4, 6)); return { rxs: r, phase: "os_q1", isGameDay: false }; }],
  ["empty_session", () => ({ rxs: [], phase: "os_q1", isGameDay: false })],
  ["all_rows_illegal_gameday", () => ({ rxs: baseSession().slice(1), phase: "in_season", isGameDay: true })],
  ["catalog_dose_garbage", () => { const r = baseSession().map((x) => ({ ...x, sets: 99, reps: 99 })) as Rx[]; return { rxs: r, phase: "in_season", isGameDay: false }; }],
  ["every_name_identical", () => { const r = baseSession().map((x, i) => ({ ...x, movement_slug: `s${i}`, movement_name: "Squat" })) as Rx[]; return { rxs: r, phase: "os_q1", isGameDay: false }; }],
  ["all_slots_unregistered", () => { const r = baseSession().map((x) => ({ ...x, slot: "bogus" })) as Rx[]; return { rxs: r, phase: "os_q1", isGameDay: false }; }],
];

const table: string[] = ["| # | injected failure | fatals raised | safe-plan tier | rows shipped | card? |", "|---|---|---|---|---|---|"];
let shipped = 0;
injections.forEach(([label, make], i) => {
  const { rxs, phase, isGameDay } = make();
  const first = validate({ phase, isGameDay, prescriptions: rxs });
  const plan = buildSafePlan({ rxs: rxs as never[], phase, isGameDay, validate, firstReport: first });
  const codes = [...new Set(first.issues.filter((x) => x.severity === "fatal").map((x) => x.code))];
  const ok = plan.rows.length > 0;
  if (ok) shipped++;
  table.push(`| ${i + 1} | ${label} | ${codes.join(", ") || "(none)"} | ${plan.tier} | ${plan.rows.length} | ${ok ? "YES" : "NO"} |`);
});

console.log(table.join("\n"));
console.log(`\n${shipped}/${injections.length} injections still shipped a card.`);
if (shipped !== injections.length) Deno.exit(1);
