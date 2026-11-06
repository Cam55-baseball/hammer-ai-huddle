// =====================================================================
// CENTRALIZED TIER ACCESS HELPER
// =====================================================================
// Every file that checks module access should use these helpers instead of
// doing raw m.includes('hitting') checks. This ensures tier-aware access
// with full backward compatibility for legacy module keys.
// =====================================================================

/**
 * Check if user has access to a specific feature type based on their subscribed modules.
 * Supports both legacy keys (baseball_hitting) and new tier keys (baseball_5tool).
 */
import { normalizeProgramModules, programOf } from '../../supabase/functions/_shared/programAccess';
export function hasFeatureAccess(
  modules: string[],
  feature: 'hitting' | 'pitching' | 'throwing'
): boolean {
  return normalizeProgramModules(modules, 'baseball').some((m) => {
    switch (feature) {
      case 'hitting':
        return m.includes('hitting') || m.includes('5tool') || m.includes('golden2way');
      case 'pitching':
        return m.includes('pitching') || m.includes('pitcher') || m.includes('golden2way');
      case 'throwing':
        return m.includes('throwing') || m.includes('5tool') || m.includes('golden2way');
      default:
        return false;
    }
  });
}

/**
 * Check if user has a specific tier for a given sport.
 */
export function hasTierForSport(
  modules: string[],
  tier: string,
  sport: string
): boolean {
  return programOf(sport, modules) === tier;
}

/**
 * Check if user has ANY paid subscription (for Vault access, etc.)
 */
export function hasAnySubscription(modules: string[]): boolean {
  return modules.length > 0;
}

/**
 * Get the user's active tier key for a given sport, or null if none.
 * Returns the highest tier if multiple somehow exist.
 */
export function getActiveTier(
  modules: string[],
  sport: string
): 'golden2way' | '5tool' | 'pitcher' | null {
  return programOf(sport, modules);
}

/**
 * Check if user has The Unicorn access (Golden 2Way tier).
 */
export function hasUnicornAccess(modules: string[]): boolean {
  return ['baseball', 'softball'].some(sport => programOf(sport, modules) === 'golden2way');
}

/** Owner Nov 6 r4: the plan sections shown as unlocked — exactly the one active plan. */
export function sidebarPlanKeys(activeTier: 'golden2way' | '5tool' | 'pitcher' | null): ('golden2way' | '5tool' | 'pitcher')[] {
  return activeTier ? [activeTier] : [];
}
