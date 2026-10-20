import { describe, it, expect } from 'vitest';
import { analysesDueToday } from './analysisPromptRules';
import { requiredAnalyses } from '../assessment/initialAssessment';

describe('unreleased analysis reminder', () => {
  it('OFF produces no analysis recording reminders even when overdue', () => {
    expect(analysesDueToday({ enabled: false, today: '2026-10-20', included: ['hitting'], prescribed: ['hitting'], latest: {} })).toEqual([]);
  });
  it('no prescribed module today means no extra activity', () => {
    expect(analysesDueToday({ enabled: true, today: '2026-10-20', included: ['hitting'], prescribed: [], latest: {} })).toEqual([]);
  });
  it('invalid source date never becomes a due recording', () => {
    expect(analysesDueToday({ enabled: true, today: '2026-10-20', included: ['hitting'], prescribed: ['hitting'], latest: { hitting: 'invalid' } })).toEqual([]);
  });
  for (const sport of ['baseball', 'softball']) for (const tier of ['5tool', 'pitcher', 'golden2way']) {
    it(`${sport} ${tier}: 56 days, six-week proposal respects entitlement/prescribed days and saved clip`, () => {
      const included = requiredAnalyses([`${sport}_${tier}`]);
      let total = 0;
      for (let day = 0; day < 56; day++) {
        const at = new Date('2026-10-20T12:00:00Z'); at.setUTCDate(at.getUTCDate() + day);
        const today = at.toISOString().slice(0, 10);
        const latest = Object.fromEntries(included.map(module => [module, '2026-10-20']));
        const input = { enabled: true, today, included, prescribed: day % 7 === 0 ? included : [], latest };
        expect(analysesDueToday(input)).toEqual(day >= 42 && day % 7 === 0 ? included : []);
        expect(analysesDueToday({ ...input, enabled: false })).toEqual([]);
        total += analysesDueToday(input).length;
      }
      expect(total).toBe(2 * included.length);
      expect(analysesDueToday({ enabled: true, today: '2026-12-01', included, prescribed: included, latest: Object.fromEntries(included.map(module => [module, '2026-12-01'])) })).toEqual([]);
    });
  }
});