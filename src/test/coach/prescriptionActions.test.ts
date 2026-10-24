import { describe, expect, it } from 'vitest';
import { prescriptionMode, prescriptionChoiceDate } from '../../../supabase/functions/_shared/coach/prescriptionActions';
import { checkPrescriptionAlongside, type RxReplaceFacts } from '../../../supabase/functions/_shared/coach/prescriptionSafety';
const facts: RxReplaceFacts = { category: 'pitching', date: '2026-10-24', intensity: 'standard', throwing: true, isRestDay: false, gameOnDate: false, gameNextDay: false, inSeason: false, nextThrowDate: null, injuryMode: false, hasCard: false };
describe('coach workout activation rules', () => {
  it('dispatches Sent workouts management instead of pre-send checks', () => { expect(prescriptionMode('manage')).toBe('manage'); expect(prescriptionMode('other')).toBeNull(); });
  it('saving for later preserves the scheduled date', () => { expect(prescriptionChoiceDate('save_for_later', true, '2026-11-03', '2026-10-24')).toBe('2026-11-03'); });
  it('Use today activates on today rather than the scheduled date', () => { expect(prescriptionChoiceDate('use_instead', true, '2026-11-03', '2026-10-24')).toBe('2026-10-24'); });
  it('adding alongside cannot bypass throwing rest through October 26', () => { expect(checkPrescriptionAlongside({ ...facts, nextThrowDate: '2026-10-26' }).verdict).toBe('alongside_only'); });
  it('adding alongside cannot bypass a rest day', () => { expect(checkPrescriptionAlongside({ ...facts, isRestDay: true }).verdict).toBe('alongside_only'); });
  it('adding alongside cannot bypass injury mode', () => { expect(checkPrescriptionAlongside({ ...facts, injuryMode: true }).verdict).toBe('alongside_only'); });
  it('adding alongside permits safe work without an existing category card', () => { expect(checkPrescriptionAlongside(facts).verdict).toBe('allow'); });
});