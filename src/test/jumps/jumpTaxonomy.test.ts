import { describe, it, expect } from "vitest";
import raw from "./taggedJumps.fixture.json";
import {
  JUMP_CLASSES, beginnerSession, beginnerForbidden, jumpContacts, jumpEligible, rankJumps, jumpCompetency, jumpWorkload, jumpTagProblems,
  isTaggedJump, levelIndex, BEGINNER_CONTACTS, type JumpRow, type JumpAthlete,
} from "../../../supabase/functions/_shared/wic/jumps/taxonomy";
import { governJumps, athleteJumpLevel } from "../../../supabase/functions/_shared/wic/jumps/plan";

// Read-only copy of the live catalog rows the backfill tagged (same columns the engine reads).
const ROWS: JumpRow[] = (raw as any[]).map((r) => ({ ...r, plyo_tier: r.plyo_tier == null ? null : Number(r.plyo_tier), contacts_per_rep: r.contacts_per_rep == null ? null : Number(r.contacts_per_rep), min_age_years: r.min_age_years == null ? null : Number(r.min_age_years) }));
const by = (s: string) => ROWS.find((r) => r.slug === s)!;
const athlete = (o: Partial<JumpAthlete> = {}): JumpAthlete => ({ level: "introduction", readiness: 0.7, sport: "baseball", ...o });

describe("jump classification (owner §10 checks against the catalog rows)", () => {
  it("all six primary classes exist in the catalog", () => {
    for (const c of JUMP_CLASSES) expect(ROWS.some((r) => r.jump_class?.includes(c))).toBe(true);
  });
  it("mechanics are independent of class, and multi-tagging works", () => {
    const reactiveClassNoReactiveMech = ROWS.some((r) => r.jump_class?.includes("reactive") && !r.jump_mechanics?.includes("reactive"));
    const nonReactiveClassWithSsc = ROWS.some((r) => !r.jump_class?.includes("reactive") && r.jump_mechanics?.includes("ssc"));
    expect(reactiveClassNoReactiveMech && nonReactiveClassWithSsc).toBe(true);
    expect(ROWS.some((r) => (r.jump_class?.length ?? 0) > 1)).toBe(true);
    expect(ROWS.some((r) => (r.jump_mechanics?.length ?? 0) > 2)).toBe(true);
  });
  it("owner's three examples are tagged exactly", () => {
    const sq = by("non_countermovement_squat_jump");
    expect([sq.jump_class, sq.jump_mechanics, sq.jump_intensity, sq.jump_direction, sq.jump_stance, sq.jump_execution]).toEqual([["force_production"], ["concentric"], "moderate", ["vertical"], "bilateral", "single"]);
    const pogo = by("wu_pogo_double");
    expect([pogo.jump_class, pogo.jump_mechanics, pogo.jump_intensity, pogo.jump_direction, pogo.jump_stance, pogo.jump_execution]).toEqual([["reactive"], ["ssc", "reactive", "repeated_elastic"], "low", ["vertical"], "bilateral", "repeated"]);
    const box = by("plyo_low_box");
    expect(box.jump_class).toContain("landing_skill");
    expect([box.jump_mechanics, box.jump_intensity, box.jump_stance, box.jump_landing_strategy]).toEqual([["eccentric"], "low", "bilateral", "stick"]);
  });
  it("contacts are counted by each exercise's method", () => {
    expect(jumpContacts(by("plyo_low_box"), 2, 5)).toBe(10);          // 1 per stick landing
    expect(jumpContacts(by("wu_pogo_double"), 2, 10)).toBe(20);       // each hop lands once
    expect(jumpContacts(by("wu_pogo_single"), 2, 5)).toBe(20);        // 5 per side × 2 sides
    expect(jumpContacts(by("wu_a_skip"), 1, 12)).toBe(12);            // each skip landing
    expect(ROWS.every((r) => !!r.contact_method)).toBe(true);
  });
  it("beginner session: only introduction jumps, about 20–25 contacts, 20 after a quality drop", () => {
    for (let day = 0; day < 14; day++) {
      const s = beginnerSession(ROWS, athlete(), day);
      const total = s.reduce((n, d) => n + d.contacts, 0);
      expect(total).toBeGreaterThanOrEqual(BEGINNER_CONTACTS.min - 2);
      expect(total).toBeLessThanOrEqual(BEGINNER_CONTACTS.max);
      for (const d of s) { expect(by(d.slug).jump_level).toBe("introduction"); expect(beginnerForbidden(by(d.slug))).toBeNull(); }
    }
    const dropped = beginnerSession(ROWS, athlete({ qualityDropped: true }), 3).reduce((n, d) => n + d.contacts, 0);
    expect(dropped).toBe(20);
  });
  it("no advanced jumps for unprepared athletes; selection respects readiness", () => {
    const allowed = ROWS.filter((r) => jumpEligible(r, athlete()));
    expect(allowed.length).toBeGreaterThan(0);
    for (const r of allowed) { expect(r.jump_level).toBe("introduction"); expect(r.slug).not.toMatch(/depth|loaded|weighted/); }
    // A beginner on Force Production never gets a maximal or unilateral broad jump.
    expect(rankJumps(ROWS, athlete(), "force_production").every((r) => r.jump_intensity !== "maximal" && r.jump_stance !== "unilateral")).toBe(true);
    // Intermediate rows need 40% readiness; unknown readiness never unlocks them.
    expect(jumpEligible(by("countermovement_jump"), athlete({ level: "intermediate", readiness: 0.3 }))).toBe(false);
    expect(jumpEligible(by("countermovement_jump"), athlete({ level: "intermediate", readiness: null }))).toBe(false);
    expect(jumpEligible(by("countermovement_jump"), athlete({ level: "intermediate", readiness: 0.5 }))).toBe(true);
    // Loaded jumps need Elite-tagged level (and advanced+ by rule).
    expect(jumpEligible(by("loaded_broad_jump"), athlete({ level: "advanced", readiness: 0.9 }))).toBe(false);
  });
  it("sport and role tags rank but never restrict", () => {
    const tagged = ROWS.map((r) => r.slug === "seated_broad_jump" ? { ...r, jump_role_tags: ["pitcher"] } : r);
    const a = athlete({ level: "foundation", roles: ["pitcher"], sport: "softball" });
    const ranked = rankJumps(tagged, a, "force_production");
    expect(ranked[0].slug).toBe("seated_broad_jump");
    expect(rankJumps(tagged, { ...a, roles: [] }, "force_production").map((r) => r.slug)).toContain("seated_broad_jump");
    expect(rankJumps(ROWS.map((r) => ({ ...r, jump_sport_tags: ["baseball"] })), a).length).toBeGreaterThan(0); // softball still gets them
  });
  it("workload separates intensity, direction, stance and reactive/maximal contacts", () => {
    const w = jumpWorkload([{ row: by("wu_pogo_double"), sets: 2, reps: 10 }, { row: by("plyo_depth_jump"), sets: 3, reps: 3 }, { row: by("gap_lateral_bound_stick"), sets: 2, reps: 3 }]);
    expect(w.byIntensity.low).toBe(20);
    expect(w.byIntensity.maximal).toBe(jumpContacts(by("plyo_depth_jump"), 3, 3));
    expect(w.byDirection.lateral).toBe(12);
    expect(w.unilateral).toBe(12);
    expect(w.highReactive).toBe(jumpContacts(by("plyo_depth_jump"), 3, 3));
    expect(w.maximal).toBe(w.highReactive);
    expect(w.reactive).toBe(20 + w.highReactive);
    expect(w.byExercise.wu_pogo_double).toBe(20);
  });
  it("tag edits are validated against the vocabulary, with admin-added values", () => {
    expect(jumpTagProblems({ jump_class: ["reactive", "made_up"] })).toEqual(["jump_class: made_up"]);
    expect(jumpTagProblems({ jump_class: ["made_up"] }, { jump_class: ["made_up"] })).toEqual([]);
    expect(jumpTagProblems({ jump_level: "pro" })).toEqual(["jump_level: pro"]);
  });
  it("existing written fields are intact (tiers kept, nothing re-tiered)", () => {
    expect(by("plyo_low_box").plyo_tier).toBe(1);
    expect(by("plyo_depth_jump").plyo_tier).toBe(2);
    expect(ROWS.every(isTaggedJump)).toBe(true);
  });
});

describe("competency step-up from landing ratings (owner round 6)", () => {
  const wk = (ws: string, green: boolean) => ({ weekStart: ws, green });
  const s = (date: string, ...r: any[]) => ({ plan_date: date, rating: r[0] });
  const solid2 = [s("2026-10-20", "solid"), s("2026-10-20", "solid"), s("2026-10-22", "solid"), s("2026-10-22", "wobble")];
  it("green week + 2 solid sessions in a row → up one level", () => {
    const r = athleteJumpLevel("easiest", null, [wk("2026-10-19", true)], solid2, false);
    expect(r.level).toBe("foundation"); expect(r.change).toBe(1);
  });
  it("green week but 2 wobbles in a session → holds", () => {
    const r = athleteJumpLevel("easiest", null, [wk("2026-10-19", true)], [...solid2, s("2026-10-23", "wobble"), s("2026-10-23", "wobble")], false);
    expect(r.change).toBe(0); expect(r.level).toBe("introduction");
  });
  it("solid landings but not a green week → holds", () => {
    expect(athleteJumpLevel("easiest", null, [wk("2026-10-19", false)], solid2, false).change).toBe(0);
  });
  it("any sloppy set regresses one step", () => {
    const r = athleteJumpLevel("written", 2, [wk("2026-10-19", true)], [s("2026-10-20", "solid"), s("2026-10-22", "sloppy")], false);
    expect(levelIndex(r.level)).toBe(levelIndex("intermediate") - 1);
  });
  it("never moves by time alone, and holds while the step-up check is off", () => {
    expect(athleteJumpLevel("easiest", null, [wk("2026-09-07", true), wk("2026-09-14", true), wk("2026-09-21", true)], [], false).level).toBe("introduction");
    expect(athleteJumpLevel("easiest", null, [wk("2026-10-19", true)], solid2, true).level).toBe("introduction");
  });
  it("one level per week at most", () => {
    const many = jumpCompetency("introduction", [{ weekStart: "2026-10-19", green: true, sessions: [{ date: "2026-10-20", ratings: ["solid"] }, { date: "2026-10-21", ratings: ["solid"] }, { date: "2026-10-22", ratings: ["solid"] }] }]);
    expect(many.level).toBe("foundation");
  });
});

describe("programming engine on a built day (server post-pass)", () => {
  const cat = new Map(ROWS.map((r) => [r.slug, r as any]));
  const row = (slug: string, sets: number, reps: number) => ({ slot: "speed", movement_slug: slug, movement_name: by(slug).name, sets, reps, why_payload: {} });
  it("beginner: written jumps become introduction jumps at about 20–25 contacts", () => {
    const g = governJumps([row("countermovement_jump", 3, 5), row("hurdle_jump", 3, 6), { ...row("wu_pogo_double", 1, 1), slot: "lift", movement_slug: "back_squat", movement_name: "Back squat" }], cat, athlete(), 14, 5);
    const jumps = g.rows.filter((r) => cat.has(r.movement_slug));
    const total = jumps.reduce((n, r) => n + jumpContacts(by(r.movement_slug), r.sets ?? 0, r.reps ?? 0), 0);
    expect(jumps.every((r) => by(r.movement_slug).jump_level === "introduction")).toBe(true);
    expect(total).toBeGreaterThanOrEqual(18); expect(total).toBeLessThanOrEqual(25);
    expect(g.rows.some((r) => r.movement_slug === "back_squat")).toBe(true);
    expect((jumps[0].why_payload as any).jump_workload.total).toBe(total);
  });
  it("level gate swaps an above-level jump for a same-objective one, same sets/reps, never a higher tier", () => {
    const g = governJumps([row("plyo_depth_jump", 3, 4)], cat, athlete({ level: "intermediate", readiness: 0.7 }), 17);
    const r = g.rows[0];
    expect(r.movement_slug).not.toBe("plyo_depth_jump");
    expect(levelIndex(by(r.movement_slug).jump_level)).toBeLessThanOrEqual(levelIndex("intermediate"));
    expect(by(r.movement_slug).plyo_tier ?? 1).toBeLessThanOrEqual(2);
    expect([r.sets, r.reps]).toEqual([3, 4]);
    expect(by(r.movement_slug).jump_objectives).toContain("reactive_strength");
  });
  it("eligible jumps keep the written dose; days without jumps are untouched", () => {
    const g = governJumps([row("countermovement_jump", 3, 5)], cat, athlete({ level: "advanced", readiness: 0.8 }), 18);
    expect([g.rows[0].movement_slug, g.rows[0].sets, g.rows[0].reps]).toEqual(["countermovement_jump", 3, 5]);
    expect(governJumps([{ slot: "lift", movement_slug: "back_squat", movement_name: "x", sets: 3, reps: 5 }], cat, athlete(), 18).changed).toBe(false);
  });
});

describe("jump swaps keep the card's required classification (Nov 2 speed_governance_missing)", () => {
  const cat = new Map(ROWS.map((r) => [r.slug, r as any]));
  it("a jump in the conditioning card is never swapped to a jump without a conditioning classification", () => {
    const g = governJumps([{ slot: "conditioning", movement_slug: "sp_drive_bounds_sb", movement_name: "x", sets: 3, reps: 5, why_payload: {} }], cat, athlete({ level: "introduction" }), 16, 3);
    for (const r of g.rows) expect((cat.get(r.movement_slug) as any).conditioning_category).not.toBeNull();
  });
  it("every speed-card swap lands on a row with a speed classification", () => {
    const g = governJumps([{ slot: "speed", movement_slug: "plyo_depth_jump", movement_name: "x", sets: 3, reps: 4, why_payload: {} }], cat, athlete({ level: "intermediate" }), 17);
    for (const r of g.rows) expect((cat.get(r.movement_slug) as any).speed_category).toBeTruthy();
  });
});
