import { describe, expect, it } from "vitest";
import { buildEassPrescription, type EassContext } from "./eassLibrary";
import { buildHammerDailyPlan } from './dailyPlan';
import { NORMAL_SIGNAL } from './scheduleContext';
import { guideFor } from './movementGuide';
import type { ContextVariable, HammerAthleteContext } from '@/lib/hammer/context/athleteContext';

const base: EassContext = { sport: "baseball", position: "pitcher", seasonPhase: "in", ageYears: 16, trainingAgeYears: 2,
  injuryRegions: [], armSore: false, isGameDay: false, isThrowingDay: true, isRecoveryDay: false, readinessScore: 0.8 };
const pen = (c: Partial<EassContext>) => buildEassPrescription({ ...base, ...c }).drills.find((d) => d.stage === 'full_go');

describe("execution: pitching bullpen is full-go with counts, same pitch amounts", () => {
  for (const state of [{ isRecoveryDay: true }, { readinessScore: 0.2 }]) {
    it(`recovery keeps its declared doses and specific setup/stop guides: ${JSON.stringify(state)}`, () => {
      const rows = buildEassPrescription({ ...base, ...state }).drills;
      expect(rows.map(row => row.dosage)).toEqual([
        'ER 1x10, IR 1x10, scap pulls 1x10 — recovery pace only',
        'wrist circles 30s each way, forearm massage 90s per side',
        'sleeper 2x30s per side, cross-body 2x30s',
      ]);
      for (const row of rows) {
        expect(row.category).toBe('recovery');
        expect(row.stage).not.toBe('full_go');
        expect(guideFor(row.name)?.setup).toBe(row.setup);
        expect(guideFor(row.name)?.stopIf).toBe(row.stopIf);
        expect(row.stopIf?.length).toBeGreaterThan(0);
      }
    });
  }
  it("baseball in-season: 20 pitches, counts + intent + logging", () => {
    const d = pen({});
    expect(d?.dosage).toBe("20 pitches to a target at 75%");
    expect(d?.cue).toContain("every pitch with intent");
    expect(d?.cue).toContain("write down your pitch count");
  });
  it("softball off-season: 30 pitches", () => {
    expect(pen({ sport: "softball", seasonPhase: "off" })?.dosage).toBe("30 pitches building spin efficiency");
  });
  it("game day / sore arm never gets a full-go bullpen", () => {
    expect(pen({ isGameDay: true })).toBeUndefined();
    expect(pen({ armSore: true })).toBeUndefined();
  });
  for (const sport of ['baseball', 'softball']) {
    it(`${sport}: actual daily builder preserves declared full-go and its exact existing pitch dose`, () => {
      const values = { sport_primary: sport, position_primary: 'P', lifecycle_band: 'college', season_phase: 'off',
        age_years: 20, lifting_age_years: 2, weekly_availability_days: 6, development_priorities: ['throwing'],
        injury_history: [], equipment_effective: ['field', 'glove', 'ball', 'bands'] };
      const variables = Object.entries(values).map(([key, value]): ContextVariable => ({ key, value, label: key,
        domain: 'identity', source: 'test', confidence: 'high', missing: false, lastUpdated: null,
        lineage: { owner: 'test', source: 'test', rawConfidence: 'high' } }));
      const ctx: HammerAthleteContext = { variables, missing: [], missingCount: 0, isLoading: false, envelope: null,
        get<T>(key: string) { return variables.find(row => row.key === key) as ContextVariable<T> | undefined; } };
      let eligibleDays = 0;
      for (let day = 0; day < 14; day++) {
        const plan = buildHammerDailyPlan(ctx, NORMAL_SIGNAL, null, null, undefined, new Date(2026, 5, 1 + day));
        const throwing = plan.blocks.find(block => block.modality === 'throwing' && block.status === 'ready');
        if (!throwing) continue;
        const full = throwing.drills.find(drill => drill.stage === 'full_go');
        expect(full?.dosage).toBe(sport === 'softball' ? '30 pitches building spin efficiency' : '30 pitches, focus pitch + secondary at 80%');
        expect(full?.cue).toContain('write down your pitch count');
        eligibleDays++;
      }
      expect(eligibleDays).toBeGreaterThan(0);
    });
  }
});
