import type { SkillDomain } from '@/lib/videoRecommendationEngine';
import type { VideoMomentConfig, VideoMomentKind } from './types';

export const MOMENT_CONFIG: Record<VideoMomentKind, VideoMomentConfig> = {
  analysis_complete: {
    title: 'Watch this next',
    blurb: 'Picked from what your analysis just found.',
    mode: 'session',
    cooldownMinutes: 0,
  },
  session_saved: {
    title: 'From this session',
    blurb: 'Based on how the reps actually went.',
    mode: 'session',
    cooldownMinutes: 30,
  },
  game_logged: {
    title: 'After the game',
    blurb: 'Based on the at-bats, pitches and plays you logged.',
    mode: 'session',
    cooldownMinutes: 60,
  },
  delaycam_saved: {
    title: 'Clip saved — study this',
    blurb: 'Matched to the move you just filmed.',
    mode: 'session',
    cooldownMinutes: 30,
  },
  plan_card_complete: {
    title: 'Nice work — go deeper',
    blurb: 'Matched to the block you just finished.',
    mode: 'session',
    cooldownMinutes: 120,
  },
  drill_complete: {
    title: 'Drill done — see it done right',
    blurb: 'Matched to the drill you just completed.',
    mode: 'session',
    cooldownMinutes: 120,
  },
  weakness_detected: {
    title: 'Your development picks',
    blurb: 'Based on your long-term weakness profile.',
    mode: 'long_term',
    cooldownMinutes: 720,
  },
};

/**
 * Subscription module that owns a skill domain.
 * Tier logic (5tool / golden2way) lives in `useSubscription.hasAccessForSport`.
 */
export function domainToModule(domain: SkillDomain): 'hitting' | 'pitching' | 'throwing' {
  if (domain === 'hitting') return 'hitting';
  if (domain === 'pitching') return 'pitching';
  return 'throwing';
}

/** Foundation library domain for a skill domain (same vocabulary today). */
export function domainToFoundationDomain(domain: SkillDomain) {
  return domain as 'hitting' | 'pitching' | 'throwing' | 'fielding' | 'base_running';
}

/**
 * Map an app "module"/category string (drills, plan cards, practice modules)
 * onto the skill domain that owns it. Returns null when nothing sane maps.
 */
export function moduleToSkillDomain(mod?: string | null): SkillDomain | null {
  if (!mod) return null;
  const m = String(mod).toLowerCase();
  if (m.includes('bat') || m.includes('hit') || m.includes('swing')) return 'hitting';
  if (m.includes('pitch')) return 'pitching';
  if (m.includes('throw') || m.includes('arm')) return 'throwing';
  if (m.includes('field') || m.includes('defen') || m.includes('catch')) return 'fielding';
  if (m.includes('baserun') || m.includes('base_run') || m.includes('speed') || m.includes('run'))
    return 'base_running';
  return null;
}
