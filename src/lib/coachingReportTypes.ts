// Types for AI-generated coaching reports

export interface SituationalSplit {
  category: string;
  metric: string;
  value: string;
  context: string;
}

export interface RootCause {
  issue: string;
  classification: 'perception' | 'decision' | 'execution' | 'consistency';
  mechanism: string;   // precise biomechanical/cognitive failure
  trigger: string;     // when/under what condition
  failureChain: string; // step-by-step breakdown
  evidence: string;
  confidence: 'high' | 'medium' | 'low';
  dataSignals: string[];
}

export interface PriorityItem {
  rank: number;
  issue: string;
  gameImpact: string;
}

export interface PrescriptiveFix {
  issue: string;
  drill: string;
  constraint: string;
  cue: string;
}

export interface GameTransferItem {
  issue: string;
  realWorldImpact: string;
}

export interface AdaptiveProgression {
  improvements: string[];
  emergingWeaknesses: string[];
  primaryLimiter: string;
}

export interface SessionFocusArea {
  area: string;
  repPct: number;
}

export interface NextSessionFocus {
  primaryWeakness: SessionFocusArea;
  secondaryIssue: SessionFocusArea;
  strengthMaintenance: SessionFocusArea;
}

export interface CoachingReport {
  performanceBreakdown: {
    situationalSplits: SituationalSplit[];
    patterns: string[];
  };
  rootCauseAnalysis: RootCause[];
  priorityStack: PriorityItem[];
  prescriptiveFixes: PrescriptiveFix[];
  gameTransfer: GameTransferItem[];
  adaptiveProgression: AdaptiveProgression | null;
  nextSessionFocus: NextSessionFocus | null;
}

export const ROOT_CAUSE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  perception: { label: 'Perception', color: 'text-purple-500', icon: '👁️' },
  decision: { label: 'Decision', color: 'text-amber-500', icon: '🧠' },
  execution: { label: 'Execution', color: 'text-blue-500', icon: '💪' },
  consistency: { label: 'Consistency', color: 'text-red-500', icon: '📉' },
};
