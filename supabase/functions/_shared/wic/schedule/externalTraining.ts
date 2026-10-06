/**
 * Training completed in the other programs (Iron Bambino, Heat Factory,
 * The Unicorn, Speed Lab / Explosive Conditioning, training blocks, custom
 * workouts) as Hammers Today day kinds, read through the service-only
 * `wk_external_training_days` function. Completed work only — never planned.
 */
export interface ExternalDay { day: string; kind: "lift" | "hard_run"; intensity: string; source: string }

export async function loadExternalTraining(admin: any, userId: string, from: string, to: string): Promise<ExternalDay[]> {
  try {
    const { data, error } = await admin.rpc("wk_external_training_days", { p_user: userId, p_from: from, p_to: to });
    if (error) return [];
    return ((data ?? []) as any[]).map((r) => ({ day: String(r.day).slice(0, 10), kind: r.kind, intensity: r.intensity, source: r.source }));
  } catch {
    return [];
  }
}

/** Merge external days into the final-check inputs for `planDate`. */
export function mergeExternal(
  ext: readonly ExternalDay[],
  planDate: string,
  priorLiftDates: string[],
  priorKindDates: Partial<Record<"hard_run" | "high_jump" | "bat_over_under", string[]>>,
): { priorLiftDates: string[]; priorKindDates: typeof priorKindDates; sameDayExternal: { lift: boolean; hard_run: boolean } } {
  const lifts = new Set(priorLiftDates);
  const runs = new Set(priorKindDates.hard_run ?? []);
  let liftToday = false, runToday = false;
  for (const e of ext) {
    if (e.day > planDate) continue;
    if (e.day === planDate) {
      if (e.kind === "lift") liftToday = true;
      if (e.kind === "hard_run") runToday = true;
      continue;
    }
    if (e.kind === "lift") lifts.add(e.day);
    if (e.kind === "hard_run") runs.add(e.day);
  }
  return {
    priorLiftDates: [...lifts],
    priorKindDates: { ...priorKindDates, hard_run: [...runs] },
    sameDayExternal: { lift: liftToday, hard_run: runToday },
  };
}
