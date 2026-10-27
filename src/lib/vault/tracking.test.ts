import { expect, it } from 'vitest';
import { applyLiveTracking } from '../../../supabase/functions/_shared/vault/tracking';
import { certifyCoachOwnItem } from '../../../supabase/functions/_shared/coach/ownItemCertification';
it('applies effective existing non-bunt tracking, not future or undone versions', () => {
  const catalog = [{slug:'test_band',dosage_unit:'reps',default_reps:12,visible_to:['test']}];
  const version = {slug:'test_band',version:1,effective_from:'2026-10-27',payload:{measure_type:'hold_seconds'}};
  expect(applyLiveTracking(catalog,[version], '2026-10-27')[0]).toMatchObject({dosage_unit:'seconds',tracking_measure_type:'hold_seconds',default_reps:12,visible_to:['test']});
  expect(applyLiveTracking(catalog,[version], '2026-10-26')).toEqual(catalog);
  expect(applyLiveTracking(catalog,[{...version,undone_at:'2026-10-27'}], '2026-10-27')).toEqual(catalog);
});
it.each(['reps per arm','reps per leg','reps each side'])('accepts coach custom %s without inventing a dose', dosage_unit => {
  expect(certifyCoachOwnItem({name:'TEST own item',dosage_unit,reps:8,sets:2,gear:'none'}).certified).toBe(true);
  expect(certifyCoachOwnItem({name:'TEST own item',dosage_unit,reps:0,sets:2,gear:'none'}).certified).toBe(false);
});