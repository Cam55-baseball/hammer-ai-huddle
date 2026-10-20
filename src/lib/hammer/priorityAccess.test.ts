import { describe, it, expect } from 'vitest';
import { priorityAccess } from './priorityAccess';

describe('due prompt sport entitlements', () => {
  for (const sport of ['baseball', 'softball'] as const) {
    const other = sport === 'baseball' ? 'softball' : 'baseball';
    it(`${sport}: Complete Pitcher grants pitching only`, () => {
      expect(priorityAccess([`${sport}_pitcher`], sport)).toEqual({ hasPitching: true, hasHitting: false, hasThrowing: false });
    });
    it(`${sport}: 5Tool grants hitting and throwing only`, () => {
      expect(priorityAccess([`${sport}_5tool`], sport)).toEqual({ hasPitching: false, hasHitting: true, hasThrowing: true });
    });
    it(`${sport}: Golden 2Way grants all three`, () => {
      expect(priorityAccess([`${sport}_golden2way`], sport)).toEqual({ hasPitching: true, hasHitting: true, hasThrowing: true });
    });
    it(`${sport}: another sport cannot unlock any skill prompt`, () => {
      expect(priorityAccess([`${other}_golden2way`], sport)).toEqual({ hasPitching: false, hasHitting: false, hasThrowing: false });
    });
    it(`${sport}: mixed subscriptions keep their own scope`, () => {
      expect(priorityAccess([`${sport}_pitcher`, `${other}_5tool`], sport)).toEqual({ hasPitching: true, hasHitting: false, hasThrowing: false });
    });
  }
});