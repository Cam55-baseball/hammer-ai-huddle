/**
 * Drill Completion Requirements
 * Ensures drills are legitimately completed before updating checklist
 */

export interface DrillCompletionValidation {
  minimumInteractions: number;  // Must have at least X actions
  minimumDurationSeconds: number;  // Must play for at least X seconds
  mustHaveResult: boolean;  // Must have accuracy/score data
}

export const COMPLETION_REQUIREMENTS: Record<string, DrillCompletionValidation> = {
  // Beginner drills
  soft_focus: { 
    minimumInteractions: 1,  // At least 1 peripheral tap
    minimumDurationSeconds: 20, 
    mustHaveResult: false 
  },
  pattern_search: { 
    minimumInteractions: 3, 
    minimumDurationSeconds: 10, 
    mustHaveResult: true 
  },
  peripheral_vision: { 
    minimumInteractions: 5, 
    minimumDurationSeconds: 15, 
    mustHaveResult: true 
  },
  convergence: { 
    minimumInteractions: 2,  // At least 2 "I see one dot" confirmations
    minimumDurationSeconds: 15, 
    mustHaveResult: false 
  },
  color_flash: { 
    minimumInteractions: 5, 
    minimumDurationSeconds: 15, 
    mustHaveResult: true 
  },
  eye_relaxation: { 
    minimumInteractions: 3,  // At least 3 "Continue" taps between steps
    minimumDurationSeconds: 30, 
    mustHaveResult: false 
  },
  
  // Advanced drills
  near_far: { 
    minimumInteractions: 5, 
    minimumDurationSeconds: 20, 
    mustHaveResult: true 
  },
  smooth_pursuit: { 
    minimumInteractions: 0, 
    minimumDurationSeconds: 20, 
    mustHaveResult: true 
  },
  whack_a_mole: { 
    minimumInteractions: 8, 
    minimumDurationSeconds: 20, 
    mustHaveResult: true 
  },
  meter_timing: { 
    minimumInteractions: 5, 
    minimumDurationSeconds: 15, 
    mustHaveResult: true 
  },
  brock_string: { 
    minimumInteractions: 0, 
    minimumDurationSeconds: 30, 
    mustHaveResult: false 
  },
  stroop_challenge: { 
    minimumInteractions: 8, 
    minimumDurationSeconds: 20, 
    mustHaveResult: true 
  },
  multi_target_track: { 
    minimumInteractions: 3, 
    minimumDurationSeconds: 20, 
    mustHaveResult: true 
  },
  
  // Chaos drills
  rapid_switch: { 
    minimumInteractions: 8, 
    minimumDurationSeconds: 25, 
    mustHaveResult: true 
  },
  dual_task_vision: { 
    minimumInteractions: 5, 
    minimumDurationSeconds: 25, 
    mustHaveResult: true 
  },
  chaos_grid: { 
    minimumInteractions: 5, 
    minimumDurationSeconds: 25, 
    mustHaveResult: true 
  },
};

/**
 * Validates if a drill completion meets minimum requirements
 */
export function validateDrillCompletion(
  drillId: string,
  interactionCount: number,
  durationSeconds: number,
  hasResult: boolean
): { isValid: boolean; reason?: string } {
  const requirements = COMPLETION_REQUIREMENTS[drillId];
  
  if (!requirements) {
    // Unknown drill - allow completion by default
    return { isValid: true };
  }
  
  if (interactionCount < requirements.minimumInteractions) {
    return { 
      isValid: false, 
      reason: `Need at least ${requirements.minimumInteractions} actions` 
    };
  }
  
  if (durationSeconds < requirements.minimumDurationSeconds) {
    return { 
      isValid: false, 
      reason: `Need at least ${requirements.minimumDurationSeconds} seconds` 
    };
  }
  
  if (requirements.mustHaveResult && !hasResult) {
    return { 
      isValid: false, 
      reason: 'Drill must have results to count' 
    };
  }
  
  return { isValid: true };
}
