import { describe, expect, it } from 'vitest';
import { sixWeekPlanDates, sixWeekPlanSummary } from './sixWeekPlanSummary';
import type { SavedCoachPlan, SavedPlanBlock } from './planHistory';
const block: SavedPlanBlock = { modality: 'hitting', title: 'Hitting', status: 'ready', durationMin: 20,
  because: ['Saved swing issue'], roadmapReason: '', drills: [{ name: 'Partner flips', slug: 'partner_flips',
    dosage: '20 swings', stage: 'drills', cue: 'Saved cue', prescriptionOrigin: 'analysis' }] };
const plan = (date: string, overrides: Partial<SavedCoachPlan> = {}): SavedCoachPlan => ({ state: 'ok', sport: 'baseball',
  plan_date: date, health_shared: false, blocks: [block], ...overrides });
describe('six-week saved-plan projection', () => {
  it('never counts replaced coach blocks as active prescribed work', () => {
    const rows = sixWeekPlanSummary([plan('2026-10-20', { blocks: [{ ...block, replacedByCoachRx: 'coach-replacement' }] })], 'baseball', '2026-10-21');
    expect(rows).toEqual([]);
  });
  it('keeps each issue-selected prescription dose and dated reason instead of spreading the latest dose across history', () => {
    const olderDrill = { ...block.drills[0], slug: 'old_flips', dosage: '12 swings' };
    const rows = sixWeekPlanSummary([plan('2026-10-19', { blocks: [{ ...block, because: ['Older saved issue'], drills: [olderDrill] }] }),
      plan('2026-10-20')], 'baseball', '2026-10-21');
    expect(rows[0].savedPlanDays).toBe(2);
    expect(rows[0].practiceIdeas.map(idea => [idea.drill.dosage, idea.date, idea.reasons])).toEqual([
      ['20 swings', '2026-10-20', ['Saved swing issue']], ['12 swings', '2026-10-19', ['Older saved issue']]]);
  });
  it('uses exactly 42 calendar dates including today', () => {
    const dates = sixWeekPlanDates('2026-10-21');
    expect(dates.length).toBe(42);
    expect(dates[0]).toBe('2026-10-21');
    expect(dates[41]).toBe('2026-09-10');
    expect(sixWeekPlanDates('2026-02-30')).toEqual([]);
  });
  it('counts distinct saved category days only, never unavailable, other-sport, future or out-of-window plans', () => {
    const rows = sixWeekPlanSummary([plan('2026-10-20'), plan('2026-10-20'), plan('2026-09-10'),
      plan('2026-09-09'), plan('2026-10-22'), plan('2026-10-19', { sport: 'softball' }),
      plan('2026-10-18', { state: 'unavailable' }), plan('2026-10-17', { state: 'denied' })], 'baseball', '2026-10-21');
    expect(rows[0].savedPlanDays).toBe(2);
    expect(rows[0].firstDate).toBe('2026-09-10');
    expect(rows[0].latestDate).toBe('2026-10-20');
  });
  it('practice ideas retain the exact issue-selected drill and dose without adding work or restoring redacted reasons', () => {
    const rows = sixWeekPlanSummary([plan('2026-10-20')], 'baseball', '2026-10-21');
    expect(rows[0].practiceIdeas).toEqual([{ drill: block.drills[0], date: '2026-10-20', reasons: ['Saved swing issue'] }]);
    const noReasons = sixWeekPlanSummary([plan('2026-10-20', { blocks: [{ ...block, because: [] }] })], 'baseball', '2026-10-21');
    expect(noReasons[0].practiceIdeas).toEqual([]);
  });
  it('schedule-only drills, inaccessible Game IQ and empty work never become issue-linked practice ideas or totals', () => {
    const rows = sixWeekPlanSummary([plan('2026-10-20', { blocks: [
      { ...block, drills: [{ ...block.drills[0], prescriptionOrigin: null }] },
      { ...block, modality: 'game_iq' }, { ...block, modality: 'throwing', drills: [] },
    ] })], 'baseball', '2026-10-21');
    expect(rows.map(row => row.category)).toEqual(['hitting']);
    expect(rows[0].practiceIdeas).toEqual([]);
  });
});