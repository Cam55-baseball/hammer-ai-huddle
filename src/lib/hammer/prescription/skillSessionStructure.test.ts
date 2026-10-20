import { describe, expect, it } from 'vitest';
import { structureSkillSession, type SkillSessionOptions } from './skillSessionStructure';
import type { DrillStep } from './dailyPlan';

const options = (skill: SkillSessionOptions['skill'], sport: SkillSessionOptions['sport'] = 'baseball'): SkillSessionOptions => ({
  skill, sport, owned: new Set(['field', 'glove', 'ball']), injuryRegions: [], recoveryDay: false,
});
const running: DrillStep[] = [{ name: 'Lead footwork', dosage: '10 reps' }, { name: 'Pickoff reads', dosage: '10 reps' }, { name: 'First-to-third / tag-up scenarios', dosage: '5 reps' }];
const fielding: DrillStep[] = [{ name: 'Footwork', dosage: '10 reps' }, { name: 'Backhand reads', dosage: '3×8', executionKind: 'fielding_reads' }];

describe('existing-rep execution structure', () => {
  for (const sport of ['baseball', 'softball'] as const) {
    it(`${sport}: baserunning keeps 5 scenario reps and adds no logging exercise`, () => {
      const result = structureSkillSession(running, options('baserunning', sport));
      expect(result[0].stage).toBe('prep');
      expect(result.find(row => row.stage === 'full_go')?.dosage).toBe('5 reps');
      expect(result.filter(row => row.stage !== 'log').map(row => row.dosage)).toEqual(['10 reps', '10 reps', '5 reps']);
      expect(result).toHaveLength(3);
    });
    it(`${sport}: fielding preserves all reps and adds no throwing dose`, () => {
      const result = structureSkillSession(fielding, options('defense', sport));
      expect(result.find(row => row.stage === 'full_go')?.dosage).toBe('3×8');
      expect(result.filter(row => row.stage !== 'log').map(row => row.dosage)).toEqual(['10 reps', '3×8']);
    });
    for (const injury of ['hamstring', 'ankle', 'knee', 'groin', 'shoulder']) it(`${sport}: ${injury} never receives new game-speed work`, () => {
      for (const skill of ['baserunning', 'defense'] as const) {
        expect(structureSkillSession(skill === 'defense' ? fielding : running, { ...options(skill, sport), injuryRegions: [injury] }).some(row => row.stage === 'full_go')).toBe(false);
      }
    });
    it(`${sport}: unknown space or recovery never unlocks execution`, () => {
      expect(structureSkillSession(running, { ...options('baserunning', sport), owned: new Set() }).some(row => row.stage === 'full_go')).toBe(false);
      expect(structureSkillSession(running, { ...options('baserunning', sport), recoveryDay: true }).some(row => row.stage === 'full_go')).toBe(false);
      expect(structureSkillSession(fielding, { ...options('defense', sport), owned: new Set(['field']) }).some(row => row.stage === 'full_go')).toBe(false);
    });
  }
  it('off-season hitting moves existing contrast ahead of execution without changing dose', () => {
    const prep: DrillStep = { name: 'Prep', dosage: '3 rounds of 10', stage: 'prep' };
    const compete: DrillStep = { name: 'Compete', dosage: '40 swings', stage: 'full_go' };
    const contrast: DrillStep = { name: 'Contrast', dosage: '3 rounds', stage: 'drills' };
    const log: DrillStep = { name: 'Actuals', dosage: 'Record count', stage: 'log' };
    expect(structureSkillSession([prep, compete, contrast, log], options('hitting'))).toEqual([prep, contrast, compete, log]);
  });
  it('a throwing name alone never grants game-speed fielding permission', () => {
    const rows: DrillStep[] = [{ name: 'Prep', dosage: '10 reps' }, { name: 'Backhand & throw across body', dosage: '3×8' }];
    expect(structureSkillSession(rows, options('defense')).some(row => row.stage === 'full_go')).toBe(false);
  });
  it('existing stop conditions survive execution instructions', () => {
    const result = structureSkillSession([fielding[0], { ...fielding[1], stopIf: 'Dizziness — stop.' }], options('defense'));
    expect(result.find(row => row.stage === 'full_go')?.stopIf).toContain('Dizziness — stop.');
  });
  it('owner and first prep slots never become execution', () => {
    const rows = fielding.map(row => ({ ...row, executionKind: 'fielding_reads' as const, prescriptionOrigin: 'owner' as const }));
    expect(structureSkillSession(rows, options('defense')).some(row => row.stage === 'full_go')).toBe(false);
    expect(structureSkillSession([fielding[1]], options('defense'))[0].stage).toBe('prep');
  });
});