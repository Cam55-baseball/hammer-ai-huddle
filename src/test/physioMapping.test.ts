import { describe, expect, it } from 'vitest';
import { mapPhysio, activeInjuryHistory, physioDefaults } from '../../supabase/functions/_shared/health/physioMapping';
const today = '2026-10-29';
describe('owner conservative physio mapping', () => {
  it('healed history gives prehab area, not an active injury', () => {
    const injuries = [{ region:'shoulder', recovery_status:'healed', note:'old injury' }];
    expect(mapPhysio({injuries,today}).healedAreas).toEqual(['shoulder']);
    expect(mapPhysio({injuries,today}).activeAreas).toEqual([]);
    expect(activeInjuryHistory(injuries)).toEqual([]);
  });
  it('renewed pain in healed area raises caution and keeps active gate', () => {
    const result=mapPhysio({injuries:[{region:'shoulder',recovery_status:'healed'}],painAreas:['shoulder'],today});
    expect(result.activeAreas).toEqual(['shoulder']);expect(result.cautions).toHaveLength(1);
  });
  it('active illness remains low until explicitly cleared', () => {
    expect(mapPhysio({activeIllness:'Cold',illnessStartedAt:'2026-10-01',today}).lowReadiness).toBe(true);
    expect(mapPhysio({activeIllness:null,illnessStartedAt:null,today}).lowReadiness).toBe(false);
  });
  it('fever requires recovery only', () => {expect(mapPhysio({activeIllness:'Fever',today}).recoveryOnly).toBe(true);});
  it('third illness day shows professional warning, not second', () => {
    expect(mapPhysio({activeIllness:'Cold',illnessStartedAt:'2026-10-27',today}).professionalWarning).toBe('Please talk to a professional');
    expect(mapPhysio({activeIllness:'Cold',illnessStartedAt:'2026-10-28',today}).professionalWarning).toBeNull();
  });
  it('active injury remains active', () => {expect(mapPhysio({injuries:[{region:'ankle',recovery_status:'active'}],today}).activeAreas).toEqual(['ankle']);});
  it('free text never becomes diagnosis, fever or an injury region', () => {
    const result=mapPhysio({activeIllness:'I think fever?',injuries:['healed shoulder', {note:'ankle pain'}],today});
    expect(result.recoveryOnly).toBe(false);expect(result.activeAreas).toEqual([]);expect(result.healedAreas).toEqual([]);
  });
  it('owner defaults can be stricter but never delay third-day warning', () => {
    expect(physioDefaults({illnessMode:'recovery',professionalAfterDays:2})).toEqual({illnessMode:'recovery',professionalAfterDays:2});
    expect(physioDefaults({illnessMode:'full',professionalAfterDays:5})).toEqual({illnessMode:'light',professionalAfterDays:3});
  });
});