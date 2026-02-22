// =====================================================================
// HAMMERS MODALITY – TIER CONFIGURATION
// =====================================================================
// Defines the 3 subscription tiers, their access mappings, and pricing.
// All access checks should reference this config via tierAccess.ts helper.
// =====================================================================

export interface TierConfig {
  key: string;
  displayName: string;
  price: number;
  grantedAccess: ('hitting' | 'pitching' | 'throwing')[];
  includes: string[];
  gatewayRoute: string;
  workoutSubmodule?: string; // e.g. 'the-unicorn' for Golden 2Way
}

export const TIER_CONFIG: Record<string, TierConfig> = {
  pitcher: {
    key: 'pitcher',
    displayName: 'Complete Pitcher',
    price: 200,
    grantedAccess: ['pitching'],
    includes: [
      'Pitching Analysis',
      'Heat Factory',
      'Ask the Coach',
      'Vault Access',
    ],
    gatewayRoute: '/complete-pitcher',
  },
  '5tool': {
    key: '5tool',
    displayName: '5Tool Player',
    price: 300,
    grantedAccess: ['hitting', 'throwing'],
    includes: [
      'Hitting Analysis',
      'Throwing Analysis',
      'Iron Bambino (Upgraded)',
      'Speed Lab',
      'Tex Vision',
      'Ask the Coach',
      'Vault Access',
    ],
    gatewayRoute: '/5tool-player',
  },
  golden2way: {
    key: 'golden2way',
    displayName: 'The Golden 2Way',
    price: 400,
    grantedAccess: ['hitting', 'pitching', 'throwing'],
    includes: [
      'Everything in Complete Pitcher',
      'Everything in 5Tool Player',
      'The Unicorn Workout System',
      'Full 2-Way Development',
    ],
    gatewayRoute: '/golden-2way',
    workoutSubmodule: 'the-unicorn',
  },
};

// Ordered tiers for display (pricing page, select modules, etc.)
export const TIER_ORDER = ['pitcher', '5tool', 'golden2way'] as const;

// Stripe Price IDs – sport-specific
// The pitcher prices are existing; 5tool and golden2way need user-provided IDs
export const TIER_PRICES: Record<string, Record<string, string>> = {
  pitcher: {
    baseball: 'price_1SKpoEGc5QIzbAH6FlPRhazY',
    softball: 'price_1SPBwcGc5QIzbAH6XUKF9dNy',
  },
  '5tool': {
    baseball: 'PENDING_BASEBALL_5TOOL_PRICE_ID',
    softball: 'PENDING_SOFTBALL_5TOOL_PRICE_ID',
  },
  golden2way: {
    baseball: 'PENDING_BASEBALL_GOLDEN2WAY_PRICE_ID',
    softball: 'PENDING_SOFTBALL_GOLDEN2WAY_PRICE_ID',
  },
};

// Legacy module key → tier mapping (for migration + backward compat)
export const LEGACY_MODULE_TO_TIER: Record<string, string> = {
  hitting: '5tool',
  throwing: '5tool',
  pitching: 'pitcher',
};

// Tier display names for UI
export const TIER_DISPLAY_NAMES: Record<string, string> = {
  pitcher: 'Complete Pitcher',
  '5tool': '5Tool Player',
  golden2way: 'The Golden 2Way',
};
