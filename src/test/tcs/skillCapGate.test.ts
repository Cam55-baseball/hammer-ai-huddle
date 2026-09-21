/**
 * Step 24 item 1 — skill work is never capped on thin logs.
 *
 * A low-logging hitter must keep the full prescribed swing dose. Once the
 * athlete really has 8+ logged swing days in the window the cap applies
 * again, and even then it may never cut a skill row out of the day.
 */
import { describe, expect, it } from "vitest";
import { runGovernor } from "../../../supabase/functions/_shared/wic/exposure/governor.ts";
import type { GovItem, Rm28 } from "../../../supabase/functions/_shared/wic/exposure/types.ts";

const rm = (swingMax: number, loggedDays: number): Rm28 => ({
  byChannel: { SWING: swingMax },
  byTier: { "SWING:high": swingMax },
  onDate: { SWING: "2026-09-01" },
  daysObserved: 28,
  loggedDaysByChannel: { SWING: loggedDays },
});

const swings = (sets: number, per: number): GovItem => ({
  slug: "bs_tee_turn_and_burn",
  name: "Tee turn and burn",
  channel: "SWING",
  tier: "high",
  sets,
  amountPerSet: per,
  floorSets: 2,
  substitutionFamily: "bat_speed_tee",
});

const ctx = { block: "B2" as const, inSeason: false, growthMode: false };

describe("skill cap gate", () => {
  it("does not trim swings when the athlete has fewer than 8 logged days", () => {
    const out = runGovernor({ items: [swings(4, 10)], rm28: rm(6, 2), ctx });
    expect(out.trims).toHaveLength(0);
    expect(out.items[0].sets).toBe(4);
    expect(out.diagnostics.SWING.skipped).toBe("insufficient_logged_days");
  });

  it("caps swings once 8 logged days exist", () => {
    const out = runGovernor({ items: [swings(4, 10)], rm28: rm(20, 9), ctx });
    expect(out.trims.length).toBeGreaterThan(0);
    expect(out.items[0].sets).toBeLessThan(4);
  });

  it("never cuts a skill row below its own minimum dose", () => {
    const out = runGovernor({ items: [swings(4, 10)], rm28: rm(1, 12), ctx });
    expect(out.items.filter((i) => i.channel === "SWING")).toHaveLength(1);
    expect(out.items[0].sets).toBe(2);
    expect(out.trims.every((t) => t.action !== "row_dropped")).toBe(true);
  });
});
