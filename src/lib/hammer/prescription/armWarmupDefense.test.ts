import { describe, expect, it } from 'vitest';
import { withDefenseDayThrowing, withWarmupThrows, type DrillStep } from './dailyPlan';

const ev = (count: number) => ({ kind: 'practice' as const, count, intent: 'moderate' as const, estimated: false });
const warm = { modality: 'warmup', status: 'ready', title: 'Warm-up', drills: [{ name: 'Leg swings', dosage: '1 × 10' }] as DrillStep[], steps: [] as string[] };
const throwing = (drills: DrillStep[]) => ({ modality: 'throwing', status: 'ready', title: 'Throwing', drills, steps: [] as string[] });

describe('Fix 3: warm-up throws come from the arm card', () => {
  it('moves arm prep and the warm-up toss into the warm-up without adding throws', () => {
    const card = throwing([
      { name: 'Band activation series', dosage: '1 × 10' },
      { name: 'Regulation warm-up toss (5oz)', dosage: '1 × 15 throws', armEvent: ev(15) },
      { name: 'Crow-hop throw to a base', dosage: '2 × 5', armEvent: ev(10) },
    ]);
    const before = card.drills.reduce((n, d) => n + (d.armEvent?.count ?? 0), 0);
    const [w, t] = withWarmupThrows([warm, card]);
    const after = [...w.drills, ...t.drills].reduce((n, d) => n + (d.armEvent?.count ?? 0), 0);
    expect(after).toBe(before);
    expect(w.drills.map(d => d.name)).toEqual(['Leg swings', 'Arm prep — Band activation series', 'Warm-up throws — Regulation warm-up toss (5oz)']);
    expect(t.drills.map(d => d.name)).toEqual(['Crow-hop throw to a base']);
  });
  it('adds a no-extra-dose building row when the card has throws but no toss', () => {
    const [w] = withWarmupThrows([warm, throwing([{ name: 'One-hop accuracy throw', dosage: '2 × 5', armEvent: ev(10) }])]);
    const added = w.drills.filter(d => d.name.startsWith('Warm-up throws'));
    expect(added).toHaveLength(1);
    expect(added[0].armEvent).toBeUndefined();
  });
  it('leaves care-only arm cards and days without a ready warm-up alone', () => {
    const care = throwing([{ name: 'Band series — ER / IR', dosage: '1 × 10' }, { name: 'Arm-care cooldown', dosage: '5 min' }]);
    expect(withWarmupThrows([warm, care])[0].drills).toHaveLength(1);
  });
});

describe('Fix 4: defense days keep throwing', () => {
  const ready = { modality: 'throwing', status: 'ready', side: null };
  it('restores a microcycle-only off-day throwing card on a defense day', () => {
    const out = withDefenseDayThrowing([{ modality: 'defense', status: 'ready' }, { modality: 'throwing', status: 'off-day' }], [{ modality: 'defense', status: 'ready' }, ready]);
    expect(out[1].status).toBe('ready');
  });
  it('never reopens a throwing card the builder itself suppressed (injury, DH)', () => {
    const out = withDefenseDayThrowing([{ modality: 'defense', status: 'ready' }, { modality: 'throwing', status: 'off-day' }], [{ modality: 'throwing', status: 'suppressed' }]);
    expect(out[1].status).toBe('off-day');
  });
  it('does nothing without a ready defense card', () => {
    const out = withDefenseDayThrowing([{ modality: 'defense', status: 'off-day' }, { modality: 'throwing', status: 'off-day' }], [ready]);
    expect(out[1].status).toBe('off-day');
  });
});
