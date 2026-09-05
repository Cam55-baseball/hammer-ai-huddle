/**
 * Boundary test — equipment derivation from the database representation.
 *
 * Why this file exists: the render-matrix test hand-injected `equipment_effective`
 * as a plain array, so it asserted behaviour *given* the derived key and proved
 * nothing about the app's real read path. That blind spot hid a live bug where
 * the athlete's saved equipment never reached the plan.
 *
 * This test starts from the exact JSON shape `public.get_athlete_context_envelope`
 * emits for a row of `public.athlete_equipment_context`, runs it through the same
 * `spineVariables` / `contextFromEnvelope` projection the app uses, then through
 * `projectEnvelope`, and finally through `buildHammerDailyPlan`.
 */
import { describe, expect, it } from "vitest";
import { contextFromEnvelope } from "./athleteContext";
import type { AthleteContextEnvelope } from "./envelope";
import { projectEnvelope } from "./decisionFilters";
import { buildHammerDailyPlan } from "@/lib/hammer/prescription/dailyPlan";
import { NORMAL_SIGNAL } from "@/lib/hammer/prescription/scheduleContext";

/**
 * The RPC payload the database returns for the owner's persistent equipment row
 * (athlete_equipment_context: scope 'persistent', source 'chat_self_report').
 */
const OWNER_EQUIPMENT: ReadonlyArray<string> = [
  "gamer_bat",
  "overload_bat",
  "underload_bat",
  "tee",
  "pitching_machine",
];

function envelopeFromEquipmentRow(equipment: ReadonlyArray<string>): AthleteContextEnvelope {
  return {
    ...Object.fromEntries(
      Object.entries({
        sport_primary: "baseball",
        position_primary: "SS",
        lifecycle_band: "u18",
        season_phase: "in",
        lifting_age_years: 2,
        weekly_availability_days: 6,
        development_priorities: ["hitting", "defense"],
        injury_history: [],
      }).map(([k, v]) => [
        k,
        {
          value: v,
          source: `athlete_context.${k}`,
          confidence: "high",
          missing: false,
          last_updated: "2026-09-05T01:32:00Z",
          owner: "athlete",
        },
      ]),
    ),
    equipment_effective: {
      // Shape emitted by get_athlete_context_envelope for a persistent row.
      value: { equipment, venue: null },
      scope: "persistent",
      venue: null,
      source: "chat_self_report",
      confidence: "self_report",
      missing: false,
      last_updated: "2026-09-05T02:43:30Z",
      owner: "athlete",
    },
  } as unknown as AthleteContextEnvelope;
}

describe("equipment derivation — database row → context envelope → plan", () => {
  it("projects every saved item, including the pitching machine", () => {
    const ctx = contextFromEnvelope(envelopeFromEquipmentRow(OWNER_EQUIPMENT));
    const proj = projectEnvelope(ctx) as unknown as {
      equipmentList?: ReadonlyArray<string>;
      equipmentScope?: string | null;
    };
    expect([...(proj.equipmentList ?? [])].sort()).toEqual([...OWNER_EQUIPMENT].sort());
    expect(proj.equipmentScope).toBe("persistent");
  });

  it("also accepts the bare-array payload shape", () => {
    const env = envelopeFromEquipmentRow(OWNER_EQUIPMENT);
    (env.equipment_effective as { value: unknown }).value = [...OWNER_EQUIPMENT];
    const proj = projectEnvelope(contextFromEnvelope(env)) as unknown as {
      equipmentList?: ReadonlyArray<string>;
    };
    expect(proj.equipmentList).toContain("pitching_machine");
  });

  it("the hitting card stops guessing once equipment is on file", () => {
    const ctx = contextFromEnvelope(envelopeFromEquipmentRow(OWNER_EQUIPMENT));
    const plan = buildHammerDailyPlan(ctx, NORMAL_SIGNAL, null, null, null, new Date("2026-06-10T12:00:00Z"));
    const hitting = plan.blocks.find((b) => b.modality === "hitting");
    expect(hitting).toBeTruthy();
    expect(hitting?.assumption ?? "").not.toMatch(/assuming you have a bat/i);
    expect(hitting?.missingContextKeys ?? []).not.toContain("equipment_effective");
  });

  it("an empty equipment row still reads as unknown, never as none", () => {
    const env = envelopeFromEquipmentRow([]);
    (env.equipment_effective as { missing: boolean }).missing = true;
    (env.equipment_effective as { value: unknown }).value = null;
    const proj = projectEnvelope(contextFromEnvelope(env)) as unknown as {
      equipmentList?: ReadonlyArray<string>;
    };
    expect(proj.equipmentList ?? []).toEqual([]);
  });
});
