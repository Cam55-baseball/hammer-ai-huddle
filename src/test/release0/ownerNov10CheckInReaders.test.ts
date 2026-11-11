import { describe, it, expect, vi, beforeAll } from "vitest";
import { readFileSync } from "node:fs";

vi.mock("https://deno.land/std@0.224.0/http/server.ts", () => ({ serve: vi.fn() }));
vi.mock("https://esm.sh/@supabase/supabase-js@2.49.1", () => ({ createClient: vi.fn() }));

import { mergeCheckInDay, mergeLatestCheckInDay } from "@/lib/checkIns/mergeCheckInDay";
import { loadAthleteFacts } from "../../../supabase/functions/analyze-video/athleteContext";
import { computeReadiness, VAULT_READINESS_SELECT, NO_SLEEP_RECOMMENDATION } from "../../../supabase/functions/hie-analyze/readiness";
import { latestDayAnswers, type Checkin, type CheckinDone } from "@/lib/coach/readiness";

const DAY = "2026-11-12";
const EARLIER = "2026-11-11";
const morning = { entry_date: DAY, quiz_type: "morning", created_at: `${DAY}T07:00:00Z`, hours_slept: 5, sleep_quality: 2, perceived_recovery: 3, physical_readiness: 3, pain_location: [], pain_scale: null, stress_level: 2 };
const blankNight = { entry_date: DAY, quiz_type: "night", created_at: `${DAY}T21:00:00Z`, hours_slept: null, sleep_quality: null, perceived_recovery: null, physical_readiness: null, pain_location: [], pain_scale: null, stress_level: null };
const preLiftPain = { entry_date: DAY, quiz_type: "pre_lift", created_at: `${DAY}T15:00:00Z`, hours_slept: null, sleep_quality: null, perceived_recovery: null, physical_readiness: null, pain_location: ["shoulder"], pain_scale: 6, stress_level: null };
const nightNoPain = { ...blankNight };
const low = { entry_date: DAY, quiz_type: "morning", created_at: `${DAY}T07:00:00Z`, pain_location: ["shoulder"], pain_scale: 3 };
const high = { entry_date: DAY, quiz_type: "pre_lift", created_at: `${DAY}T15:00:00Z`, pain_location: ["shoulder"], pain_scale: 7 };
const older = { entry_date: EARLIER, quiz_type: "morning", created_at: `${EARLIER}T07:00:00Z`, hours_slept: 9, sleep_quality: 5, perceived_recovery: 9, physical_readiness: 5, pain_location: ["knee"], pain_scale: 9 };

function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}

/* ── tiny fake database: from(table) → chain → { data } ── */
function fakeDb(tables: Record<string, unknown[]>, inserts: Record<string, unknown[]> = {}) {
  const chain = (table: string): any => {
    const rows = tables[table] ?? [];
    const c: any = {
      select: () => c, eq: () => c, gte: () => c, is: () => c, not: () => c, order: () => c, limit: () => c,
      maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
      single: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
      then: (res: any, rej: any) => Promise.resolve({ data: rows, error: null }).then(res, rej),
      insert: (payload: unknown) => {
        (inserts[table] ??= []).push(payload);
        const ins: any = { select: () => ins, maybeSingle: () => Promise.resolve({ data: { id: "snap-1" }, error: null }),
          then: (res: any, rej: any) => Promise.resolve({ data: null, error: null }).then(res, rej) };
        return ins;
      },
    };
    return c;
  };
  return { from: chain };
}

describe("shared rule: combine all of a day's check-ins", () => {
  it("morning (recovery 3, hours 5) then a blank night row still reads recovery 3 and hours 5", () => {
    const m: any = mergeCheckInDay([morning, blankNight]);
    expect(m.perceived_recovery).toBe(3);
    expect(m.hours_slept).toBe(5);
  });
  it("pre_lift pain then a night row still lists the pain", () => {
    const m: any = mergeCheckInDay([preLiftPain, nightNoPain]);
    expect(m.pain_location).toEqual(["shoulder"]);
    expect(m.pain_scale).toBe(6);
  });
  it("the same area at 3 and 7 gives 7", () => {
    expect((mergeCheckInDay([low, high]) as any).pain_scale).toBe(7);
    expect((mergeCheckInDay([{ ...low, pain_scales: { shoulder: 3 } }, { ...high, pain_scales: { shoulder: 7 } }]) as any).pain_scales).toEqual({ shoulder: 7 });
  });
  it("any row order gives the same result", () => {
    const want = mergeLatestCheckInDay([morning, preLiftPain, blankNight, older]);
    for (const p of permutations([morning, preLiftPain, blankNight, older])) expect(mergeLatestCheckInDay(p)).toEqual(want);
  });
  it("a question nobody answered stays unknown", () => {
    expect((mergeCheckInDay([blankNight]) as any).hours_slept).toBeNull();
  });
});

describe("Hammer readiness score (compute-hammer-state)", () => {
  let computeForUser: (db: any, userId: string) => Promise<unknown>;
  beforeAll(async () => {
    (globalThis as any).Deno = { env: { get: () => "http://local" } };
    (globalThis as any).fetch = vi.fn(() => Promise.resolve(new Response("{}")));
    computeForUser = (await import("../../../supabase/functions/compute-hammer-state/index.ts")).computeForUser as any;
  });
  const recoveryInputs = async (rows: unknown[]) => {
    const inserts: Record<string, any[]> = {};
    await computeForUser(fakeDb({ vault_focus_quizzes: rows }, inserts), "u1");
    return inserts.hammer_state_snapshots[0].recovery_inputs;
  };
  it.each(permutations([morning, blankNight]).map((p, i) => [i, p] as const))("morning then blank night, order %i: recovery 3, hours 5", async (_i, rows) => {
    const r = await recoveryInputs(rows);
    expect(r.perceived_recovery).toBe(3);
    expect(r.hours_slept).toBe(5);
  });
  it.each(permutations([morning, preLiftPain, nightNoPain]).map((p, i) => [i, p] as const))("pre_lift pain survives a later night row, order %i", async (_i, rows) => {
    expect((await recoveryInputs(rows)).pain_scale).toBe(6);
  });
  it("same area at 3 and 7 gives 7 in either order", async () => {
    expect((await recoveryInputs([low, high])).pain_scale).toBe(7);
    expect((await recoveryInputs([high, low])).pain_scale).toBe(7);
  });
  it("only the latest check-in day is used", async () => {
    expect((await recoveryInputs([older, morning])).hours_slept).toBe(5);
  });
});

describe("video-analysis athlete context (analyze-video/athleteContext.ts)", () => {
  const readiness = async (rows: unknown[]) =>
    (await loadAthleteFacts(fakeDb({ vault_focus_quizzes: rows }), "u1", "baseball", 0)).readiness;
  it.each(permutations([morning, blankNight]).map((p, i) => [i, p] as const))("morning then blank night, order %i: recovery 3, hours 5", async (_i, rows) => {
    expect(await readiness(rows)).toEqual({ date: DAY, physical: 3, recovery: 3, sleepHours: 5, painScale: null });
  });
  it.each(permutations([morning, preLiftPain, nightNoPain]).map((p, i) => [i, p] as const))("pre_lift pain survives a night row, order %i", async (_i, rows) => {
    expect((await readiness(rows))?.painScale).toBe(6);
  });
  it("same area at 3 and 7 gives 7", async () => {
    expect((await readiness([high, low]))?.painScale).toBe(7);
  });
});

describe("background readiness analysis (hie-analyze)", () => {
  it("reads pain from the real field, never the missing pain_level column", () => {
    expect(VAULT_READINESS_SELECT).toContain("pain_scale");
    expect(VAULT_READINESS_SELECT).not.toContain("pain_level");
    const src = readFileSync("supabase/functions/hie-analyze/index.ts", "utf8");
    expect(src).not.toMatch(/pain_level/);
    expect(src).toContain(".select(VAULT_READINESS_SELECT)");
  });
  it("pain 6 on pre_lift lowers the score versus no pain (pain read from pain_scale)", () => {
    const noPain = computeReadiness([morning, blankNight]).score!;
    expect(computeReadiness([morning, preLiftPain, blankNight]).score).toBe(noPain - 30);
  });
  it.each(permutations([morning, preLiftPain, blankNight]).map((p, i) => [i, p] as const))("any order gives the same score, order %i", (_i, rows) => {
    expect(computeReadiness(rows)).toEqual(computeReadiness([morning, preLiftPain, blankNight]));
  });
  it("morning answers survive a blank night row (sleep quality 2 still read)", () => {
    expect(computeReadiness([morning, blankNight])).toEqual(computeReadiness([morning]));
    expect(computeReadiness([morning]).score).not.toBeNull();
  });
  it("same area at 3 and 7 uses 7", () => {
    const base = { ...morning, pain_location: [], pain_scale: null };
    expect(computeReadiness([base, low, high]).score).toBe(computeReadiness([base, high]).score);
  });
  it("no sleep-quality answer = unknown score, never a default", () => {
    expect(computeReadiness([preLiftPain])).toEqual({ score: null, recommendation: NO_SLEEP_RECOMMENDATION });
  });
});

describe("coach summary 'Latest answers' line", () => {
  const c = (o: Partial<Checkin>): Checkin => ({ entry_date: DAY, quiz_type: "morning", physical_readiness: null, perceived_recovery: null, hours_slept: null, pain_location: null, pain_scale: null, soreness_locations: null, ...o });
  const rows: Checkin[] = [
    c({ quiz_type: "night" }),
    c({ quiz_type: "pre_lift", pain_location: ["shoulder"], pain_scale: 7 }),
    c({ quiz_type: "morning", perceived_recovery: 3, hours_slept: 5, pain_location: ["shoulder"], pain_scale: 3 }),
    c({ entry_date: EARLIER, hours_slept: 9 }),
  ];
  const done: CheckinDone[] = [
    { entry_date: DAY, quiz_type: "morning", completed_at: `${DAY}T07:00:00Z` },
    { entry_date: DAY, quiz_type: "pre_lift", completed_at: `${DAY}T15:00:00Z` },
    { entry_date: DAY, quiz_type: "night", completed_at: `${DAY}T21:00:00Z` },
    { entry_date: EARLIER, quiz_type: "morning", completed_at: `${EARLIER}T07:00:00Z` },
  ];
  it.each(permutations(rows).map((p, i) => [i, p] as const))("latest real answers + pain from any check-in that day, order %i", (_i, p) => {
    expect(latestDayAnswers(p, done)).toEqual({ entry_date: DAY, facts: ["Sleep: 5 h", "Pain: shoulder (rating 7)"] });
  });
  it("a day with only blank rows falls back to the latest day that has answers", () => {
    expect(latestDayAnswers([c({ quiz_type: "night" }), c({ entry_date: EARLIER, hours_slept: 9 })], done)).toEqual({ entry_date: EARLIER, facts: ["Sleep: 9 h"] });
  });
});
