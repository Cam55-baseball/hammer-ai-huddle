import { describe, it, expect } from 'vitest';
import { analysesDueToday, analysisPromptText } from './analysisPromptRules';
import { requiredAnalyses } from '../assessment/initialAssessment';

const iso = (start: string, plus: number) => { const d = new Date(`${start}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + plus); return d.toISOString().slice(0, 10); };

describe('weekly analysis reminder (owner cadence Oct 20)', () => {
  it('OFF produces nothing', () => {
    expect(analysesDueToday({ enabled: false, today: '2026-10-20', included: ['hitting'], prescribed: ['hitting'], latest: {} })).toEqual([]);
  });
  it('only on a day that already has that skill', () => {
    expect(analysesDueToday({ enabled: true, today: '2026-10-20', included: ['hitting'], prescribed: [], latest: {} })).toEqual([]);
  });
  it('invalid source date never becomes a due recording', () => {
    expect(analysesDueToday({ enabled: true, today: '2026-10-20', included: ['hitting'], prescribed: ['hitting'], latest: { hitting: 'invalid' } })).toEqual([]);
  });
  it('a recording in the last 7 days means nothing is due; day 7 it is due again', () => {
    const base = { enabled: true, included: ['hitting', 'throwing'] as const, prescribed: ['hitting', 'throwing'] as const, latest: { hitting: '2026-10-20' } };
    expect(analysesDueToday({ ...base, today: '2026-10-26' })).toEqual([]);
    expect(analysesDueToday({ ...base, today: '2026-10-27' })).toEqual(['throwing']);
  });
  it('a flagged issue wins, then goal order', () => {
    const base = { enabled: true, today: '2026-10-20', included: ['hitting', 'throwing'] as const, prescribed: ['hitting', 'throwing'] as const, latest: {} };
    expect(analysesDueToday({ ...base, goalOrder: ['hitting'], flagged: ['throwing'] })).toEqual(['throwing']);
    expect(analysesDueToday({ ...base, goalOrder: ['throwing', 'hitting'] })).toEqual(['throwing']);
  });
  it('plain words', () => {
    expect(analysisPromptText('hitting')).toBe("Record this week's swing so you can see how you're evolving.");
  });
  for (const sport of ['baseball', 'softball']) for (const tier of ['5tool', 'pitcher', 'golden2way']) {
    it(`${sport} ${tier}: 8 weeks recording each reminder → one a week, every included module rotates in`, () => {
      const included = requiredAnalyses([`${sport}_${tier}`]);
      const latest: Record<string, string> = {};
      const seen = new Set<string>();
      let total = 0;
      for (let day = 0; day < 56; day++) {
        const today = iso('2026-10-20', day);
        const due = analysesDueToday({ enabled: true, today, included, prescribed: included, latest });
        expect(due.length).toBeLessThanOrEqual(1);
        for (const m of due) { latest[m] = today; seen.add(m); total++; }
      }
      expect(total).toBe(8);
      expect([...seen].sort()).toEqual([...included].sort());
    });
  }
});
