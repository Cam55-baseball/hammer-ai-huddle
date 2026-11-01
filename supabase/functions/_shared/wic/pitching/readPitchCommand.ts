import { commandStatsFromLines } from './roleCycle.ts';
import { startingStandards } from '../masteryPitchingStandards.ts';
import { projectMasterySources } from '../../generated/hammerBlockBuilder.mjs';

/** The caller's JWT owns every read. Partial/unknown evidence never creates a day. */
export async function readPitchCommand(db: any, userId: string, sport: 'baseball' | 'softball', date: string,
  goalIds: string[] = [], analysisFindings: string[] = []) {
  const missing = { walkRate: null, walkMax: null, stats: [], goalIds, analysisFindings };
  const [settings, evidence, lines] = await Promise.all([
    db.from('mastery_identity_settings').select('*').eq('sport', sport).maybeSingle(),
    db.rpc('mastery_identity_evidence', { p_sport: sport, p_date: date, p_athlete: userId }),
    db.rpc('mastery_pitching_lines', { p_sport: sport, p_date: date, p_athlete: userId }),
  ]);
  if (settings.error || evidence.error || lines.error || !evidence.data || !Array.isArray(lines.data)) return missing;
  try {
    const identity = projectMasterySources({ ...evidence.data, date }, sport, settings.data);
    const level = identity.level;
    if (!level) return missing;
    return { goalIds, analysisFindings, walkRate: identity.pitching?.latest?.bb ?? null,
      walkMax: startingStandards(sport, level, settings.data ?? {}).find(s => s.key === 'bb_pct')?.value ?? null,
      stats: commandStatsFromLines(lines.data, sport, level, settings.data ?? {}, identity.pitching?.current?.size ?? 0) };
  } catch { return missing; }
}