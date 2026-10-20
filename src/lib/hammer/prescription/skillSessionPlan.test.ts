import { describe, expect, it } from 'vitest';
import { buildHammerDailyPlan } from './dailyPlan';
import { selectDefenseDrills } from './defenseLibrary';
import { structureSkillSession } from './skillSessionStructure';
import { NORMAL_SIGNAL } from './scheduleContext';
import type { ContextVariable, HammerAthleteContext } from '@/lib/hammer/context/athleteContext';

function context(sport: string, phase: string, injuries: string[] = []): HammerAthleteContext {
  const values = { sport_primary: sport, position_primary: 'SS', lifecycle_band: 'u18', season_phase: phase,
    lifting_age_years: 2, weekly_availability_days: 6, development_priorities: ['hitting', 'defense'],
    injury_history: injuries, equipment_effective: ['field', 'glove', 'ball', 'gamer_bat', 'tee', 'net', 'overload_bat'] };
  const variables = Object.entries(values).map(([key, value]): ContextVariable => ({ key, value, label: key,
    domain: 'identity', source: 'test', confidence: 'high', missing: false, lastUpdated: null,
    lineage: { owner: 'test', source: 'test', rawConfidence: 'high' } }));
  return { variables, missing: [], missingCount: 0, isLoading: false, envelope: null,
    get<T>(key: string) { return variables.find(row => row.key === key) as ContextVariable<T> | undefined; } };
}

describe('actual plan execution structure and schedule protection', () => {
  for (const sport of ['baseball', 'softball']) for (const phase of ['in', 'off', 'pre']) {
    it(`${sport}/${phase}: eight weeks exercise actual scheduled running and hitting work`, () => {
      let runningDays = 0, hittingDays = 0;
      for (let n = 0; n < 56; n++) {
        const date = new Date(2026, 5, 1 + n);
        const plan = buildHammerDailyPlan(context(sport, phase), NORMAL_SIGNAL, null, null, undefined, date);
        for (const block of plan.blocks.filter(row => row.status === 'ready')) {
          if (block.modality === 'baserunning') {
            const full = block.drills.find(row => row.stage === 'full_go');
            expect(full).toBeDefined();
            expect(full?.dosage).toBe('5 reps');
            expect(full?.executionKind).toBe('baserunning_scenarios');
            if (sport === 'softball') expect(full?.setup).toContain('only when the pitch is released');
            runningDays++;
          }
          if (block.modality === 'hitting') {
            const stages = block.drills.map(row => row.stage);
            expect(stages[0]).toBe('prep');
            expect(stages).toContain('full_go');
            expect(stages[stages.length - 1]).toBe('log');
            expect(stages.lastIndexOf('drills')).toBeLessThan(stages.indexOf('full_go'));
            hittingDays++;
          }
        }
      }
      expect(runningDays).toBeGreaterThan(0);
      expect(hittingDays).toBeGreaterThan(0);
    });
    for (const posture of ['game', 'tournament', 'camp', 'travel', 'team_practice', 'taper'] as const) {
      it(`${sport}/${phase}/${posture}: adds no new fielding or running full-go work`, () => {
        const signal = { ...NORMAL_SIGNAL, postureToday: posture, rationale: 'Schedule guard' };
        for (let n = 0; n < 7; n++) {
          const plan = buildHammerDailyPlan(context(sport, phase), signal, null, null, undefined, new Date(2026, 5, 1 + n));
          for (const block of plan.blocks.filter(row => ['defense', 'baserunning'].includes(row.modality))) {
            expect(block.drills.some(row => row.stage === 'full_go')).toBe(false);
          }
        }
      });
    }
  }
});

describe('AR4: catalog-declared fielding execution across positions', () => {
  for (const sport of ['baseball', 'softball'] as const) for (const phase of ['off', 'pre', 'in'] as const) {
    for (const position of ['C', 'P', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF']) {
      it(`${sport}/${phase}/${position}: eligible reads retain doses, prep and stop conditions`, () => {
        const selected = selectDefenseDrills({ position, sport, seasonPhase: phase, injuryRegions: [], tier: 'developing' });
        expect(selected).not.toBeNull();
        if (!selected) return;
        const structured = structureSkillSession(selected.drills, { skill: 'defense', sport,
          owned: new Set(['field', 'glove', 'ball']), injuryRegions: [], recoveryDay: false });
        expect(structured).toHaveLength(selected.drills.length);
        expect(structured[0].stage).toBe('prep');
        for (const row of selected.drills) {
          const result = structured.find(step => step.name === row.name);
          expect(result?.dosage).toBe(row.dosage);
          if (row.stopIf) expect(result?.stopIf).toContain(row.stopIf);
        }
        const later = selected.drills.find((row, index) => index > 0 && row.executionKind === 'fielding_reads');
        const expected = later ?? (selected.drills.length > 1 && selected.drills[0]?.executionKind === 'fielding_reads' ? selected.drills[0] : undefined);
        const execution = structured.filter(row => row.stage === 'full_go');
        expect(execution.map(row => row.name)).toEqual(expected ? [expected.name] : []);
        if (phase !== 'in') expect(execution).toHaveLength(1);
        // Prep always leads, even when the promoted rep was the first drill.
        expect(structured[0].stage).toBe('prep');
        expect(execution[0] ? structured.indexOf(execution[0]) : 1).toBeGreaterThan(0);
      });
    }
    it(`${sport}/${phase}: actual ready first-base card has non-throwing game-speed reads`, () => {
      let days = 0;
      const original = context(sport, phase);
      const variables = original.variables.map(row => row.key === 'position_primary' ? { ...row, value: '1B' } : row);
      const c: HammerAthleteContext = { ...original, variables, get<T>(key: string) { return variables.find(row => row.key === key) as ContextVariable<T> | undefined; } };
      for (let n = 0; n < 14; n++) {
        const plan = buildHammerDailyPlan(c, NORMAL_SIGNAL, null, null, undefined, new Date(2026, 5, 1 + n));
        const block = plan.blocks.find(row => row.modality === 'defense' && row.status === 'ready');
        if (!block) continue;
        expect(block.drills.some(row => row.stage === 'full_go' && row.executionKind === 'fielding_reads')).toBe(true);
        days++;
      }
      expect(days).toBeGreaterThan(0);
    });
    if (sport === 'softball') it(`${phase}: actual running prep never asks for an early lead-off`, () => {
      let days = 0;
      for (let n = 0; n < 14; n++) {
        const plan = buildHammerDailyPlan(context(sport, phase), NORMAL_SIGNAL, null, null, undefined, new Date(2026, 5, 1 + n));
        const block = plan.blocks.find(row => row.modality === 'baserunning' && row.status === 'ready');
        if (!block) continue;
        expect(block.drills[0].cue).toContain('pitch is released');
        expect(block.drills.some(row => /Lead \+ secondary/.test(row.name))).toBe(false);
        days++;
      }
      expect(days).toBeGreaterThan(0);
    });
  }
});