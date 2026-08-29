import { describe, expect, it } from 'vitest';
import {
  perfectTagSide,
  scoreThrowAccuracy,
  type ThrowAccuracyInput,
  type ThrowAccuracyResult,
} from '@/lib/throwing/throwAccuracyScore';

type Scored = Extract<ThrowAccuracyResult, { missing: false }>;
const scored = (input: ThrowAccuracyInput): Scored => {
  const r = scoreThrowAccuracy(input);
  if (r.missing) throw new Error('unexpected missing result');
  return r as Scored;
};

describe('perfectTagSide', () => {
  it('is the runner side for a standard tag play', () => {
    expect(perfectTagSide('standard')).toBe('runner');
  });
  it('inverts to the defender side throwing home from left field', () => {
    expect(perfectTagSide('throw_home_from_lf')).toBe('defender');
  });
  it('is the defender side on a snap throw to third', () => {
    expect(perfectTagSide('snap_third')).toBe('defender');
  });
});

describe('force play scoring', () => {
  it('gives full points inside the receiver torso over the bag', () => {
    const r = scored({
      play_type: 'force',
      lateral_offset_ft: 0.5,
      vertical_offset_ft: 1.0,
    });
      expect(r.score).toBe(100);
      expect(r.perfect).toBe(true);
  });

  it('deducts for lateral miss off the bag', () => {
    const r = scored({
      play_type: 'force',
      lateral_offset_ft: 3,
      vertical_offset_ft: 0,
    });
    expect(r.score).toBe(76); // 2ft beyond torso * 12
    expect(r.deductions[0].rule).toBe('force_lateral_miss');
  });

  it('penalizes high throws more than low throws', () => {
    const high = scored({
      play_type: 'force',
      lateral_offset_ft: 0,
      vertical_offset_ft: 3.5,
    });
    const low = scored({
      play_type: 'force',
      lateral_offset_ft: 0,
      vertical_offset_ft: -3.5,
    });
    expect(high.score).toBeLessThan(low.score);
  });

  it('penalizes a long hop more than a short hop', () => {
    const shortHop = scored({
      play_type: 'force',
      lateral_offset_ft: 0,
      vertical_offset_ft: 0,
      bounce_distance_ft: 4,
    });
    const longHop = scored({
      play_type: 'force',
      lateral_offset_ft: 0,
      vertical_offset_ft: 0,
      bounce_distance_ft: 25,
    });
    expect(shortHop.score).toBe(90);
    expect(longHop.score).toBe(75);
  });
});

describe('tag play scoring', () => {
  it('is perfect within 1ft on the runner side and at/below 1ft high', () => {
    const r = scored({
      play_type: 'tag',
      specific_context: 'standard',
      lateral_offset_ft: 0.8,
      vertical_offset_ft: 0.6,
    });
    expect(r.score).toBe(100);
  });

  it('penalizes the runner side when throwing home from left field', () => {
    const runnerSide = scored({
      play_type: 'tag',
      specific_context: 'throw_home_from_lf',
      lateral_offset_ft: 0.8,
      vertical_offset_ft: 0.5,
    });
    const defenderSide = scored({
      play_type: 'tag',
      specific_context: 'throw_home_from_lf',
      lateral_offset_ft: -0.8,
      vertical_offset_ft: 0.5,
    });
    expect(defenderSide.score).toBe(100);
    expect(runnerSide.score).toBeLessThan(100);
    expect(runnerSide.deductions[0].rule).toBe('tag_wrong_side');
  });

  it('treats a snap throw to third like the defender-side rule', () => {
    const r = scored({
      play_type: 'tag',
      specific_context: 'snap_third',
      lateral_offset_ft: -0.9,
      vertical_offset_ft: 1.0,
    });
    expect(r.score).toBe(100);
  });

  it('penalizes a high tag throw', () => {
    const r = scored({
      play_type: 'tag',
      lateral_offset_ft: 0,
      vertical_offset_ft: 3,
    });
    expect(r.score).toBe(60);
  });

  it('penalizes a bounce far less on a tag play than on a force play', () => {
    const tag = scored({
      play_type: 'tag',
      lateral_offset_ft: 0,
      vertical_offset_ft: 0.5,
      bounce_distance_ft: 5,
    });
    const force = scored({
      play_type: 'force',
      lateral_offset_ft: 0,
      vertical_offset_ft: 0,
      bounce_distance_ft: 5,
    });
    expect(tag.score).toBeGreaterThan(force.score);
  });
});

describe('honesty', () => {
  it('returns missing without a lateral offset', () => {
    const r = scoreThrowAccuracy({
      play_type: 'force',
      lateral_offset_ft: null,
      vertical_offset_ft: 0,
    });
    expect(r.missing).toBe(true);
    if (r.missing) expect(r.missing_reason).toBe('no_lateral_offset');
  });

  it('returns missing for a negative tag height', () => {
    const r = scoreThrowAccuracy({
      play_type: 'tag',
      lateral_offset_ft: 0,
      vertical_offset_ft: -1,
    });
    expect(r.missing && r.missing_reason).toBe('negative_tag_height');
  });

  it('never scores below zero', () => {
    const r = scored({
      play_type: 'tag',
      lateral_offset_ft: 12,
      vertical_offset_ft: 9,
      bounce_distance_ft: 40,
    });
    expect(r.score).toBe(0);
  });
});
