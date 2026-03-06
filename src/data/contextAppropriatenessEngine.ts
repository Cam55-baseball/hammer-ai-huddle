/**
 * Context Appropriateness Engine
 * 
 * Dynamically determines which field groups are visible based on:
 * - Module (hitting, pitching, fielding, catching, throwing, baserunning)
 * - Position (C, P, 1B, 2B, 3B, SS, LF, CF, RF, etc.)
 * - Sport (baseball, softball)
 * - Session type (solo_work, team_session, lesson, game, live_abs)
 * - Rep source (tee, live_bp, bullpen, etc.)
 *
 * FOUNDER-MANDATED FIELDS (protected, cannot be removed):
 * Execution Score, Pitch Location, ABS Guess, Pitcher Spot Intent,
 * Swing Decision, Contact Quality, Exit Direction, Pitch Type,
 * Velocity Band, Thrower Hand, Batter Side, Tee Depth Zone,
 * all catcher metrics (pop time, transfer, throw base),
 * all throw tracking fields, infield rep type, play direction
 */

export interface ContextFieldVisibility {
  // Pitching-only metrics
  showSpinDirection: boolean;
  // Pitching contact/hitter tracking
  showContactType: boolean;
  showLiveAbHitterFields: boolean;
  // Position-gated fielding
  showCatcherFields: boolean;
  showInfieldRepType: boolean;
  // Fielding-only
  showPlayDirection: boolean;
  // Fielding, catching, throwing
  showThrowFields: boolean;
  // Hitting-only advanced
  showApproachQuality: boolean;
  showBattedBallType: boolean;
  showSwingIntent: boolean;
  showCountSituation: boolean;
}

const INFIELD_POSITIONS = ['P', '1B', '2B', '3B', 'SS'];

export function getContextFields(
  module: string,
  position?: string,
  _sport?: string,
  _sessionType?: string,
  repSource?: string
): ContextFieldVisibility {
  const isPitching = module === 'pitching';
  const isHitting = module === 'hitting';
  const isFielding = module === 'fielding';
  const isCatching = module === 'catching';
  const isThrowing = module === 'throwing';

  return {
    // Spin direction available for both pitching and hitting (hitter contact analytics)
    showSpinDirection: isPitching || isHitting,

    // Contact type for pitching when facing a hitter
    showContactType: isPitching && (repSource === 'flat_ground_vs_hitter' || repSource === 'live_bp'),

    // Live AB hitter tracking (swing result, ball result, at-bat outcome)
    showLiveAbHitterFields: isPitching && repSource === 'live_bp',

    // Catcher-specific fields (pop time, transfer, throw base)
    showCatcherFields: (isFielding && position === 'C') || isCatching,

    // Infield rep type (double play, clean pick)
    showInfieldRepType: isFielding && !!position && INFIELD_POSITIONS.includes(position),

    // Play direction (all fielding positions)
    showPlayDirection: isFielding,

    // Throw tracking (accuracy direction, arrival, strength)
    showThrowFields: isFielding || isCatching || isThrowing,

    // Hitting-only advanced fields
    showApproachQuality: isHitting,
    showBattedBallType: isHitting,
    showSwingIntent: isHitting,
    showCountSituation: isHitting,
  };
}
