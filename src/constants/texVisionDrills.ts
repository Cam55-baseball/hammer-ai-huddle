// Centralized drill definitions for Tex Vision module
// All 16 drills organized by tier with metadata for smart selection

export type DrillTier = 'beginner' | 'advanced' | 'chaos';
export type DrillCategory = 'focus' | 'tracking' | 'reaction' | 'coordination';

export interface DrillDefinition {
  id: string;
  nameKey: string;
  defaultName: string;
  descriptionKey: string;
  defaultDescription: string;
  icon: string;
  tier: DrillTier;
  duration: string;
  category: DrillCategory;
}

// Complete registry of all 16 Tex Vision drills
export const ALL_DRILLS: DrillDefinition[] = [
  // ═══════════════════════════════════════════════════════════════
  // BEGINNER TIER (6 drills)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'soft_focus',
    nameKey: 'texVision.drills.softFocus.title',
    defaultName: 'Soft Focus',
    descriptionKey: 'texVision.drills.softFocus.description',
    defaultDescription: 'Develop calm awareness and reduce over-fixation',
    icon: '👁️',
    tier: 'beginner',
    duration: '2-3 min',
    category: 'focus',
  },
  {
    id: 'pattern_search',
    nameKey: 'texVision.drills.patternSearch.title',
    defaultName: 'Pattern Search',
    descriptionKey: 'texVision.drills.patternSearch.description',
    defaultDescription: 'Improve visual scanning efficiency',
    icon: '🔍',
    tier: 'beginner',
    duration: '2-4 min',
    category: 'focus',
  },
  {
    id: 'peripheral_vision',
    nameKey: 'texVision.drills.peripheralVision.title',
    defaultName: 'Peripheral Vision',
    descriptionKey: 'texVision.drills.peripheralVision.description',
    defaultDescription: 'Expand your visual field awareness',
    icon: '↔️',
    tier: 'beginner',
    duration: '2-3 min',
    category: 'tracking',
  },
  {
    id: 'convergence',
    nameKey: 'texVision.drills.convergence.title',
    defaultName: 'Convergence',
    descriptionKey: 'texVision.drills.convergence.description',
    defaultDescription: 'Train eye alignment and depth perception',
    icon: '🎯',
    tier: 'beginner',
    duration: '2-3 min',
    category: 'coordination',
  },
  {
    id: 'color_flash',
    nameKey: 'texVision.drills.colorFlash.title',
    defaultName: 'Color Flash',
    descriptionKey: 'texVision.drills.colorFlash.description',
    defaultDescription: 'React quickly to target colors',
    icon: '🎨',
    tier: 'beginner',
    duration: '1-2 min',
    category: 'reaction',
  },
  {
    id: 'eye_relaxation',
    nameKey: 'texVision.drills.eyeRelaxation.title',
    defaultName: 'Eye Relaxation',
    descriptionKey: 'texVision.drills.eyeRelaxation.description',
    defaultDescription: 'Guided rest and eye recovery',
    icon: '🌙',
    tier: 'beginner',
    duration: '2-3 min',
    category: 'focus',
  },

  // ═══════════════════════════════════════════════════════════════
  // ADVANCED TIER (6 drills)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'near_far',
    nameKey: 'texVision.drills.nearFar.title',
    defaultName: 'Near-Far Sight',
    descriptionKey: 'texVision.drills.nearFar.description',
    defaultDescription: 'Rapid depth switching exercises',
    icon: '👓',
    tier: 'advanced',
    duration: '2-4 min',
    category: 'coordination',
  },
  {
    id: 'smooth_pursuit',
    nameKey: 'texVision.drills.smoothPursuit.title',
    defaultName: 'Follow the Target',
    descriptionKey: 'texVision.drills.smoothPursuit.description',
    defaultDescription: 'Track moving objects with precision',
    icon: '🎯',
    tier: 'advanced',
    duration: '2-3 min',
    category: 'tracking',
  },
  {
    id: 'whack_a_mole',
    nameKey: 'texVision.drills.whackAMole.title',
    defaultName: 'Whack-a-Mole',
    descriptionKey: 'texVision.drills.whackAMole.description',
    defaultDescription: 'Reaction time and decision making',
    icon: '🎮',
    tier: 'advanced',
    duration: '2-4 min',
    category: 'reaction',
  },
  {
    id: 'meter_timing',
    nameKey: 'texVision.drills.meterTiming.title',
    defaultName: 'Meter Timing',
    descriptionKey: 'texVision.drills.meterTiming.description',
    defaultDescription: 'Precision timing catch game',
    icon: '⏱️',
    tier: 'advanced',
    duration: '2-3 min',
    category: 'reaction',
  },
  {
    id: 'stroop_challenge',
    nameKey: 'texVision.drills.stroopChallenge.title',
    defaultName: 'Stroop Challenge',
    descriptionKey: 'texVision.drills.stroopChallenge.description',
    defaultDescription: 'Color-word interference training',
    icon: '🧠',
    tier: 'advanced',
    duration: '2-3 min',
    category: 'focus',
  },
  {
    id: 'multi_target_track',
    nameKey: 'texVision.drills.multiTargetTrack.title',
    defaultName: 'Multi-Target Track',
    descriptionKey: 'texVision.drills.multiTargetTrack.description',
    defaultDescription: 'Track multiple moving objects',
    icon: '🔄',
    tier: 'advanced',
    duration: '2-4 min',
    category: 'tracking',
  },

  // ═══════════════════════════════════════════════════════════════
  // CHAOS TIER (4 drills)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'brock_string',
    nameKey: 'texVision.drills.brockString.title',
    defaultName: 'Brock String',
    descriptionKey: 'texVision.drills.brockString.description',
    defaultDescription: 'Advanced binocular coordination',
    icon: '🔗',
    tier: 'chaos',
    duration: '3-5 min',
    category: 'coordination',
  },
  {
    id: 'rapid_switch',
    nameKey: 'texVision.drills.rapidSwitch.title',
    defaultName: 'Rapid Switch',
    descriptionKey: 'texVision.drills.rapidSwitch.description',
    defaultDescription: 'Fast-paced cognitive switching',
    icon: '⚡',
    tier: 'chaos',
    duration: '2-3 min',
    category: 'reaction',
  },
  {
    id: 'dual_task_vision',
    nameKey: 'texVision.drills.dualTaskVision.title',
    defaultName: 'Dual-Task Vision',
    descriptionKey: 'texVision.drills.dualTaskVision.description',
    defaultDescription: 'Split attention training',
    icon: '🔀',
    tier: 'chaos',
    duration: '2-4 min',
    category: 'coordination',
  },
  {
    id: 'chaos_grid',
    nameKey: 'texVision.drills.chaosGrid.title',
    defaultName: 'Chaos Grid',
    descriptionKey: 'texVision.drills.chaosGrid.description',
    defaultDescription: 'Ultimate visual chaos challenge',
    icon: '🌀',
    tier: 'chaos',
    duration: '2-4 min',
    category: 'tracking',
  },
];

// Tier hierarchy for comparison
export const TIER_ORDER: Record<DrillTier, number> = {
  beginner: 0,
  advanced: 1,
  chaos: 2,
};

// Check if a drill tier is unlocked for a given user tier
export const isTierUnlocked = (drillTier: DrillTier, userTier: DrillTier): boolean => {
  return TIER_ORDER[drillTier] <= TIER_ORDER[userTier];
};

// Get drills filtered by tier accessibility
export const getDrillsForTier = (userTier: DrillTier): DrillDefinition[] => {
  return ALL_DRILLS.filter(drill => isTierUnlocked(drill.tier, userTier));
};

// Get drill by ID
export const getDrillById = (id: string): DrillDefinition | undefined => {
  return ALL_DRILLS.find(drill => drill.id === id);
};

// Get drills by category
export const getDrillsByCategory = (category: DrillCategory): DrillDefinition[] => {
  return ALL_DRILLS.filter(drill => drill.category === category);
};

// Get all categories
export const DRILL_CATEGORIES: DrillCategory[] = ['focus', 'tracking', 'reaction', 'coordination'];

// Category display names
export const CATEGORY_NAMES: Record<DrillCategory, string> = {
  focus: 'Focus',
  tracking: 'Tracking',
  reaction: 'Reaction',
  coordination: 'Coordination',
};
