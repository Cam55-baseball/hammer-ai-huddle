/**
 * Evidence: the game-day override lifts the schedule cap and nothing else.
 *
 * Runs the real gate against real catalog rows for three cases that must stay
 * blocked with the override on: a deep_flexion movement for a 14-year-old, an
 * age-gated movement, and a shoulder_end_range movement for an in-season
 * thrower. The override lives in `resolveGameProximity`; `checkSafetyGate`
 * cannot even see it — that is the structural half of the proof.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkSafetyGate } from "../../../supabase/functions/_shared/wic/domainGate.ts";
import { resolveGameProximity, type ScheduledGame } from "../../../supabase/functions/_shared/wic/schedule/gameProximity.ts";

const url = Deno.env.get("SUPABASE_URL")!;
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
const db = createClient(url, key);

const PLAN = "2026-09-11";
const games: ScheduledGame[] = [
  { id: "g1", date: PLAN, time: "18:00", source: "gp_games", label: "vs Riverside" },
];

const off = resolveGameProximity(games, PLAN, {});
const on = resolveGameProximity(games, PLAN, { athleteOverride: true });
console.log("SCHEDULE CAP  before:", { primerOnly: off.primerOnly }, " after:", { primerOnly: on.primerOnly, applied: on.overrideApplied });

async function one(filter: (q: any) => any, label: string, ctx: Record<string, unknown>) {
  const { data } = await filter(
    db.from("wk_movement_catalog").select("slug,name,deep_flexion,eccentric_overload,shoulder_end_range,min_age_years,equipment,season_legality,category").eq("is_active", true),
  ).limit(1);
  const m = (data ?? [])[0];
  if (!m) return console.log(label, "NO ROW");
  const res = checkSafetyGate(m as any, ctx as any);
  console.log(label, m.slug, "->", res, "(override active:", on.overrideApplied, ")");
}

await one((q: any) => q.eq("deep_flexion", true), "deep_flexion / 14yo:", { ageYears: 14, trainingAgeClass: "beginner", seasonPhase: "offseason", isThrowingAthlete: false });
await one((q: any) => q.gt("min_age_years", 15), "age gate / 13yo:", { ageYears: 13, trainingAgeClass: "intermediate", seasonPhase: "offseason", isThrowingAthlete: false });
await one((q: any) => q.eq("shoulder_end_range", true), "shoulder_end_range / in-season thrower:", { ageYears: 22, trainingAgeClass: "advanced", seasonPhase: "in_season", isThrowingAthlete: true });
