import { describe, expect, it } from 'vitest';
import { seasonWithTimeline } from '../../supabase/functions/_shared/seasonTimeline';
import { resolveSeasonPhase } from '../../supabase/functions/_shared/seasonPhase';
import type { TimelineEntry } from '../../supabase/functions/_shared/wic/schedule/timeline';
const entry = (phase: string): TimelineEntry => ({ id: 'season', tag: 'SEASON', start_date: '2026-10-29', end_date: '2026-10-29', dates: null, source: 'inbox', payload: { phase }, summary: '', created_at: '2026-10-29T02:02:00Z', undone_at: null });
describe('Update Hammer dated season changes', () => {
  for (const phase of ['off_season', 'in_season', 'preseason', 'post_season']) it(`${phase} applies today and upcoming days`, () => {
    for (const date of ['2026-10-29', '2026-11-04']) expect(resolveSeasonPhase(seasonWithTimeline({ season_status: 'in_season' }, [entry(phase)], date), date).phase).toBe(phase);
  });
  it('future season change does not change today', () => expect(seasonWithTimeline({ season_status: 'in_season' }, [{ ...entry('off_season'), start_date: '2026-11-01' }], '2026-10-29').season_status).toBe('in_season'));
  it('a newer explicit manual answer wins', () => expect(seasonWithTimeline({ season_status: 'preseason', season_status_manual: true, season_status_manual_at: '2026-10-29T02:03:00Z' }, [entry('off_season')], '2026-10-29').season_status).toBe('preseason'));
  it('undone entry cannot switch season', () => expect(seasonWithTimeline({ season_status: 'in_season' }, [{ ...entry('off_season'), undone_at: '2026-10-29T02:03:00Z' }], '2026-10-29').season_status).toBe('in_season'));
});