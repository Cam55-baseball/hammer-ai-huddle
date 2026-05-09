/**
 * Wave F — State machine: pure functions only (no DB).
 */
import { describe, it, expect } from 'vitest';
import {
  deriveTargetState,
  applyDwellGuard,
  MIN_DWELL_HOURS,
} from '../foundationStateMachine';

describe('deriveTargetState', () => {
  it('post_layoff_rebuild wins on layoffDays >= 14', () => {
    expect(deriveTargetState({ activeTriggers: ['lost_feel'], layoffDays: 21 }).state)
      .toBe('post_layoff_rebuild');
  });
  it('lost_feel maps to lost_feel state', () => {
    expect(deriveTargetState({ activeTriggers: ['lost_feel'] }).state).toBe('lost_feel');
  });
  it('mechanics + results = chronic_decline', () => {
    expect(deriveTargetState({
      activeTriggers: ['mechanics_decline', 'results_decline'],
    }).state).toBe('chronic_decline');
  });
  it('single decline axis = active_recovery', () => {
    expect(deriveTargetState({ activeTriggers: ['mechanics_decline'] }).state)
      .toBe('active_recovery');
  });
  it('fragile or new = fragile', () => {
    expect(deriveTargetState({ activeTriggers: ['new_user_30d'] }).state).toBe('fragile');
    expect(deriveTargetState({ activeTriggers: ['fragile_foundation'] }).state).toBe('fragile');
  });
  it('no triggers = healthy_foundation', () => {
    expect(deriveTargetState({ activeTriggers: [] }).state).toBe('healthy_foundation');
  });
});

describe('applyDwellGuard — anti-flap', () => {
  it('blocks transition before min dwell elapses', () => {
    const enteredAt = new Date(Date.now() - 1 * 3_600_000); // 1h ago
    const out = applyDwellGuard({
      current: 'fragile',
      target: 'healthy_foundation',
      enteredAt,
    });
    expect(out.transitioned).toBe(false);
    expect(out.next).toBe('fragile');
  });
  it('allows transition after min dwell elapses', () => {
    const required = MIN_DWELL_HOURS.fragile;
    const enteredAt = new Date(Date.now() - (required + 1) * 3_600_000);
    const out = applyDwellGuard({
      current: 'fragile',
      target: 'healthy_foundation',
      enteredAt,
    });
    expect(out.transitioned).toBe(true);
    expect(out.next).toBe('healthy_foundation');
  });
  it('always allows leaving healthy_foundation immediately', () => {
    const out = applyDwellGuard({
      current: 'healthy_foundation',
      target: 'lost_feel',
      enteredAt: new Date(),
    });
    expect(out.transitioned).toBe(true);
  });
  it('no transition when current === target', () => {
    const out = applyDwellGuard({
      current: 'fragile',
      target: 'fragile',
      enteredAt: new Date(0),
    });
    expect(out.transitioned).toBe(false);
  });
});
