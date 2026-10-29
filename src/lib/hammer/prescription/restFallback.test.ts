import { expect, it } from 'vitest';
import { restSafeFallback } from '../../../../supabase/functions/_shared/wic/schedule/softRecovery';
it('Sunday or unavailable-date fallback never retains training from the safe session', () => {
  const rows=[{movement_slug:'safe_dead_bug_hold'},{movement_slug:'safe_band_pull_apart_iso'},{movement_slug:'rc_breathing_reset'}];
  expect(restSafeFallback(rows,true)).toEqual([{movement_slug:'rc_breathing_reset'}]);
  expect(restSafeFallback(rows,false)).toEqual(rows);
});