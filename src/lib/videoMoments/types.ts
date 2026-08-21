import type { SkillDomain, SuggestionMode, TagSport } from '@/lib/videoRecommendationEngine';

/** Every point in the app where a video suggestion may surface. */
export type VideoMomentKind =
  | 'analysis_complete'
  | 'session_saved'
  | 'game_logged'
  | 'delaycam_saved'
  | 'plan_card_complete'
  | 'drill_complete'
  | 'weakness_detected';

export interface VideoMomentEvent {
  kind: VideoMomentKind;
  skillDomain: SkillDomain;
  /** Movement-pattern tag keys derived from what just happened. */
  movementPatterns?: string[];
  /** Result tag keys (outcomes) derived from what just happened. */
  resultTags?: string[];
  /** Context tag keys (count, pitch type, situation…). */
  contextTags?: string[];
  /** Overrides the active sport theme. */
  sport?: TagSport | null;
  /** Side the athlete just worked (switch hitters / ambidextrous throwers). */
  side?: 'left' | 'right' | null;
  /** Human label for the thing that just finished ("Bat speed block"). */
  label?: string | null;
  /** Stable id used for cooldown bookkeeping (session id, game id, card id…). */
  sourceId?: string | null;
}

/** Normalized row rendered by the moment UI, whichever tier produced it. */
export interface VideoMomentItem {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl?: string | null;
  reasons: string[];
}

/** Which fallback tier produced the current items. */
export type VideoMomentTier = 'tagged' | 'domain' | 'foundation' | 'none';

export interface VideoMomentConfig {
  title: string;
  blurb: string;
  mode: SuggestionMode;
  /** Minutes before this moment kind may pop up again. */
  cooldownMinutes: number;
}
