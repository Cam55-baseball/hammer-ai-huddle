import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { computeCompletion, getWeights, assertWeights, DEFAULT_WEIGHTS } from './completionRules';

describe('completionRules', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns defaults when no override is set', () => {
    expect(getWeights()).toEqual(DEFAULT_WEIGHTS);
  });

  it('weighted completion produces a positive pct for partial axes', () => {
    const result = computeCompletion({
      tiers: 1,
      categories: 1,
      submodules: 1,
      interactionCounts: {},
      dwellMs: {},
    });
    expect(result.pct).toBeGreaterThan(0);
    expect(result.isComplete).toBe(false);
  });

  it('honors localStorage weight overrides', () => {
    localStorage.setItem(
      'demo_completion_weights',
      JSON.stringify({ tiers: 0.1, categories: 0.2, submodules: 0.4, deep: 0.3 })
    );
    expect(getWeights()).toEqual({ tiers: 0.1, categories: 0.2, submodules: 0.4, deep: 0.3 });
  });

  it('falls back to defaults for malformed overrides', () => {
    localStorage.setItem('demo_completion_weights', '{"tiers":"x"}');
    expect(getWeights()).toEqual(DEFAULT_WEIGHTS);
  });

  it('warns when weights do not sum to 1', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    assertWeights({ tiers: 0.5, categories: 0.5, submodules: 0.5, deep: 0.5 });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('does not warn when defaults are used', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    assertWeights(DEFAULT_WEIGHTS);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  afterEach(() => {
    localStorage.clear();
  });
});
