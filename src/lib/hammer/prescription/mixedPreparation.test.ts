import { expect, it } from 'vitest';
import { legacyDrillLogSpec } from './legacyDrillLog';
it('preserves each component measure and unequal set count without copying a neighbor dose', () => {
  const spec=legacyDrillLogSpec('throwing','Band prep','ER 2x12 per arm, opener 1x30 seconds, scap pulls 3x10');
  expect(spec.rows).toBe(6);
  expect(spec.rowFields?.map(fields=>[fields[0].key,fields[0].prefill])).toEqual([['reps',12],['reps',12],['time',30],['reps',10],['reps',10],['reps',10]]);
  expect(spec.rowLabels).toEqual(['er · Set 1 of 2','er · Set 2 of 2','opener · Set 1 of 1','scap pulls · Set 1 of 3','scap pulls · Set 2 of 3','scap pulls · Set 3 of 3']);
});