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
export function hasFeatureAccess(
  modules: string[],
  feature: 'hitting' | 'pitching' | 'throwing'
): boolean {
  return modules.some((m) => {
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
  const key = `${sport}_${tier}`;
  return modules.includes(key);
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
  if (modules.includes(`${sport}_golden2way`)) return 'golden2way';
  if (modules.includes(`${sport}_5tool`)) return '5tool';
  if (modules.includes(`${sport}_pitcher`)) return 'pitcher';
  // Legacy fallback
  const hasHitting = modules.includes(`${sport}_hitting`);
  const hasThrowing = modules.includes(`${sport}_throwing`);
  const hasPitching = modules.includes(`${sport}_pitching`);
  if (hasPitching && hasHitting && hasThrowing) return 'golden2way';
  if (hasHitting || hasThrowing) return '5tool';
  if (hasPitching) return 'pitcher';
  return null;
}

/**
 * Check if user has The Unicorn access (Golden 2Way tier).
 */
export function hasUnicornAccess(modules: string[]): boolean {
  return modules.some((m) => m.includes('golden2way'));
}
