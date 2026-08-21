import { supabase } from '@/integrations/supabase/client';
import { mapOutcomeToResult } from '@/lib/analysisToTaxonomy';
import type { SkillDomain, TagSport } from '@/lib/videoRecommendationEngine';
import { emitVideoMoment } from './bus';

/**
 * After a game is marked final, read the logged events and fire the
 * highest-signal moment: whichever area produced the most negative outcomes.
 */
export async function fireGameVideoMoment(gameId: string, sport?: TagSport | null) {
  try {
    const [{ data: abs }, { data: defense }, { data: runs }, { data: pitches }] = await Promise.all([
      (supabase as any).from('gp_at_bats').select('result, contact_quality, batting_side').eq('game_id', gameId).limit(200),
      (supabase as any).from('gp_defense_plays').select('result, error_flag, throwing_side').eq('game_id', gameId).limit(200),
      (supabase as any).from('gp_baserun_events').select('event_type, success').eq('game_id', gameId).limit(200),
      (supabase as any).from('gp_pitches').select('result, perspective').eq('game_id', gameId).limit(400),
    ]);

    const hittingTags: string[] = [];
    let side: 'left' | 'right' | null = null;
    for (const ab of abs || []) {
      if (ab.batting_side === 'left' || ab.batting_side === 'right') side = ab.batting_side;
      for (const raw of [ab.contact_quality, ab.result]) {
        const mapped = raw ? mapOutcomeToResult(String(raw)) : null;
        if (mapped) hittingTags.push(mapped);
      }
    }

    const defenseTags: string[] = [];
    for (const d of defense || []) {
      if (d.error_flag) defenseTags.push('booted_ball');
      const mapped = d.result ? mapOutcomeToResult(String(d.result)) : null;
      if (mapped) defenseTags.push(mapped);
    }

    const runFails = (runs || []).filter((r: any) => r.success === false).length;
    const ownPitches = (pitches || []).filter((p: any) => p.perspective === 'self' || p.perspective === 'pitching');

    const candidates: Array<{ domain: SkillDomain; score: number; tags: string[]; label: string }> = [
      { domain: 'hitting', score: hittingTags.length, tags: hittingTags, label: 'Your at-bats' },
      { domain: 'fielding', score: defenseTags.length, tags: defenseTags, label: 'Your defense' },
      { domain: 'base_running', score: runFails, tags: [], label: 'Your base running' },
      { domain: 'pitching', score: ownPitches.length ? 1 : 0, tags: [], label: 'Your outing' },
    ].sort((a, b) => b.score - a.score);

    const top = candidates[0];
    const picked = top && top.score > 0 ? top : { domain: 'hitting' as SkillDomain, tags: [], label: 'This game' };

    emitVideoMoment({
      kind: 'game_logged',
      skillDomain: picked.domain,
      resultTags: Array.from(new Set(picked.tags)),
      sport: sport ?? null,
      side,
      label: picked.label,
      sourceId: gameId,
    });
  } catch {
    /* suggestions are never allowed to break a game save */
  }
}
