/**
 * Relevance context for video recommendations.
 *
 * The tags encode the formula, so relevance is expressed as MORE TAG KEYS —
 * never as popularity or recency. Two extra signals are supplied here:
 *
 *   1. Season phase → the context-layer tags that describe the work an athlete
 *      is actually doing right now (cage / bullpen work out of season, live and
 *      pressure situations in season).
 *   2. The prescription focus → the correction-layer keys their current plan is
 *      working on, so a recommendation follows the plan rather than the clip.
 *
 * Only keys that exist in the taxonomy are listed. Nothing is invented, and a
 * key that has no video simply matches nothing.
 */
import type { SkillDomain, TagSport } from "./videoRecommendationEngine";

export type RelevancePhase = "preseason" | "in_season" | "post_season" | "off_season";

type PhaseMap = Partial<Record<RelevancePhase, string[]>>;

const CONTEXT_BY_PHASE: Record<SkillDomain, PhaseMap> = {
  hitting: {
    off_season: ["tee_work", "batting_practice"],
    preseason: ["batting_practice", "breaking_ball", "off_speed_pitches"],
    in_season: ["game_pressure", "two_strike", "risp", "high_velocity"],
    post_season: ["game_pressure", "two_strike", "fatigue_state"],
  },
  pitching: {
    off_season: ["bb_bullpen", "sb_bullpen"],
    preseason: ["bb_bullpen", "sb_bullpen", "bb_from_windup"],
    in_season: ["bb_from_stretch", "bb_runners_on", "sb_runners_on", "bb_high_pitch_count", "sb_high_pitch_count"],
    post_season: ["bb_high_pitch_count", "sb_high_pitch_count", "bb_runners_on", "sb_runners_on"],
  },
  throwing: {
    off_season: ["th_long_toss"],
    preseason: ["th_long_toss", "th_infield_feed"],
    in_season: ["th_double_play_turn", "th_catcher_throw_down", "th_outfield_relay"],
    post_season: ["th_double_play_turn", "th_outfield_relay"],
  },
  fielding: {
    preseason: ["fd_runners_on"],
    in_season: ["fd_runners_on", "fd_first_and_third", "fd_infield_in", "fd_bunt_defense"],
    post_season: ["fd_runners_on", "fd_first_and_third"],
  },
  base_running: {},
};

/** Context-layer keys that describe the athlete's current phase of the year. */
export function seasonContextTags(
  domain: SkillDomain | null | undefined,
  phase: RelevancePhase | null | undefined,
  sport?: TagSport | null,
): string[] {
  if (!domain || !phase) return [];
  const keys = CONTEXT_BY_PHASE[domain]?.[phase] ?? [];
  if (domain !== "pitching" || !sport || sport === "both") return keys;
  // Windmill and overhand tag families never cross.
  const prefix = sport === "softball" ? "sb_" : "bb_";
  return keys.filter((k) => k.startsWith(prefix));
}

/** Plain-language phase label used in the "why this" line. */
export function phaseLabel(phase: RelevancePhase | null | undefined): string | null {
  return phase === "in_season" ? "in season"
    : phase === "preseason" ? "preseason"
    : phase === "post_season" ? "postseason"
    : phase === "off_season" ? "off season"
    : null;
}
