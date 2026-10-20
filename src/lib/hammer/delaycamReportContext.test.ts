import { describe, expect, it } from 'vitest';
import { delaycamReportContext, recurringHittingMechanics, type DelaycamFindingRow } from './delaycamReportContext';
import { delaycamDue } from './toolPromptRules';

const reports = (sport: string) => Array.from({ length: 5 }, (_, index) => ({
  id: `clip-${index}`, created_at: `2026-10-${15 + index}T12:00:00Z`, sport, module: 'hitting',
}));
const findings = (sport: string, count: number): DelaycamFindingRow[] => Array.from({ length: count }, (_, index) => ({
  video_id: `clip-${index}`, sport, skill_domain: 'hitting', fault_key: 'early_shoulder_rotation',
  correction_key: 'keep_hands_back', movement_key: 'shoulders_turning_early',
}));

describe('saved report context reaches Delaycam cadence', () => {
  for (const sport of ['baseball', 'softball']) {
    it(`${sport}: three distinct matching reports raise the target after a use two days ago`, () => {
      const majorMechanicalFlag = recurringHittingMechanics(reports(sport), findings(sport, 3), sport);
      expect(majorMechanicalFlag).toBe(true);
      expect(delaycamDue({ enabled: true, today: '2026-10-20', skillToday: true, uses: ['2026-10-18'],
        offSeason: false, mechanicsGoal: false, majorMechanicalFlag })).toBe(true);
    });
    it(`${sport}: two findings do not meet three-of-five; clean reports are kept`, () => {
      expect(delaycamReportContext(reports(sport), findings(sport, 2), sport)).toHaveLength(5);
      expect(recurringHittingMechanics(reports(sport), findings(sport, 2), sport)).toBe(false);
    });
    it(`${sport}: duplicate re-runs of a single report cannot create three occurrences`, () => {
      const finding = findings(sport, 1)[0];
      if (!finding) throw new Error('Missing fixture');
      expect(recurringHittingMechanics([...reports(sport), ...reports(sport)], [finding, finding, finding], sport)).toBe(false);
    });
    it(`${sport}: another sport, module, orphan or untagged non-mechanical finding cannot count`, () => {
      const invalid = findings(sport, 3).flatMap(finding => [
        { ...finding, sport: sport === 'baseball' ? 'softball' : 'baseball' },
        { ...finding, skill_domain: 'pitching' }, { ...finding, video_id: 'orphan' },
        { ...finding, correction_key: null, movement_key: null }, { ...finding, sport: null },
      ]);
      expect(recurringHittingMechanics(reports(sport), invalid, sport)).toBe(false);
    });
  }
});