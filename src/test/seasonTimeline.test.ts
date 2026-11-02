import { describe, expect, it } from 'vitest';
import { seasonWithTimeline } from '../../supabase/functions/_shared/seasonTimeline';
import { resolveSeasonPhase } from '../../supabase/functions/_shared/seasonPhase';
import { resolveWkPhase } from '../../supabase/functions/_shared/wkPhaseQuarter';
import { resolvePhaseState } from '../../supabase/functions/_shared/phaseState';
import type { TimelineEntry } from '../../supabase/functions/_shared/wic/schedule/timeline';
const entry = (phase: string): TimelineEntry => ({ id: 'season', tag: 'SEASON', start_date: '2026-10-29', end_date: '2026-10-29', dates: null, source: 'inbox', payload: { phase }, summary: '', created_at: '2026-10-29T02:02:00Z', undone_at: null });
describe('Update Hammer dated season changes', () => {
  it('manual off-season beats the newer Oct30 timeline across Nov2–8 for builder and season card', () => {
    const settings = { season_status: 'off_season', season_status_manual: true, season_status_manual_at: '2026-10-29T02:03:00Z', in_season_start_date: '2026-10-30', in_season_end_date: '2026-11-20' };
    const timeline = [{ ...entry('in_season'), start_date: '2026-10-30', created_at: '2026-10-30T03:28:27.334127Z' }];
    for (let d = 2; d <= 8; d++) {
      const date = `2026-11-${String(d).padStart(2, '0')}`;
      const canonical = seasonWithTimeline(settings, timeline, date);
      expect(resolveSeasonPhase(canonical, date)).toMatchObject({ phase: 'off_season', source: 'manual' });
      expect(resolveWkPhase(canonical, new Date(`${date}T12:00:00Z`), date).phase).toBe('os_q1');
      expect(resolvePhaseState({ settings: canonical, date, heights: [] }).season).toBe('off_season');
    }
  });
  for (const phase of ['off_season', 'in_season', 'preseason', 'post_season']) it(`${phase} applies today and upcoming days`, () => {
    for (const date of ['2026-10-29', '2026-11-04']) expect(resolveSeasonPhase(seasonWithTimeline({ season_status: 'in_season' }, [entry(phase)], date), date).phase).toBe(phase);
  });
  it('future season change does not change today', () => expect(seasonWithTimeline({ season_status: 'in_season' }, [{ ...entry('off_season'), start_date: '2026-11-01' }], '2026-10-29').season_status).toBe('in_season'));
  it('a newer explicit manual answer wins', () => expect(seasonWithTimeline({ season_status: 'preseason', season_status_manual: true, season_status_manual_at: '2026-10-29T02:03:00Z' }, [entry('off_season')], '2026-10-29').season_status).toBe('preseason'));
  it('undone entry cannot switch season', () => expect(seasonWithTimeline({ season_status: 'in_season' }, [{ ...entry('off_season'), undone_at: '2026-10-29T02:03:00Z' }], '2026-10-29').season_status).toBe('in_season'));
  it('dated in-season window ends inclusively Nov 20', () => {
    const e={...entry('in_season'),payload:{phase:'in_season',window_end:'2026-11-20'}};
    expect(resolveSeasonPhase(seasonWithTimeline({},[e],'2026-11-20'),'2026-11-20')).toMatchObject({phase:'in_season',daysUntilNextPhase:0});
    expect(resolveSeasonPhase(seasonWithTimeline({},[e],'2026-11-21'),'2026-11-21').phase).toBe('off_season');
  });
  it('a later date-form save supersedes the older quick phase answer', () => {
    const settings={season_status:'in_season',season_status_manual:false,season_status_manual_at:'2026-10-29T02:03:00Z',in_season_start_date:'2026-10-29',in_season_end_date:'2026-11-20'};
    expect(resolveSeasonPhase(seasonWithTimeline(settings,[entry('off_season')],'2026-10-30'),'2026-10-30').phase).toBe('in_season');
  });
});