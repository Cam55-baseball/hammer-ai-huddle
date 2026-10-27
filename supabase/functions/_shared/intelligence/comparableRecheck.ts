import { judgeComparableOutcome } from '../_shared/intelligence/comparableOutcome.ts';

export interface ClipMeasure { id: string; user_id: string; sport: string; module: string; created_at: string; efficiency_score: number | null }
export interface Advice { id: string; user_id: string; area: string; created_at: string; followed_at: string | null; baseline_value: number | null }
/** Recover only unambiguous provenance for the existing efficiency-score recommendation contract. */
export function comparableClipPair(rec: Advice, clips: readonly ClipMeasure[]) {
  const followed = Date.parse(rec.followed_at ?? '');
  const created = Date.parse(rec.created_at);
  if (!Number.isFinite(followed) || !Number.isFinite(created) || rec.baseline_value === null) return null;
  const own = clips.filter(c => c.user_id === rec.user_id && c.module === rec.area.toLowerCase()
    && ['baseball', 'softball'].includes(c.sport) && Number.isFinite(c.efficiency_score) && Number.isFinite(Date.parse(c.created_at)));
  const before = own.filter(c => Date.parse(c.created_at) <= created && c.efficiency_score === rec.baseline_value);
  // Existing advice has no sport/source ID: ambiguity means missing evidence, never choose a sport.
  if (before.length !== 1) return null;
  const baseline = before[0];
  const after = own.filter(c => c.sport === baseline.sport && Date.parse(c.created_at) - followed >= 14 * 86400000
    && Date.parse(c.created_at) - followed <= 28 * 86400000)
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  const observation = after[0];
  if (!observation || baseline.id === observation.id) return null;
  const daysAfter = (Date.parse(observation.created_at) - followed) / 86400000;
  const outcome = judgeComparableOutcome({ before: baseline.efficiency_score, after: observation.efficiency_score,
    observations: new Set([baseline.id, observation.id]).size, daysAfter });
  return { outcome, before: baseline.efficiency_score, after: observation.efficiency_score, measuredAt: observation.created_at };
}

export async function recheckComparablePlayer(sb: any, userId: string) {
  const { data: recs, error } = await sb.from('intelligence_recommendations')
    .select('id,user_id,area,created_at,baseline_value,followed_at').eq('user_id', userId)
    .eq('followed', true).is('outcome', null).limit(20);
  if (error) throw error;
  const results: { id: string; outcome: string | null }[] = [];
  for (const rec of recs ?? []) {
    // bounded query; a capped result is incomplete and cannot prove provenance.
    const { data: clips, error: clipError } = await sb.from('videos')
      .select('id,user_id,sport,module,created_at,efficiency_score').eq('user_id', userId).eq('module', rec.area.toLowerCase())
      .eq('status', 'completed').not('efficiency_score', 'is', null).order('created_at').limit(1000);
    if (clipError) throw clipError;
    const pair = clips?.length < 1000 ? comparableClipPair(rec, clips ?? []) : null;
    const outcome = pair?.outcome ?? 'need_more_data';
    // Missing evidence remains pending so later observations can still be checked.
    if (pair && outcome !== 'need_more_data') {
      const { error: saveError } = await sb.from('intelligence_recommendations').update({
        baseline_value: pair.before, recheck_value: pair.after, outcome, checked_at: pair.measuredAt,
      }).eq('id', rec.id).eq('user_id', userId).is('outcome', null);
      if (saveError) throw saveError;
    }
    results.push({ id: rec.id, outcome: outcome === 'need_more_data' ? null : outcome });
  }
  return results;
}