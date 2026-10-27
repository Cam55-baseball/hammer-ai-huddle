import { describe, expect, it } from 'vitest';
import { selectDefenseDrills, type DefenseTier } from './defenseLibrary';
describe('catcher framing uses the existing tier rep authority', () => {
  for (const sport of ['baseball', 'softball'] as const) {
    for (const [tier, reps] of Object.entries({ beginner: 4, developing: 6, advanced: 8, elite: 10 })) {
      it(`${sport}/${tier} retains four zones and scales only the reps`, () => {
        const plan = selectDefenseDrills({ sport, position: 'C', seasonPhase: 'off', tier: tier as DefenseTier });
        expect(plan?.drills.find(d => d.name === 'Framing ladder — 4 corners')?.dosage).toBe(`4×${reps} reps (one set per zone)`);
        expect(plan?.drills).toHaveLength(5);
      });
    }
  }
});