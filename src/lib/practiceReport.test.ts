import { describe, expect, it } from 'vitest';
import { loggedPracticeReport } from '../../supabase/functions/_shared/practiceReport';
import { generateInsights, getTotalReps } from './sessionInsights';

describe('practice evidence honesty', () => {
  it('shows exact-side bunt successes from entered outcomes, never an inferred grade', () => {
    const report=loggedPracticeReport({session_date:'2026-10-25',drill_blocks:[{bunt_outcomes:[{side:'R',type:'drag',attempts:7,successes:3},{side:'L',type:'drag',attempts:2,successes:3}]}]});
    expect(report.performanceBreakdown.situationalSplits.map(row=>row.value)).toEqual(['3 / 7']);
    expect(report.rootCauseAnalysis).toEqual([]);
  });
  it('one entered tee rep never becomes a visual or cognitive fault or dose', () => {
    const report = loggedPracticeReport({ session_date: '2026-10-20', drill_blocks: [{ drill_type: 'tee', volume: 1, execution_grade: 60 }] });
    expect(report.rootCauseAnalysis).toEqual([]);
    expect(report.priorityStack).toEqual([]);
    expect(report.prescriptiveFixes).toEqual([]);
    expect(report.gameTransfer).toEqual([]);
    expect(report.adaptiveProgression).toBeNull();
    expect(report.nextSessionFocus).toBeNull();
  });
  it('preserves entered execution grade and rep count with source/date', () => {
    const report = loggedPracticeReport({ session_date: '2026-10-20', drill_blocks: [{ drill_type: 'tee', volume: 1, execution_grade: 60 }] });
    expect(report.performanceBreakdown.situationalSplits.map(s => s.value)).toEqual(['1', '60']);
    expect(report.performanceBreakdown.situationalSplits[1].context).toBe('Athlete-entered practice log · 2026-10-20');
  });
  it('coach-entered log remains a human input, not inferred fault evidence', () => {
    const report = loggedPracticeReport({ coach_id: 'test-coach', session_date: '2026-10-20', drill_blocks: [{ volume: 2, execution_grade: 65 }] });
    expect(report.performanceBreakdown.situationalSplits[1].value).toBe('65');
    expect(report.performanceBreakdown.situationalSplits[1].context).toBe('Coach-entered practice log · 2026-10-20');
    expect(report.rootCauseAnalysis).toHaveLength(0);
  });
  it('never invents missing values or counts invalid reps/grades', () => {
    const report = loggedPracticeReport({ drill_blocks: [null, {}, { volume: -1, execution_grade: NaN }, { volume: 0.5, execution_grade: 81 }] });
    expect(report.performanceBreakdown.situationalSplits).toEqual([]);
    expect(getTotalReps([{ volume: -2 }, { volume: 0.5 }, { volume: 1 }])).toBe(1);
  });
  it.each(['hitting', 'pitching', 'throwing', 'fielding', 'baserunning', 'bunting'])('derived %s scores never create fallback faults or cues', (module) => {
    const result = generateInsights({ decision: 66.7, competitive_execution: 46.7, barrel_pct: 100, whiff_pct: 100 }, [{ volume: 1 }], module);
    expect(result.win).toBeNull(); expect(result.focus).toBeNull(); expect(result.nextRepCue).toBeNull();
    expect(result.focusMetric).toBeNull(); expect(result.keyMetrics).toEqual([]);
  });
});