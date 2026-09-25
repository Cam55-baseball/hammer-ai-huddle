import { describe, it, expect } from 'vitest';
import { entitlementsFor, ENTITLEMENT_ORDER, type Entitlement } from '../entitlements';
import { TIER_CONFIG, TIER_PRICES } from '../tiers';

const list = (mods: string[]) => ENTITLEMENT_ORDER.filter((e) => entitlementsFor(mods).has(e));

describe('Step 30 D — what each subscription unlocks', () => {
  for (const sport of ['baseball', 'softball']) {
    it(`${sport} 5Tool Player`, () => {
      expect(list([`${sport}_5tool`])).toEqual<Entitlement[]>([
        'hitting_analysis', 'throwing_analysis', 'complete_hitter', 'complete_player', 'vault',
      ]);
    });
    it(`${sport} Complete Pitcher`, () => {
      expect(list([`${sport}_pitcher`])).toEqual<Entitlement[]>([
        'pitching_analysis', 'complete_pitcher', 'vault',
      ]);
    });
    it(`${sport} Golden 2Way`, () => {
      expect(list([`${sport}_golden2way`])).toEqual<Entitlement[]>([...ENTITLEMENT_ORDER]);
    });
  }

  it('no subscription unlocks nothing', () => {
    expect(list([])).toEqual([]);
  });

  it('legacy module subscribers keep what they had', () => {
    expect(list(['baseball_hitting'])).toEqual(['hitting_analysis', 'complete_hitter', 'vault']);
    expect(list(['softball_throwing'])).toEqual(['throwing_analysis', 'complete_player', 'vault']);
    expect(list(['baseball_pitching'])).toEqual(['pitching_analysis', 'complete_pitcher', 'vault']);
    expect(list(['hitting'])).toContain('complete_hitter'); // bare legacy key
    expect(list(['baseball_hitting', 'baseball_throwing'])).toEqual(
      list(['baseball_5tool']),
    );
  });

  it('plan copy lists Complete Hitter/Player as included, never sold alone', () => {
    const fiveTool = TIER_CONFIG['5tool'].includes.join(' ');
    expect(fiveTool).toMatch(/Complete Hitter/);
    expect(fiveTool).toMatch(/Complete Player/);
    expect(TIER_CONFIG.golden2way.includes.join(' ')).toMatch(/Complete Hitter and Complete Player/);
    expect(Object.keys(TIER_PRICES).sort()).toEqual(['5tool', 'golden2way', 'pitcher']);
  });
});
