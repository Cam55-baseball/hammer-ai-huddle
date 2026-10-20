import { describe, expect, it } from 'vitest';
import { categoryPracticeLoads, type PracticeCategory, type PracticeLoadRecord } from './categoryPracticeLoad';
import { adjustDoseForPractice, type PracticeDose } from './practiceDoseAdjustment';
const categories: PracticeCategory[] = ['hitting', 'pitching', 'throwing', 'fielding', 'baserunning', 'speed'];
const dose = (category: PracticeDose['category']): PracticeDose => ({ category, status: 'ready', sets: 4, minimumSets: 2, repsPerSet: 10 });
const records = (category: PracticeCategory): PracticeLoadRecord[] => [17,18,19].map(day => ({ id: `${category}:${day}`, category, sport: 'baseball', date: `2026-10-${day}`, minutes: null, intensity: null }));
describe('same-category practice dose with explicit minimum', () => {
  for (const flagged of categories) it(`${flagged}: three consecutive days reduce only its own set and prioritize its rest`, () => {
    const loads = categoryPracticeLoads(records(flagged), '2026-10-20', 'baseball');
    for (const category of [...categories, 'strength', 'recovery'] as const) {
      const before = dose(category), result = adjustDoseForPractice(before, loads);
      expect(result.dose.sets).toBe(category === flagged ? 3 : 4);
      expect(result.dose.repsPerSet).toBe(10);
      expect(result.recoveryPriority).toBe(category === flagged);
      if (category !== flagged) expect(result.dose).toBe(before);
    }
  });
  it('keeps category minimums and earlier safety reductions', () => {
    const loads = categoryPracticeLoads(records('hitting'), '2026-10-20', 'baseball');
    expect(adjustDoseForPractice({...dose('hitting'),sets:2},loads).dose.sets).toBe(2);
    expect(adjustDoseForPractice({...dose('hitting'),sets:1},loads).dose.sets).toBe(1);
  });
  it('unknown minimum leaves work unchanged', () => {
    const loads = categoryPracticeLoads(records('hitting'), '2026-10-20', 'baseball');
    const result = adjustDoseForPractice({...dose('hitting'),minimumSets:null},loads);
    expect(result.outcome).toBe('missing-floor'); expect(result.dose.sets).toBe(4);
  });
  it('never reopens an off or blocked skill', () => {
    const loads = categoryPracticeLoads(records('hitting'), '2026-10-20', 'baseball');
    for (const status of ['off-day','suppressed','awaiting-input'] as const) {
      const before = {...dose('hitting'),status}; expect(adjustDoseForPractice(before,loads).dose).toBe(before);
    }
  });
  it('two days do not trigger the owner-set three-day rule', () => {
    const loads = categoryPracticeLoads(records('hitting').slice(1), '2026-10-20', 'baseball');
    expect(adjustDoseForPractice(dose('hitting'),loads).outcome).toBe('unchanged');
  });
  it('the owner 30% target reduces ten sets to seven with unchanged reps', () => {
    const loads = categoryPracticeLoads(records('hitting'), '2026-10-20', 'baseball');
    const result = adjustDoseForPractice({ ...dose('hitting'), sets: 10 }, loads);
    expect(result.dose.sets).toBe(7);
    expect(result.dose.repsPerSet).toBe(10);
  });
  it('the owner 50% floor keeps at least half with whole-set rounding', () => {
    const loads = categoryPracticeLoads(records('hitting'), '2026-10-20', 'baseball');
    expect(adjustDoseForPractice({ ...dose('hitting'), sets: 2, minimumSets: 1 }, loads).dose.sets).toBe(1);
    expect(adjustDoseForPractice({ ...dose('hitting'), sets: 3, minimumSets: 1 }, loads).dose.sets).toBe(2);
  });
  it('an explicit nine-set minimum outranks a seven-set target and preserves the block', () => {
    const loads = categoryPracticeLoads(records('hitting'), '2026-10-20', 'baseball');
    expect(adjustDoseForPractice({ ...dose('hitting'), sets: 10, minimumSets: 9 }, loads).dose.sets).toBe(9);
  });
  for (const sport of ['baseball','softball']) for (const subscription of ['5Tool','Complete Pitcher','Golden 2Way']) it(`${sport} ${subscription}: eight-week dose-contract run`, () => {
    const history: PracticeLoadRecord[] = []; let reductions = 0;
    for (let day=0;day<56;day++) {
      const date = new Date('2026-06-01T12:00:00Z'); date.setUTCDate(date.getUTCDate()+day);
      const today = date.toISOString().slice(0,10);
      const category: PracticeCategory = subscription === 'Complete Pitcher' ? 'pitching' : day < 28 ? 'hitting' : 'fielding';
      const loads = categoryPracticeLoads(history,today,sport);
      for (const candidate of [...categories,'strength','recovery'] as const) {
        const before = dose(candidate), after = adjustDoseForPractice(before,loads);
        expect(after.dose.sets).toBeGreaterThanOrEqual(2); expect(after.dose.sets).toBeLessThanOrEqual(4);
        expect(after.dose.repsPerSet).toBe(10);
        if (candidate !== category) expect(after.dose).toBe(before);
        if (after.outcome === 'reduced') reductions++;
        if (day % 7 === 4) expect(after.outcome).toBe('unchanged');
      }
      if (day % 7 < 3) history.push({id:String(day),date:today,sport,category,minutes:40,intensity:8});
    }
    expect(reductions).toBe(8);
  });
});
