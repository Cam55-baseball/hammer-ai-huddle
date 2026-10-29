import { describe, expect, it } from 'vitest';
import { runGovernor } from '../../../supabase/functions/_shared/wic/exposure/governor';
import { preservesSpeedIntent } from '../../../supabase/functions/_shared/wic/speed/governorComposition';
import { certifySpeed } from '../../../supabase/functions/_shared/wic/speed/sessionBuilder';
import type { GovItem, GovAlternative } from '../../../supabase/functions/_shared/wic/exposure/types';

const catalog = [
  { slug: 'sp_sport_stance_start', name: 'Sport-Stance Start', speed_category: 'acceleration', substitution_family: 'reactive_start' },
  { slug: 'sp_prowler_contrast', name: 'Heavy Sled To Free Sprint Contrast', speed_category: 'resisted', substitution_family: 'sled_accel' },
  { slug: 'sp_sled_10y_light', name: 'Light Sled Sprint', speed_category: 'acceleration', substitution_family: 'sled_accel' },
  { slug: 'sp_heavy_sled_30', name: 'Heavy Sled', speed_category: 'resisted', substitution_family: 'sled_accel' },
  { slug: 'sp_singleleg_bound_alt', name: 'Single-leg Bounds', speed_category: 'plyometric', substitution_family: 'bounds' },
];
const items: GovItem[] = catalog.filter(c => ['sp_sport_stance_start','sp_prowler_contrast'].includes(c.slug)).map(c => ({
  ...c, channel: 'SPRINT', tier: 'max_velocity', sets: 3, amountPerSet: 20, floorSets: 1, substitutionFamily: c.substitution_family,
}));
const alternatives: GovAlternative[] = catalog.filter(c => ['sp_sled_10y_light','sp_heavy_sled_30'].includes(c.slug)).map((c,i) => ({
  ...c, channel: 'SPRINT', tier: 'resisted', amountPerSet: i === 0 ? 10 : 12, floorSets: 1, substitutionFamily: c.substitution_family,
}));
function build(preserve: boolean) {
  return runGovernor({ items, alternatives,
    rm28: { byChannel: {}, byTier: {}, onDate: {}, daysObserved: 0, loggedDaysByChannel: {} },
    ctx: { block: 'B1', inSeason: false, growthMode: false },
    canSubstitute: preserve ? (from, alt) => preservesSpeedIntent('speed', catalog.find(c=>c.slug===from.slug)?.speed_category, catalog.find(c=>c.slug===alt.slug)?.speed_category) : undefined,
  });
}
function certify(slugs: string[]) {
  return certifySpeed({ catalog, template: { seasonPhase: 'os_q1' }, prescriptions: [...slugs, 'sp_singleleg_bound_alt'].map((slug,i)=>({ slot:'speed', movement_slug:slug,movement_name:slug,sequence_order:i })) });
}
describe('first full program: speed selection + exposure step-down', () => {
  it('reproduces the two producers: stance acceleration plus resisted sled converted to acceleration', () => {
    const result = build(false);
    expect(result.items.map(i=>i.slug)).toEqual(['sp_sport_stance_start','sp_sled_10y_light']);
    expect(certify(result.items.map(i=>i.slug)).fatal.map(f=>f.code)).toContain('speed_duplicate_category');
  });
  it('keeps one acceleration and distinct resisted and jump work; unchanged certifier passes', () => {
    const result = build(true);
    expect(result.items.map(i=>i.slug)).toEqual(['sp_sport_stance_start','sp_heavy_sled_30']);
    expect(result.items.map(i=>i.sets)).toEqual([1,1]);
    const checked = certify(result.items.map(i=>i.slug));
    expect(checked.categoryCoverage).toEqual({acceleration:1,resisted:1,plyometric:1});
    expect(checked.validationStatus).toBe('passed');
    expect(checked.fatal).toEqual([]);
  });
  it('never retags a catalog row or changes another card intent', () => {
    expect(preservesSpeedIntent('speed','resisted','acceleration')).toBe(false);
    expect(preservesSpeedIntent('speed',null,'acceleration')).toBe(false);
    expect(preservesSpeedIntent('conditioning','resisted','acceleration')).toBe(true);
  });
});