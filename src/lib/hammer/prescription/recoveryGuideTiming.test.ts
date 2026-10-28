import { describe, expect, it } from 'vitest';
import { guideFor } from './movementGuide';

describe('recovery guides defer to the prescribed timer', () => {
  for (const slug of ['rc_postgame_flush', 'rc_travel_reset']) {
    it(`${slug} does not author competing sub-doses`, () => {
      const guide = guideFor(slug);
      expect(guide).not.toBeNull();
      expect(guide?.goodRep.some(step => /\d+\s*minutes?/.test(step))).toBe(false);
      expect(guide?.stopIf?.length).toBeGreaterThan(0);
    });
  }
});