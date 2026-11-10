/**
 * Recovery reading for the AI workout recommendations. Pure, dependency-free so tests can run it.
 *
 * Owner Nov 9: Perceived Recovery is asked 1–10; 4 or below is poor.
 * Owner Nov 9 ("no mental measurement"): stress is NOT part of this feature. Older website and
 * iPhone builds may still send `stressLevel` (and a "High stress levels detected" reason); both
 * are accepted and ignored.
 */

export interface RecoveryContext {
  sleepQuality: number | null;
  /** Accepted from older clients and ignored. */
  stressLevel?: unknown;
  physicalReadiness: number | null;
  perceivedRecovery: number | null;
  painAreas: string[];
  painScales: Record<string, number> | null;
  suggestRecovery: boolean;
  recoveryReason: string | null;
}

export interface RecoveryWarning {
  show: boolean;
  severity: 'moderate' | 'high';
  reason: string;
  suggestions: string[];
}

export const POOR_RECOVERY_MAX = 4;

/** The reason older clients sent when only stress triggered a recovery suggestion. */
const LEGACY_STRESS_REASON = /stress/i;

/** Drop anything stress-derived that an older client sent, so stress never reaches the AI. */
export function withoutStress(context: RecoveryContext | undefined): RecoveryContext | undefined {
  if (!context) return context;
  const { stressLevel: _ignored, ...rest } = context;
  if (rest.recoveryReason && LEGACY_STRESS_REASON.test(rest.recoveryReason)) {
    return { ...rest, suggestRecovery: false, recoveryReason: null };
  }
  return rest;
}

export function analyzeRecoveryStatus(context: RecoveryContext | undefined): RecoveryWarning | null {
  if (!context) return null;

  const { sleepQuality, physicalReadiness, perceivedRecovery, painScales } = context;
  const painAreas = context.painAreas ?? [];

  let avgPainLevel = 0;
  if (painScales && Object.keys(painScales).length > 0) {
    avgPainLevel = Object.values(painScales).reduce((sum, v) => sum + v, 0) / Object.keys(painScales).length;
  }

  const issues: string[] = [];
  const suggestions: string[] = [];
  let severity: 'moderate' | 'high' = 'moderate';

  if (sleepQuality !== null && sleepQuality <= 2) {
    issues.push('poor sleep quality');
    suggestions.push('Consider lighter volume or active recovery');
    if (sleepQuality === 1) severity = 'high';
  }
  if (physicalReadiness !== null && physicalReadiness <= 2) {
    issues.push('low physical readiness');
    suggestions.push('Prioritize mobility work and dynamic stretching');
    if (physicalReadiness === 1) severity = 'high';
  }
  if (perceivedRecovery !== null && perceivedRecovery <= POOR_RECOVERY_MAX) {
    issues.push('incomplete recovery from previous training');
    suggestions.push('Allow additional rest between sets');
  }
  if (painAreas.length >= 3) {
    issues.push(`multiple pain areas detected (${painAreas.length} areas)`);
    suggestions.push('Consider a recovery-focused session or targeted mobility work');
    severity = 'high';
  } else if (painAreas.length > 0) {
    issues.push(`${painAreas.length} pain area(s) reported`);
    suggestions.push('Avoid exercises that stress painful areas');
  }
  if (avgPainLevel >= 7) {
    issues.push('high pain intensity detected');
    suggestions.push('Strongly recommend rest or gentle recovery work only');
    severity = 'high';
  }

  if (issues.length === 0) return null;

  return {
    show: true,
    severity,
    reason: `Based on your check-in: ${issues.join(', ')}.`,
    suggestions: [...new Set(suggestions)],
  };
}
