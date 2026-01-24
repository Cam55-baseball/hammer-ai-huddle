/**
 * Drill Benefits - Connect drills to sport-specific skills
 * Shows users WHY each drill matters for their performance
 */

export interface DrillBenefit {
  skill: string;
  sportImpact: string;
  icon: string;
}

export const DRILL_BENEFITS: Record<string, DrillBenefit> = {
  // Beginner drills
  soft_focus: {
    skill: "Calm Awareness",
    sportImpact: "Stay relaxed under pressure at the plate",
    icon: "🧘"
  },
  pattern_search: {
    skill: "Visual Scanning",
    sportImpact: "Quickly spot field gaps and open players",
    icon: "🔍"
  },
  peripheral_vision: {
    skill: "Field Awareness",
    sportImpact: "See runners without looking away from the ball",
    icon: "👁️"
  },
  convergence: {
    skill: "Depth Focus",
    sportImpact: "Track balls approaching at high speed",
    icon: "🎯"
  },
  color_flash: {
    skill: "Color Recognition",
    sportImpact: "Instantly identify jersey colors and signals",
    icon: "⚡"
  },
  eye_relaxation: {
    skill: "Eye Recovery",
    sportImpact: "Reduce fatigue for consistent late-game vision",
    icon: "💆"
  },
  
  // Advanced drills
  near_far: {
    skill: "Focus Switching",
    sportImpact: "Shift from hands to outfield in a blink",
    icon: "🔄"
  },
  smooth_pursuit: {
    skill: "Smooth Tracking",
    sportImpact: "Follow the ball path without losing sight",
    icon: "👀"
  },
  whack_a_mole: {
    skill: "Go/No-Go Speed",
    sportImpact: "Faster swing decisions on good vs bad pitches",
    icon: "🎮"
  },
  meter_timing: {
    skill: "Precision Timing",
    sportImpact: "Perfect bat-ball contact timing",
    icon: "⏱️"
  },
  brock_string: {
    skill: "Eye Coordination",
    sportImpact: "Both eyes working together for depth accuracy",
    icon: "🔗"
  },
  stroop_challenge: {
    skill: "Mental Filtering",
    sportImpact: "Ignore distractions and focus on what matters",
    icon: "🧠"
  },
  multi_target_track: {
    skill: "Multi-Object Tracking",
    sportImpact: "Track the ball, runners, and fielders at once",
    icon: "📡"
  },
  
  // Chaos drills
  rapid_switch: {
    skill: "Task Switching",
    sportImpact: "Adapt instantly when plays change",
    icon: "🔀"
  },
  dual_task_vision: {
    skill: "Split Attention",
    sportImpact: "Watch pitcher while checking runners",
    icon: "🎭"
  },
  chaos_grid: {
    skill: "Focus Under Chaos",
    sportImpact: "Stay locked on target in noisy game situations",
    icon: "🌪️"
  },
};

/**
 * Get the benefit for a specific drill
 */
export function getDrillBenefit(drillId: string): DrillBenefit | null {
  return DRILL_BENEFITS[drillId] || null;
}
