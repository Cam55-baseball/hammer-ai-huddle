import { supabase } from "@/integrations/supabase/client";
import { ENGINE_CONTRACT } from "@/data/ENGINE_CONTRACT";
import type { HammerDailyPlanResult } from "@/lib/hammer/prescription/dailyPlan";

/**
 * The athlete's own app saves the final daily plan — after every overlay and
 * adjustment — so an authorized coach reads the exact same cards, never a
 * coach-side reconstruction. Self-scoped write only; failures are diagnostics,
 * never shown to the athlete and never block the plan.
 */
export function planSnapshotPayload(plan: HammerDailyPlanResult, sport: string, planDate: string) {
  return {
    sport,
    plan_date: planDate,
    engine_version: ENGINE_CONTRACT.version,
    blocks: plan.blocks.map((b) => ({
      modality: b.modality,
      title: b.title,
      status: b.status,
      phase: b.phase,
      durationMin: b.durationMin,
      route: b.route,
      because: [...(b.because ?? [])],
      roadmapReason: b.roadmapReason,
      drills: b.drills.map((d) => ({
        name: d.name,
        slug: d.slug ?? null,
        dosage: d.dosage,
        stage: d.stage ?? null,
        cue: d.cue ?? null,
        prescriptionOrigin: d.prescriptionOrigin ?? null,
      })),
    })),
  };
}

export async function savePlanSnapshot(userId: string, plan: HammerDailyPlanResult, sport: string, planDate: string): Promise<void> {
  const { error } = await supabase.from("athlete_plan_snapshots").upsert({
    user_id: userId,
    plan_date: planDate,
    sport,
    engine_version: ENGINE_CONTRACT.version,
    payload: planSnapshotPayload(plan, sport, planDate),
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,plan_date,sport" });
  if (error) console.debug("[plan-snapshot] save failed", error.message);
}
