/**
 * Pain-Based Exercise Filtering Utility
 * 
 * Maps anatomical pain areas to exercises that should be avoided or warned about.
 * Integrates fascia line connections for holistic recommendations.
 */

// Exercises to warn about when pain is detected in specific areas
export const PAIN_EXERCISE_WARNINGS: Record<string, string[]> = {
  // Lower Body - Hamstrings
  'left_hamstring_inner': ['Deadlifts', 'Romanian Deadlifts', 'Leg Curls', 'Sprints', 'Stiff-Leg Deadlifts', 'Good Mornings'],
  'left_hamstring_outer': ['Deadlifts', 'Romanian Deadlifts', 'Leg Curls', 'Sprints', 'Stiff-Leg Deadlifts', 'Good Mornings'],
  'right_hamstring_inner': ['Deadlifts', 'Romanian Deadlifts', 'Leg Curls', 'Sprints', 'Stiff-Leg Deadlifts', 'Good Mornings'],
  'right_hamstring_outer': ['Deadlifts', 'Romanian Deadlifts', 'Leg Curls', 'Sprints', 'Stiff-Leg Deadlifts', 'Good Mornings'],
  
  // Lower Body - Quads
  'left_quad_inner': ['Squats', 'Leg Press', 'Lunges', 'Leg Extensions', 'Box Jumps', 'Jump Squats'],
  'left_quad_outer': ['Squats', 'Leg Press', 'Lunges', 'Leg Extensions', 'Box Jumps', 'Jump Squats'],
  'right_quad_inner': ['Squats', 'Leg Press', 'Lunges', 'Leg Extensions', 'Box Jumps', 'Jump Squats'],
  'right_quad_outer': ['Squats', 'Leg Press', 'Lunges', 'Leg Extensions', 'Box Jumps', 'Jump Squats'],
  
  // Lower Body - Glutes
  'left_glute': ['Hip Thrusts', 'Squats', 'Deadlifts', 'Lunges', 'Bulgarian Split Squats', 'Step Ups'],
  'right_glute': ['Hip Thrusts', 'Squats', 'Deadlifts', 'Lunges', 'Bulgarian Split Squats', 'Step Ups'],
  
  // Lower Body - Calves
  'left_calf_inner': ['Calf Raises', 'Box Jumps', 'Sprints', 'Jump Rope', 'Plyometrics'],
  'left_calf_outer': ['Calf Raises', 'Box Jumps', 'Sprints', 'Jump Rope', 'Plyometrics'],
  'right_calf_inner': ['Calf Raises', 'Box Jumps', 'Sprints', 'Jump Rope', 'Plyometrics'],
  'right_calf_outer': ['Calf Raises', 'Box Jumps', 'Sprints', 'Jump Rope', 'Plyometrics'],
  
  // Lower Body - Groin/Hip Flexors
  'left_groin': ['Squats', 'Lunges', 'Sumo Deadlifts', 'Side Lunges', 'Adductor Machine'],
  'right_groin': ['Squats', 'Lunges', 'Sumo Deadlifts', 'Side Lunges', 'Adductor Machine'],
  'left_hip_flexor': ['Lunges', 'High Knees', 'Leg Raises', 'Mountain Climbers', 'Sprints'],
  'right_hip_flexor': ['Lunges', 'High Knees', 'Leg Raises', 'Mountain Climbers', 'Sprints'],
  
  // Lower Body - IT Band
  'left_it_band': ['Squats', 'Lunges', 'Side Lunges', 'Running', 'Cycling'],
  'right_it_band': ['Squats', 'Lunges', 'Side Lunges', 'Running', 'Cycling'],
  
  // Back - Lower
  'lower_back_center': ['Deadlifts', 'Squats', 'Bent Over Rows', 'Good Mornings', 'Romanian Deadlifts', 'Barbell Rows'],
  'lower_back_left': ['Deadlifts', 'Squats', 'Bent Over Rows', 'Good Mornings', 'Romanian Deadlifts'],
  'lower_back_right': ['Deadlifts', 'Squats', 'Bent Over Rows', 'Good Mornings', 'Romanian Deadlifts'],
  
  // Back - Upper
  'left_upper_back': ['Pull Ups', 'Rows', 'Lat Pulldowns', 'Face Pulls', 'Shrugs'],
  'right_upper_back': ['Pull Ups', 'Rows', 'Lat Pulldowns', 'Face Pulls', 'Shrugs'],
  'left_lat': ['Pull Ups', 'Lat Pulldowns', 'Rows', 'Pullovers', 'Straight Arm Pulldowns'],
  'right_lat': ['Pull Ups', 'Lat Pulldowns', 'Rows', 'Pullovers', 'Straight Arm Pulldowns'],
  
  // Shoulders
  'left_shoulder_front': ['Overhead Press', 'Bench Press', 'Front Raises', 'Arnold Press', 'Incline Press', 'Throwing'],
  'right_shoulder_front': ['Overhead Press', 'Bench Press', 'Front Raises', 'Arnold Press', 'Incline Press', 'Throwing'],
  'left_shoulder_back': ['Face Pulls', 'Reverse Flyes', 'Rows', 'External Rotation', 'Band Pull Aparts'],
  'right_shoulder_back': ['Face Pulls', 'Reverse Flyes', 'Rows', 'External Rotation', 'Band Pull Aparts'],
  
  // Arms
  'left_bicep': ['Bicep Curls', 'Pull Ups', 'Chin Ups', 'Rows', 'Hammer Curls'],
  'right_bicep': ['Bicep Curls', 'Pull Ups', 'Chin Ups', 'Rows', 'Hammer Curls'],
  'left_tricep': ['Tricep Extensions', 'Bench Press', 'Dips', 'Skull Crushers', 'Close Grip Bench'],
  'right_tricep': ['Tricep Extensions', 'Bench Press', 'Dips', 'Skull Crushers', 'Close Grip Bench'],
  'left_forearm_front': ['Wrist Curls', 'Deadlifts', 'Pull Ups', 'Bicep Curls', 'Batting', 'Throwing'],
  'right_forearm_front': ['Wrist Curls', 'Deadlifts', 'Pull Ups', 'Bicep Curls', 'Batting', 'Throwing'],
  'left_forearm_back': ['Reverse Wrist Curls', 'Deadlifts', 'Rows', 'Batting', 'Throwing'],
  'right_forearm_back': ['Reverse Wrist Curls', 'Deadlifts', 'Rows', 'Batting', 'Throwing'],
  
  // Wrists
  'left_wrist': ['Push-ups', 'Bench Press', 'Front Squats', 'Batting', 'Throwing', 'Wrist Curls'],
  'right_wrist': ['Push-ups', 'Bench Press', 'Front Squats', 'Batting', 'Throwing', 'Wrist Curls'],
  
  // Chest
  'left_chest': ['Bench Press', 'Push-ups', 'Chest Flyes', 'Dips', 'Incline Press'],
  'right_chest': ['Bench Press', 'Push-ups', 'Chest Flyes', 'Dips', 'Incline Press'],
  'sternum': ['Bench Press', 'Push-ups', 'Chest Flyes', 'Dips'],
  
  // Core
  'upper_abs': ['Crunches', 'Sit-ups', 'V-ups', 'Leg Raises', 'Cable Crunches'],
  'lower_abs': ['Leg Raises', 'Reverse Crunches', 'Hanging Leg Raises', 'Mountain Climbers'],
  'left_oblique': ['Russian Twists', 'Side Planks', 'Woodchops', 'Oblique Crunches', 'Throwing'],
  'right_oblique': ['Russian Twists', 'Side Planks', 'Woodchops', 'Oblique Crunches', 'Throwing'],
  
  // Neck
  'neck_front': ['Shrugs', 'Overhead Press', 'Neck Flexion', 'Batting'],
  'neck_back': ['Shrugs', 'Deadlifts', 'Rows', 'Neck Extension'],
  'left_neck_side': ['Shrugs', 'Lateral Raises', 'Neck Side Flexion'],
  'right_neck_side': ['Shrugs', 'Lateral Raises', 'Neck Side Flexion'],
  
  // Knees
  'left_knee_side': ['Squats', 'Lunges', 'Leg Press', 'Lateral Movements', 'Running'],
  'right_knee_side': ['Squats', 'Lunges', 'Leg Press', 'Lateral Movements', 'Running'],
  
  // Ankles/Feet
  'left_achilles': ['Calf Raises', 'Jumping', 'Running', 'Sprints', 'Plyometrics'],
  'right_achilles': ['Calf Raises', 'Jumping', 'Running', 'Sprints', 'Plyometrics'],
  'left_ankle_inside': ['Squats', 'Lunges', 'Running', 'Lateral Movements'],
  'right_ankle_inside': ['Squats', 'Lunges', 'Running', 'Lateral Movements'],
  'left_heel': ['Running', 'Jumping', 'Box Jumps', 'Sprints'],
  'right_heel': ['Running', 'Jumping', 'Box Jumps', 'Sprints'],
};

// Fascia line mappings for connected area analysis
export const FASCIA_LINE_AREAS: Record<string, string[]> = {
  'Back Track (SBL)': [
    'neck_back', 'left_upper_back', 'right_upper_back',
    'lower_back_center', 'lower_back_left', 'lower_back_right',
    'left_glute', 'right_glute', 'left_hamstring_inner', 'left_hamstring_outer',
    'right_hamstring_inner', 'right_hamstring_outer', 'left_calf_inner',
    'left_calf_outer', 'right_calf_inner', 'right_calf_outer',
    'left_achilles', 'right_achilles', 'left_heel', 'right_heel'
  ],
  'Front Track (SFL)': [
    'head_front', 'neck_front', 'sternum',
    'left_chest', 'right_chest', 'upper_abs', 'lower_abs',
    'left_quad_inner', 'left_quad_outer', 'right_quad_inner', 'right_quad_outer',
    'left_shin', 'right_shin', 'left_foot_top', 'right_foot_top'
  ],
  'Side Track (LL)': [
    'left_temple', 'right_temple', 'left_neck_side', 'right_neck_side',
    'left_oblique', 'right_oblique', 'left_it_band', 'right_it_band',
    'left_knee_side', 'right_knee_side'
  ],
  'Arm Tracks': [
    'left_shoulder_front', 'right_shoulder_front',
    'left_shoulder_back', 'right_shoulder_back', 'left_bicep', 'right_bicep',
    'left_tricep', 'right_tricep', 'left_forearm_front', 'right_forearm_front',
    'left_forearm_back', 'right_forearm_back', 'left_wrist', 'right_wrist',
    'left_hand', 'right_hand'
  ],
  'Core Track (DFL)': [
    'neck_front', 'sternum', 'upper_abs', 'lower_abs',
    'left_hip_flexor', 'right_hip_flexor', 'left_groin', 'right_groin'
  ],
  'Twist Track (SPL)': [
    'left_oblique', 'right_oblique', 'left_lat', 'right_lat',
    'left_serratus', 'right_serratus'
  ],
};

export interface ExerciseFilterResult {
  allowed: string[];
  warned: Array<{ exercise: string; reason: string; painAreas: string[] }>;
}

/**
 * Filter exercises based on pain areas - returns warnings rather than blocking
 */
export function filterExercisesForPain(
  exercises: string[],
  painAreas: string[],
  painScales?: Record<string, number>
): ExerciseFilterResult {
  const warned: Array<{ exercise: string; reason: string; painAreas: string[] }> = [];
  const allowed: string[] = [];

  exercises.forEach(exercise => {
    const exerciseLower = exercise.toLowerCase();
    const matchingPainAreas: string[] = [];

    painAreas.forEach(area => {
      const restrictions = PAIN_EXERCISE_WARNINGS[area] || [];
      const hasMatch = restrictions.some(restricted =>
        exerciseLower.includes(restricted.toLowerCase()) ||
        restricted.toLowerCase().includes(exerciseLower)
      );
      if (hasMatch) {
        matchingPainAreas.push(area);
      }
    });

    if (matchingPainAreas.length > 0) {
      const avgPain = painScales
        ? matchingPainAreas.reduce((sum, a) => sum + (painScales[a] || 5), 0) / matchingPainAreas.length
        : 5;

      warned.push({
        exercise,
        reason: avgPain >= 7
          ? 'High pain detected - consider skipping'
          : 'Moderate pain - proceed with caution',
        painAreas: matchingPainAreas,
      });
    } else {
      allowed.push(exercise);
    }
  });

  return { allowed, warned };
}

/**
 * Get fascia line for a body area
 */
export function getFasciaLine(area: string): string | null {
  for (const [line, areas] of Object.entries(FASCIA_LINE_AREAS)) {
    if (areas.includes(area)) {
      return line;
    }
  }
  return null;
}

/**
 * Get all areas connected via fascia to the given pain areas
 */
export function getConnectedFasciaAreas(painAreas: string[]): string[] {
  const connectedAreas = new Set<string>();
  const affectedAreas = new Set(painAreas);

  painAreas.forEach(area => {
    for (const [, lineAreas] of Object.entries(FASCIA_LINE_AREAS)) {
      if (lineAreas.includes(area)) {
        lineAreas.forEach(connectedArea => {
          if (!affectedAreas.has(connectedArea)) {
            connectedAreas.add(connectedArea);
          }
        });
      }
    }
  });

  return Array.from(connectedAreas);
}

/**
 * Get preventive mobility recommendations based on pain areas
 */
export function getPreventiveMobilityAreas(painAreas: string[]): string[] {
  const mobilityTargets = new Set<string>();

  painAreas.forEach(area => {
    const fasciaLine = getFasciaLine(area);
    if (fasciaLine) {
      const connectedAreas = FASCIA_LINE_AREAS[fasciaLine] || [];
      // Add adjacent areas for mobility work
      connectedAreas.forEach(a => {
        if (!painAreas.includes(a)) {
          mobilityTargets.add(a);
        }
      });
    }
  });

  // Return top 6 most relevant areas
  return Array.from(mobilityTargets).slice(0, 6);
}

/**
 * Determine if workout focus should shift to recovery based on pain data
 */
export function shouldRecommendRecoveryFocus(
  painAreas: string[],
  painScales?: Record<string, number>
): { recommend: boolean; reason: string } {
  if (painAreas.length === 0) {
    return { recommend: false, reason: '' };
  }

  // Multiple pain areas = recommend recovery
  if (painAreas.length >= 3) {
    return {
      recommend: true,
      reason: `Multiple pain areas detected (${painAreas.length}). Consider a recovery-focused session.`
    };
  }

  // High pain intensity = recommend recovery
  if (painScales) {
    const avgPain = Object.values(painScales).reduce((sum, v) => sum + v, 0) / Object.values(painScales).length;
    if (avgPain >= 7) {
      return {
        recommend: true,
        reason: `High average pain intensity (${avgPain.toFixed(1)}/10). Recovery recommended.`
      };
    }
  }

  return { recommend: false, reason: '' };
}

/**
 * Format pain area ID to human-readable label
 */
export function formatPainAreaLabel(areaId: string): string {
  return areaId
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}
