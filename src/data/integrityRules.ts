export interface IntegrityFlagRule {
  id: string;
  label: string;
  severity: 'info' | 'warning' | 'critical';
  deductionPct: number;
  description: string;
}

export const integrityRules: IntegrityFlagRule[] = [
  { id: 'inflated_grading', label: 'Inflated Self-Grading', severity: 'warning', deductionPct: 5, description: 'Self-grades consistently >15% above coach grades' },
  { id: 'suspicious_volume', label: 'Suspicious Volume', severity: 'warning', deductionPct: 3, description: 'Volume spike >200% vs 14-day average' },
  { id: 'rapid_improvement', label: 'Rapid Improvement', severity: 'info', deductionPct: 2, description: 'Composite index increased >20% in 7 days' },
  { id: 'integrity_below_50', label: 'Critical Integrity', severity: 'critical', deductionPct: 15, description: 'Integrity score dropped below 50' },
  { id: 'integrity_below_70', label: 'Low Integrity', severity: 'warning', deductionPct: 8, description: 'Integrity score dropped below 70' },
  { id: 'self_coach_delta', label: 'Self-Coach Delta', severity: 'info', deductionPct: 3, description: 'Persistent gap between self and coach grades' },
  { id: 'retroactive_abuse', label: 'Retroactive Abuse', severity: 'warning', deductionPct: 5, description: 'Excessive retroactive session logging' },
  { id: 'fatigue_inconsistency_hrv', label: 'Fatigue Inconsistency', severity: 'info', deductionPct: 2, description: 'High grades during high fatigue state' },
  { id: 'game_inflation', label: 'Game Inflation', severity: 'warning', deductionPct: 5, description: 'Game grades significantly higher than practice with no improvement pattern' },
  { id: 'arbitration_request', label: 'Arbitration Request', severity: 'info', deductionPct: 0, description: 'Athlete requested grade review with video evidence' },
  { id: 'volume_spike', label: 'Volume Spike', severity: 'info', deductionPct: 2, description: 'Session count 3x above weekly average' },
  { id: 'grade_consistency', label: 'Grade Consistency', severity: 'info', deductionPct: 1, description: 'All grades within narrow band suggesting lack of differentiation' },
  { id: 'manual_admin', label: 'Manual Admin Flag', severity: 'critical', deductionPct: 10, description: 'Manually flagged by administrator' },
  { id: 'grade_reversal', label: 'Grade Reversal', severity: 'warning', deductionPct: 4, description: 'Grade edited significantly after initial submission' },
];

export const integrityRebuildRate = 0.5; // +0.5 per verified session
export const maxIntegrityScore = 100;
