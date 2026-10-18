export const NO_CHANGE_BAND = 3;
export function judge(baseline: number | null, recheck: number | null) {
  if (baseline == null || recheck == null) return null;
  const change = recheck - baseline;
  return Math.abs(change) < NO_CHANGE_BAND ? "no_change" : change > 0 ? "worked" : "got_worse";
}

// The scheduled path only rechecks existing, followed advice. It never authors a plan or new advice.
export async function recheckPlayer(sb: any, userId: string) {
  const { data: recs, error } = await sb.from("intelligence_recommendations")
    .select("id,area,created_at,baseline_value,followed_at").eq("user_id", userId)
    .eq("followed", true).is("outcome", null).limit(20);
  if (error) throw error;
  const results: { id: string; outcome: string | null }[] = [];
  for (const rec of recs ?? []) {
    const module = String(rec.area).toLowerCase();
    let baseline = rec.baseline_value;
    if (baseline == null) {
      const { data, error } = await sb.from("videos").select("efficiency_score").eq("user_id", userId).eq("module", module)
        .not("efficiency_score", "is", null).lte("created_at", rec.created_at).order("created_at", { ascending: false }).limit(1);
      if (error) throw error;
      baseline = data?.[0]?.efficiency_score ?? null;
    }
    const { data, error } = await sb.from("videos").select("efficiency_score").eq("user_id", userId).eq("module", module)
      .not("efficiency_score", "is", null).gt("created_at", rec.followed_at ?? rec.created_at).order("created_at").limit(1);
    if (error) throw error;
    const recheck = data?.[0]?.efficiency_score ?? null;
    const outcome = judge(baseline, recheck);
    if (outcome) {
      const { error } = await sb.from("intelligence_recommendations").update({ baseline_value: baseline, recheck_value: recheck, outcome, checked_at: new Date().toISOString() })
        .eq("id", rec.id).eq("user_id", userId).is("outcome", null);
      if (error) throw error;
    }
    results.push({ id: rec.id, outcome });
  }
  return results;
}