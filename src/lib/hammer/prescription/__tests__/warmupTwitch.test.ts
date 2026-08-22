import { describe, it, expect } from "vitest";
import {
  buildWarmup,
  equipmentFor,
  expandEquipment,
  WARMUP_LIBRARY,
  TWITCH_ROLES,
  SINGLE_LEG_MIN_SHARE,
  type LifecycleClass,
  type WarmupContext,
} from "../warmupLibrary";

const CONTEXTS: WarmupContext[] = [
  "game_day", "in_season_practice", "in_season_default", "speed_day", "lift_day",
  "throwing_day", "hitting_day", "offseason_extended", "recovery_day", "travel_day", "default",
];
const LIFECYCLES: LifecycleClass[] = ["youth", "beginner", "intermediate", "advanced", "elite"];

const GYM = ["full_gym", "ladder", "med_ball", "box", "bands", "bat", "tennis_ball"];

describe("fast-twitch warm-up primer", () => {
  it("catalog: every twitch drill has a full setup, cue, axis and dose", () => {
    const twitch = WARMUP_LIBRARY.filter((d) => TWITCH_ROLES.includes(d.role));
    expect(twitch.length).toBeGreaterThan(20);
    for (const d of twitch) {
      expect(d.axis, d.slug).toBeDefined();
      expect((d.setup ?? "").length, d.slug).toBeGreaterThan(40);
      expect((d.cue ?? "").length, d.slug).toBeGreaterThan(60);
      expect(d.baseDose.length, d.slug).toBeGreaterThan(3);
    }
  });

  it("catalog: every gear-bound twitch drill declares a reachable fallback", () => {
    for (const d of WARMUP_LIBRARY) {
      const needs = equipmentFor(d).filter((e) => !["wall", "open_space", "floor", "towel"].includes(e));
      if (needs.length === 0) continue;
      const fb = d.fallbackSlug;
      if (!fb) continue;
      expect(WARMUP_LIBRARY.some((x) => x.slug === fb), `${d.slug} → ${fb}`).toBe(true);
    }
  });

  it("never prescribes a drill the athlete has no equipment for", () => {
    const bare = expandEquipment([], "bodyweight");
    for (const context of CONTEXTS) {
      for (const lifecycle of LIFECYCLES) {
        const built = buildWarmup({
          context, lifecycle, gameDay: context === "game_day", daySeed: 42,
          equipment: [], venue: "bodyweight",
        });
        for (const d of built.drills) {
          const row = WARMUP_LIBRARY.find((x) => x.slug === d.slug)!;
          for (const need of equipmentFor(row)) {
            expect(bare.has(need), `${context}/${lifecycle}: ${d.slug} needs ${need}`).toBe(true);
          }
        }
      }
    }
  });

  it("ladder work still ships with no ladder (equipment-free variant)", () => {
    const built = buildWarmup({
      context: "speed_day", lifecycle: "advanced", gameDay: false, daySeed: 7,
      equipment: [], venue: "bodyweight",
    });
    const ladder = built.drills.filter((d) => d.role === "ladder_quickness");
    expect(ladder.length).toBeGreaterThan(0);
    for (const d of ladder) expect(d.slug.startsWith("wu_chalk_line")).toBe(true);
  });

  it("holds the single-leg majority across every context and lifecycle", () => {
    for (const context of CONTEXTS) {
      for (const lifecycle of LIFECYCLES) {
        for (const equipment of [[], GYM]) {
          const built = buildWarmup({
            context, lifecycle, gameDay: context === "game_day", daySeed: 101,
            equipment, venue: equipment.length ? "full_gym" : "bodyweight",
          });
          if (built.singleLegShare === null) continue;
          expect(
            built.singleLegShare,
            `${context}/${lifecycle}: ${built.singleLegShare}`,
          ).toBeGreaterThanOrEqual(SINGLE_LEG_MIN_SHARE - 1e-9);
        }
      }
    }
  });

  it("game day never ships maximal ground-force or non-legal twitch work", () => {
    for (const lifecycle of LIFECYCLES) {
      const built = buildWarmup({
        context: "game_day", lifecycle, gameDay: true, daySeed: 5, equipment: GYM, venue: "full_gym",
      });
      for (const d of built.drills) {
        const row = WARMUP_LIBRARY.find((x) => x.slug === d.slug)!;
        expect(row.gameDayLegal, d.slug).toBe(true);
      }
      expect(built.drills.some((d) => d.role === "ground_force")).toBe(false);
    }
  });

  it("suppressTwitch removes the whole twitch layer", () => {
    const built = buildWarmup({
      context: "speed_day", lifecycle: "elite", gameDay: false, daySeed: 3,
      equipment: GYM, venue: "full_gym", suppressTwitch: true,
    });
    expect(built.drills.some((d) => TWITCH_ROLES.includes(d.role))).toBe(false);
    expect(built.singleLegShare).toBeNull();
  });

  it("injury regions veto the drills that load them", () => {
    const built = buildWarmup({
      context: "speed_day", lifecycle: "elite", gameDay: false, daySeed: 9,
      equipment: GYM, venue: "full_gym", injuryRegions: ["knee", "achilles"],
    });
    for (const d of built.drills) {
      const row = WARMUP_LIBRARY.find((x) => x.slug === d.slug)!;
      for (const r of row.regions ?? []) expect(["knee", "achilles"]).not.toContain(r);
    }
  });

  it("is deterministic for the same inputs", () => {
    for (let i = 0; i < 25; i++) {
      const a = buildWarmup({ context: "speed_day", lifecycle: "advanced", gameDay: false, daySeed: 1234, equipment: GYM, venue: "full_gym" });
      const b = buildWarmup({ context: "speed_day", lifecycle: "advanced", gameDay: false, daySeed: 1234, equipment: GYM, venue: "full_gym" });
      expect(a.drills.map((d) => d.slug)).toEqual(b.drills.map((d) => d.slug));
    }
  });

  it("never repeats a drill inside one warm-up", () => {
    for (const context of CONTEXTS) {
      const built = buildWarmup({ context, lifecycle: "elite", gameDay: context === "game_day", daySeed: 77, equipment: GYM, venue: "full_gym" });
      const slugs = built.drills.map((d) => d.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    }
  });
});
