import { describe, expect, it } from 'vitest';
import { previousPlanDates, savedPlanReasons, savedTrainingHistory, type SavedPlanBlock } from './planHistory';

const hitting: SavedPlanBlock = { modality: 'hitting', title: 'Hitting', status: 'ready',
  durationMin: 20, because: ['Recorded swing finding'], roadmapReason: 'Off-season slot', drills: [] };
describe('saved coach plan history', () => {
  it('reads exactly the six previous calendar dates, keeping today separate', () => {
    expect(previousPlanDates('2026-10-20')).toEqual(['2026-10-19', '2026-10-18', '2026-10-17', '2026-10-16', '2026-10-15', '2026-10-14']);
    expect(previousPlanDates('2026-03-02')[5]).toBe('2026-02-24');
    expect(previousPlanDates('2026-02-30')).toEqual([]);
  });
  it('shows only successful same-sport saved days without reconstructing unavailable work', () => {
    const rows = savedTrainingHistory([
      { state: 'ok', sport: 'baseball', plan_date: '2026-10-18', blocks: [hitting] },
      { state: 'unavailable', sport: 'baseball', plan_date: '2026-10-17' },
      { state: 'denied', sport: 'baseball', plan_date: '2026-10-19', blocks: [hitting] },
      { state: 'ok', sport: 'softball', plan_date: '2026-10-19', blocks: [hitting] },
      { state: 'ok', sport: 'baseball', plan_date: '2026-10-16', blocks: [{ ...hitting, modality: 'game_iq' }] },
    ], 'baseball');
    expect(rows.map(row => row.plan_date)).toEqual(['2026-10-18', '2026-10-16']);
    expect(rows[0].blocks).toEqual([hitting]);
    expect(rows[1].blocks).toEqual([]);
    expect(savedTrainingHistory(rows, undefined)).toEqual([]);
  });
  it('uses returned evidence first, then returned schedule reason, never restoring redacted health text', () => {
    expect(savedPlanReasons(hitting)).toEqual(['Recorded swing finding']);
    expect(savedPlanReasons({ ...hitting, because: [] })).toEqual(['Off-season slot']);
    expect(savedPlanReasons({ ...hitting, because: [], roadmapReason: '' })).toEqual([]);
  });
});