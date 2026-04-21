// Season-aware interpretation profiles for the recap engine.
// Returns the priorities and de-emphases the AI must follow when writing the narrative.

import type { SeasonPhase } from './contextEngine.ts';

export interface InterpretationProfile {
  phase: SeasonPhase;
  emphasize: string[];
  deEmphasize: string[];
  toneGuidance: string;
}

const DEFAULTS: Record<SeasonPhase, InterpretationProfile> = {
  in_season: {
    phase: 'in_season',
    emphasize: [
      'performance stability and output consistency',
      'fatigue and recovery management',
      'practice-to-game transfer (transferGap)',
      'small adjustments that preserve confidence',
    ],
    deEmphasize: [
      'aggressive mechanical changes',
      'max-volume strength pushes',
      'introducing brand-new movement patterns mid-cycle',
    ],
    toneGuidance: 'Direct, confidence-preserving, focused on protecting performance and bandwidth. Avoid prescribing overhauls.',
  },
  post_season: {
    phase: 'post_season',
    emphasize: [
      'recovery trends and pain resolution',
      'physical reset and sleep restoration',
      'foundational rebuild opportunities',
      'reflection on the season just completed',
    ],
    deEmphasize: [
      'in-season output expectations',
      'aggressive intensity prescriptions',
    ],
    toneGuidance: 'Reflective, restorative. Frame this window as the body and mind cooling down, then preparing to grow.',
  },
  off_season: {
    phase: 'off_season',
    emphasize: [
      'development gains and skill acquisition',
      'mechanical improvements and movement quality',
      'physical growth (strength, mobility, weight goals)',
      'rebuilding the engine for next season',
    ],
    deEmphasize: [
      'in-game stability metrics',
      'transfer gap as a primary concern (no live games yet)',
    ],
    toneGuidance: 'Growth-oriented, ambitious, willing to prescribe aggressive changes when the data supports them.',
  },
  preseason: {
    phase: 'preseason',
    emphasize: [
      'ramp-up curve and intensity progression',
      'readiness for opening day',
      'consolidation of off-season gains into game-speed reps',
      'monitoring fatigue as volume increases',
    ],
    deEmphasize: [
      'introducing brand-new mechanical changes',
      'pure recovery framing (athlete is building toward output)',
    ],
    toneGuidance: 'Sharpening, focused, monitoring readiness. Highlight what is locked in vs what still needs reps.',
  },
};

export function getInterpretationProfile(
  phase: SeasonPhase,
  seasonOverrides: Record<string, Partial<InterpretationProfile>> = {},
): InterpretationProfile {
  const base = DEFAULTS[phase] ?? DEFAULTS.off_season;
  const override = seasonOverrides[phase];
  if (!override) return base;
  return {
    phase,
    emphasize: override.emphasize ?? base.emphasize,
    deEmphasize: override.deEmphasize ?? base.deEmphasize,
    toneGuidance: override.toneGuidance ?? base.toneGuidance,
  };
}
