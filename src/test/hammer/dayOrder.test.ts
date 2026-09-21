/**
 * Step 21B — order of the day.
 *
 * The lift always sits after practice, game and conditioning. It is never
 * ordered before warm-up, the elastic primer, speed/jumps, skill work,
 * practice/game or conditioning on the same day. The recovery flow is last.
 */
import { describe, expect, it } from "vitest";

import { CARD_REGISTRY, getCard } from "@/lib/wic/cardRegistry";
import { sortCanonical } from "@/lib/wic/ordering";
import { DAY_ORDER_DEFAULT, DAY_ORDER_GAME_DAY } from "@/components/hammer/HammerDailyPlan";

const order = (t: string) => getCard(t as never)!.displayOrder;

describe("order of the day", () => {
  it("places the lift after every earlier item in the day", () => {
    const before = ["readiness", "warmup", "speed", "bat_speed", "practice_or_game", "conditioning"];
    for (const card of before) {
      expect(order(card)).toBeLessThan(order("lift"));
    }
  });

  it("places the recovery flow after the lift", () => {
    expect(order("recovery")).toBeGreaterThan(order("lift"));
  });

  it("never orders the lift before items 1-6 in the registry itself", () => {
    const lift = CARD_REGISTRY.findIndex((c) => c.cardType === "lift");
    const mustPrecede = ["readiness", "warmup", "speed", "bat_speed", "practice_or_game", "conditioning"];
    for (const t of mustPrecede) {
      expect(CARD_REGISTRY.findIndex((c) => c.cardType === t)).toBeLessThan(lift);
    }
  });

  it("sorts real prescription rows with lift slots after conditioning", () => {
    const rows = [
      { slot: "lift", movement_slug: "trap_bar_deadlift", sequence_order: 1 },
      { slot: "conditioning", movement_slug: "tempo_runs", sequence_order: 1 },
      { slot: "speed", movement_slug: "flying_10", sequence_order: 1 },
      { slot: "warmup", movement_slug: "hip_opener", sequence_order: 1 },
      { slot: "recovery", movement_slug: "nasal_breathing", sequence_order: 1 },
    ];
    const slots = sortCanonical(rows).map((r) => r.slot);
    expect(slots).toEqual(["warmup", "speed", "conditioning", "lift", "recovery"]);
  });

  it("states the athlete-facing order with the lift seventh", () => {
    expect(DAY_ORDER_DEFAULT).toEqual([
      "Warm-up & mobility",
      "Elastic primer",
      "Speed & jumps",
      "Skill work",
      "Practice or game",
      "Conditioning",
      "Lift",
      "Recovery flow",
    ]);
    expect(DAY_ORDER_DEFAULT.indexOf("Lift")).toBe(6);
    for (const earlier of DAY_ORDER_DEFAULT.slice(0, 6)) {
      expect(DAY_ORDER_DEFAULT.indexOf(earlier)).toBeLessThan(DAY_ORDER_DEFAULT.indexOf("Lift"));
    }
  });

  it("never lists a lift before the game on a game day", () => {
    expect(DAY_ORDER_GAME_DAY.some((s) => /lift/i.test(s))).toBe(false);
  });
});
