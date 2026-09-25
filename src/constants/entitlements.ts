// =====================================================================
// SUBSCRIPTION ENTITLEMENTS — single source of what each plan unlocks.
// =====================================================================
// Complete Player (speed + throwing) and Complete Hitter are no longer sold
// on their own. They are included in 5Tool Player and The Golden 2Way.
//
// Legacy per-module subscribers keep everything they had:
//   *_hitting  → hitting features, including Complete Hitter
//   *_throwing → throwing features, including Complete Player
//   *_pitching → pitching features, including Complete Pitcher
// Resolution goes through hasFeatureAccess, which already treats the legacy
// keys as equal to the tier that replaced them.
// =====================================================================

import { hasFeatureAccess, hasUnicornAccess } from '@/utils/tierAccess';

export type Entitlement =
  | 'hitting_analysis'
  | 'throwing_analysis'
  | 'pitching_analysis'
  | 'complete_hitter'
  | 'complete_player'
  | 'complete_pitcher'
  | 'the_unicorn'
  | 'vault';

export const ENTITLEMENT_ORDER: readonly Entitlement[] = [
  'hitting_analysis',
  'throwing_analysis',
  'pitching_analysis',
  'complete_hitter',
  'complete_player',
  'complete_pitcher',
  'the_unicorn',
  'vault',
];

/** Which feature family each bundled program belongs to. */
export const PROGRAM_FEATURE: Record<'complete_hitter' | 'complete_player' | 'complete_pitcher', 'hitting' | 'throwing' | 'pitching'> = {
  complete_hitter: 'hitting',
  complete_player: 'throwing',
  complete_pitcher: 'pitching',
};

export function entitlementsFor(modules: readonly string[]): Set<Entitlement> {
  const m = [...modules];
  const out = new Set<Entitlement>();
  const hitting = hasFeatureAccess(m, 'hitting');
  const throwing = hasFeatureAccess(m, 'throwing');
  const pitching = hasFeatureAccess(m, 'pitching');
  if (hitting) { out.add('hitting_analysis'); out.add('complete_hitter'); }
  if (throwing) { out.add('throwing_analysis'); out.add('complete_player'); }
  if (pitching) { out.add('pitching_analysis'); out.add('complete_pitcher'); }
  if (hasUnicornAccess(m)) out.add('the_unicorn');
  if (m.length > 0) out.add('vault');
  return out;
}

export function hasEntitlement(modules: readonly string[], e: Entitlement): boolean {
  return entitlementsFor(modules).has(e);
}
