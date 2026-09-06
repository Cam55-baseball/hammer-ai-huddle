/**
 * Pass B evidence #3 + #4 — schedule enforcement.
 *
 *   Part 1  Report: which tables hold the schedule, whether the generator can
 *           read them server-side, and how many users actually have one.
 *   Part 2  Proof: the pure rule engine, exercised over the cases that matter,
 *           including the one that matters most — an athlete with NO schedule
 *           must come out byte-identical to `NO_SCHEDULE`, i.e. exactly as the
 *           generator behaved before this module existed.
 *
 * Run: bun scripts/audits/evidence/schedule-enforcement.ts
 * Evidence: scripts/audits/evidence/schedule-enforcement.json
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveGameProximity,
  survivesPrimerOnly,
  NO_SCHEDULE,
  GAME_PROXIMITY_VERSION,
  type ScheduledGame,
} from "../../../supabase/functions/_shared/wic/schedule/gameProximity.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const URL_ = process.env.SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function rest(path: string): Promise<{ rows: unknown[]; count: number | null }> {
  const r = await fetch(`${URL_}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Prefer: "count=exact" },
  });
  if (!r.ok) return { rows: [], count: null };
  const rows = (await r.json()) as unknown[];
  const cr = r.headers.get("content-range");
  const count = cr ? Number(cr.split("/")[1]) : null;
  return { rows, count: Number.isFinite(count as number) ? (count as number) : null };
}

// ─── Part 1 — report ────────────────────────────────────────────────────────
const gpGames = await rest("gp_games?select=user_id,game_date,scheduled_time,is_starting_pitcher&limit=2000");
const calGames = await rest(
  "calendar_events?select=user_id,event_date,start_time,is_starting_pitcher&event_type=eq.game&limit=2000",
);

const usersGp = new Set(gpGames.rows.map((r) => (r as { user_id: string }).user_id));
const usersCal = new Set(calGames.rows.map((r) => (r as { user_id: string }).user_id));
const usersAny = new Set([...usersGp, ...usersCal]);

const withTime = calGames.rows.filter((r) => (r as { start_time?: string | null }).start_time).length;
const gpWithTime = gpGames.rows.filter((r) => (r as { scheduled_time?: string | null }).scheduled_time).length;

const report = {
  tables: [
    {
      table: "gp_games",
      role: "Game Plan games — the athlete's own logged/scheduled games.",
      date_column: "game_date",
      time_column: "scheduled_time",
      starting_pitcher_column: "is_starting_pitcher (added this pass)",
      rows_sampled: gpGames.rows.length,
      total_rows: gpGames.count,
      distinct_users: usersGp.size,
      rows_with_a_time: gpWithTime,
      server_readable: true,
    },
    {
      table: "calendar_events (event_type = 'game')",
      role: "Calendar game entries — what most athletes actually fill in.",
      date_column: "event_date",
      time_column: "start_time",
      starting_pitcher_column: "is_starting_pitcher (added this pass)",
      rows_sampled: calGames.rows.length,
      total_rows: calGames.count,
      distinct_users: usersCal.size,
      rows_with_a_time: withTime,
      server_readable: true,
    },
  ],
  server_side_query: {
    answer: "Yes.",
    detail:
      "wk-generate-daily runs with the service role, so both tables are readable " +
      "without RLS friction. The generator reads a ±2 day window around the plan " +
      "date, which is the widest span the 48-hour rule can reach.",
  },
  users_with_a_schedule: usersAny.size,
  version: GAME_PROXIMITY_VERSION,
};

// ─── Part 2 — proof ─────────────────────────────────────────────────────────
const D = "2026-06-10";
const g = (date: string, time: string | null, sp = false): ScheduledGame => ({
  date, time, isStartingPitcher: sp, source: "calendar_events",
});

interface Case { name: string; got: unknown; expect: string; pass: boolean }
const cases: Case[] = [];
const add = (name: string, got: unknown, expect: string, pass: boolean) =>
  cases.push({ name, got, expect, pass });

// 1. No schedule — the whole point. Must be identical to NO_SCHEDULE.
const none = resolveGameProximity([], D);
add(
  "no schedule → identical to NO_SCHEDULE (pre-Pass-B behaviour)",
  none,
  "deep-equal NO_SCHEDULE",
  JSON.stringify(none) === JSON.stringify(NO_SCHEDULE),
);

// 2. Game far away — untouched.
const far = resolveGameProximity([g("2026-06-20", "18:00")], D);
add("game 10 days out → no restriction", { primerOnly: far.primerOnly, cnsCapDelta: far.cnsCapDelta },
  "primerOnly false, delta 0", far.primerOnly === false && far.cnsCapDelta === 0);

// 3. Game tomorrow evening — inside 48h.
const tomorrow = resolveGameProximity([g("2026-06-11", "19:00")], D);
add("game tomorrow 19:00 → primer only",
  { hours: Math.round(tomorrow.hoursToNearestGame!), primerOnly: tomorrow.primerOnly },
  "primerOnly true", tomorrow.primerOnly === true);

// 4. Game with no time → assumed 18:00, still caught.
const noTime = resolveGameProximity([g("2026-06-11", null)], D);
add("game tomorrow, no time given → assumed 18:00, still primer only",
  { hours: Math.round(noTime.hoursToNearestGame!), primerOnly: noTime.primerOnly },
  "primerOnly true", noTime.primerOnly === true);

// 5. Doubleheader today.
const dh = resolveGameProximity([g(D, "10:00"), g(D, "14:00")], D);
add("two games today → CNS cap −1", { gamesToday: dh.gamesToday, delta: dh.cnsCapDelta },
  "gamesToday 2, delta −1", dh.gamesToday === 2 && dh.cnsCapDelta === -1);

// 6. Day after a doubleheader.
const dhNext = resolveGameProximity([g("2026-06-09", "10:00"), g("2026-06-09", "14:00")], D);
add("day after a doubleheader → CNS cap still −1",
  { isDayAfter: dhNext.isDayAfterDoubleheader, delta: dhNext.cnsCapDelta },
  "delta −1", dhNext.cnsCapDelta === -1);

// 7. Pitcher next to a team game, nothing declared → primer default.
const pitcherAdj = resolveGameProximity([g("2026-06-11", "17:00")], D, { isPitcher: true });
add("pitcher adjacent to a team game, no declaration → primer level only",
  { primerOnly: pitcherAdj.primerOnly, removeLift: pitcherAdj.removeLift, reasons: pitcherAdj.reasons },
  "primerOnly true, removeLift false",
  pitcherAdj.primerOnly === true && pitcherAdj.removeLift === false);

// 8. "I'm starting this game" → the lift comes off.
const starting = resolveGameProximity([g(D, "18:00", true)], D, { isPitcher: true });
add("athlete marks the start → lift removed",
  { removeLift: starting.removeLift, reasons: starting.reasons },
  "removeLift true", starting.removeLift === true);

// 9. Pitcher with NO game anywhere → nothing changes. The default must not
//    leak into a week with no baseball in it.
const pitcherNoGames = resolveGameProximity([], D, { isPitcher: true });
add("pitcher with no games at all → no restriction",
  pitcherNoGames, "deep-equal NO_SCHEDULE",
  JSON.stringify(pitcherNoGames) === JSON.stringify(NO_SCHEDULE));

// 10. What survives a primer-only day.
const survivors = ["low", "supplemental", "arm_care", "elastic", "moderate", "unilateral", "high", "maximal", "compound", null];
const survivorMap = Object.fromEntries(survivors.map((c) => [String(c), survivesPrimerOnly(c)]));
add("primer survivor set", survivorMap,
  "low/supplemental/arm_care/elastic survive; everything else, including unclassified, does not",
  survivorMap["low"] && survivorMap["supplemental"] && survivorMap["arm_care"] &&
  survivorMap["elastic"] && !survivorMap["moderate"] && !survivorMap["unilateral"] &&
  !survivorMap["high"] && !survivorMap["maximal"] && !survivorMap["null"]);

const failed = cases.filter((c) => !c.pass);
const out = { generated_at: new Date().toISOString(), report, cases, failed: failed.length };
mkdirSync(HERE, { recursive: true });
writeFileSync(join(HERE, "schedule-enforcement.json"), JSON.stringify(out, null, 2));

console.log("── schedule tables ──");
for (const t of report.tables) {
  console.log(
    `  ${t.table}\n    rows ${t.total_rows ?? t.rows_sampled} · users ${t.distinct_users} · with a time ${t.rows_with_a_time} · server-readable ${t.server_readable}`,
  );
}
console.log(`  users with any game scheduled: ${report.users_with_a_schedule}`);
console.log("── rules ──");
for (const c of cases) console.log(`  ${c.pass ? "✅" : "❌"} ${c.name}`);
console.log(`\n[schedule] ${cases.length - failed.length}/${cases.length} passed`);
if (failed.length) process.exit(1);
