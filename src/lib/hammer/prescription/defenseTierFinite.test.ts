import { describe, expect, it } from 'vitest';
import { resolveDefenseTier } from './defenseLibrary';
describe('defensive experience is finite evidence', () => {
  it('infinite experience cannot grant elite defensive work', () => {
    expect(resolveDefenseTier(Infinity)).toBe(resolveDefenseTier(null));
    expect(resolveDefenseTier(NaN)).toBe(resolveDefenseTier(null));
  });
});