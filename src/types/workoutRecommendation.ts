import { Exercise } from './customActivity';

/**
 * Recovery status data from check-ins
 */
export interface RecoveryContext {
  sleepQuality: number | null; // 1-5 scale
  stressLevel: number | null; // 1-5 scale
  physicalReadiness: number | null; // 1-5 scale
  perceivedRecovery: number | null; // 1-5 scale
  painAreas: string[];
  painScales: Record<string, number> | null; // pain area -> intensity (1-10)
  suggestRecovery: boolean;
  recoveryReason: string | null;
}

/**
 * Exercise with pain-based warning information
 */
export interface ExerciseWithWarning extends Exercise {
  painWarning?: {
    severity: 'moderate' | 'high';
    message: string;
    affectedAreas: string[];
  };
}

/**
 * Enhanced workout recommendation with recovery context
 */
export interface WorkoutRecommendation {
  id: string;
  name: string;
  focus: 'strength' | 'cardio' | 'recovery' | 'balanced';
  exercises: ExerciseWithWarning[];
  reasoning: string;
  estimatedDuration: number;
  confidence: number;
  // New: lighter alternative when recovery is poor
  isLighterAlternative?: boolean;
  originalRecommendationId?: string;
}

/**
 * Response from workout recommendations API
 */
export interface WorkoutRecommendationsResponse {
  recommendations: WorkoutRecommendation[];
  analysisNote?: string;
  // New: recovery-aware response fields
  recoveryWarning?: {
    show: boolean;
    severity: 'moderate' | 'high';
    reason: string;
    suggestions: string[];
  };
  lighterAlternatives?: WorkoutRecommendation[];
}

/**
 * Request payload for workout recommendations
 */
export interface WorkoutRecommendationsRequest {
  activityLogs: any[];
  recoveryContext?: RecoveryContext;
}
