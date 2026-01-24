/**
 * Simplified Drill Instructions - Kid-Friendly Format
 * Each drill has: 1 goal sentence + max 3 action steps with icons
 */

export type ActionIcon = 'tap' | 'watch' | 'hold' | 'find' | 'avoid' | 'follow' | 'breathe' | 'switch';

export interface QuickStep {
  icon: ActionIcon;
  action: string;
}

export interface SimplifiedDrillInstruction {
  goalSentence: string;
  quickSteps: QuickStep[];
  successCriteria: string;
}

// Icon emoji mapping
export const ACTION_ICONS: Record<ActionIcon, string> = {
  tap: '👆',
  watch: '👀',
  hold: '✋',
  find: '🔍',
  avoid: '🚫',
  follow: '➡️',
  breathe: '🌬️',
  switch: '🔄',
};

export const SIMPLIFIED_INSTRUCTIONS: Record<string, SimplifiedDrillInstruction> = {
  // Beginner drills
  soft_focus: {
    goalSentence: "Relax your eyes and notice the whole screen!",
    quickSteps: [
      { icon: 'watch', action: "Look at the center dot softly" },
      { icon: 'breathe', action: "Breathe with the pulsing rhythm" },
      { icon: 'tap', action: "Tap the glowing circles on the sides" }
    ],
    successCriteria: "Complete all breathing cycles and tap peripheral prompts"
  },
  
  pattern_search: {
    goalSentence: "Find and tap all the matching shapes!",
    quickSteps: [
      { icon: 'find', action: "See which shape to find at the top" },
      { icon: 'tap', action: "Tap all the matching shapes quickly" },
      { icon: 'avoid', action: "Don't tap the wrong shapes" }
    ],
    successCriteria: "Find all targets with high accuracy"
  },
  
  peripheral_vision: {
    goalSentence: "Keep your eyes on the middle, tap targets around you!",
    quickSteps: [
      { icon: 'watch', action: "Stare at the center dot" },
      { icon: 'tap', action: "Tap targets on the sides WITHOUT looking" },
      { icon: 'hold', action: "Trust your side vision!" }
    ],
    successCriteria: "React to peripheral targets accurately"
  },
  
  convergence: {
    goalSentence: "Watch the dots come together—you should see ONE dot!",
    quickSteps: [
      { icon: 'watch', action: "Follow the dots with your eyes" },
      { icon: 'tap', action: "Tap when you see ONE dot!" },
      { icon: 'breathe', action: "Stay relaxed the whole time" }
    ],
    successCriteria: "Confirm when dots merge into one"
  },
  
  color_flash: {
    goalSentence: "Tap when you see YOUR color flash!",
    quickSteps: [
      { icon: 'find', action: "Check your target color at the top" },
      { icon: 'watch', action: "Watch the colors flash" },
      { icon: 'tap', action: "TAP fast when you see YOUR color!" }
    ],
    successCriteria: "React quickly with high accuracy"
  },
  
  eye_relaxation: {
    goalSentence: "Give your eyes a rest—tap to continue between steps!",
    quickSteps: [
      { icon: 'breathe', action: "Follow the visual breathing cues" },
      { icon: 'follow', action: "Watch the animated exercises" },
      { icon: 'tap', action: "Tap Continue when each step ends" }
    ],
    successCriteria: "Complete all relaxation steps"
  },
  
  // Advanced drills
  near_far: {
    goalSentence: "Tap the glowing target—near or far!",
    quickSteps: [
      { icon: 'watch', action: "See which circle is glowing" },
      { icon: 'tap', action: "Tap it when it's clear to you" },
      { icon: 'switch', action: "Eyes jump between near and far" }
    ],
    successCriteria: "Switch focus quickly and accurately"
  },
  
  smooth_pursuit: {
    goalSentence: "Follow the moving dot with your eyes!",
    quickSteps: [
      { icon: 'follow', action: "Keep your eyes on the dot" },
      { icon: 'watch', action: "Move your eyes smoothly, not jumpy" },
      { icon: 'hold', action: "Keep your head still!" }
    ],
    successCriteria: "Track the target smoothly"
  },
  
  whack_a_mole: {
    goalSentence: "Hit the good guys, dodge the bad guys!",
    quickSteps: [
      { icon: 'tap', action: "TAP green circles with ✓" },
      { icon: 'avoid', action: "DON'T tap orange circles with ✗" },
      { icon: 'watch', action: "They disappear fast—be quick!" }
    ],
    successCriteria: "Hit targets with more hits than misses"
  },
  
  meter_timing: {
    goalSentence: "Tap when the bar hits the target zone!",
    quickSteps: [
      { icon: 'watch', action: "Watch the moving bar" },
      { icon: 'tap', action: "TAP when it's in the green zone" },
      { icon: 'hold', action: "Center = PERFECT timing!" }
    ],
    successCriteria: "Hit the zone with good timing"
  },
  
  brock_string: {
    goalSentence: "Focus on one bead at a time!",
    quickSteps: [
      { icon: 'watch', action: "Focus on the glowing bead" },
      { icon: 'follow', action: "Follow the step instructions" },
      { icon: 'hold', action: "See the string make a V or X" }
    ],
    successCriteria: "Complete all focus steps"
  },
  
  stroop_challenge: {
    goalSentence: "Pick the INK COLOR, not the word!",
    quickSteps: [
      { icon: 'watch', action: "Read what the task asks for" },
      { icon: 'find', action: "Look at the word's INK color" },
      { icon: 'tap', action: "Tap the matching color button" }
    ],
    successCriteria: "Answer correctly under interference"
  },
  
  multi_target_track: {
    goalSentence: "Remember the highlighted dots, find them after!",
    quickSteps: [
      { icon: 'watch', action: "Memorize the glowing dots" },
      { icon: 'follow', action: "Track them while they all move" },
      { icon: 'tap', action: "Tap them when movement stops" }
    ],
    successCriteria: "Identify original targets correctly"
  },
  
  // Chaos drills
  rapid_switch: {
    goalSentence: "The task keeps changing—stay sharp!",
    quickSteps: [
      { icon: 'watch', action: "Read what to identify each time" },
      { icon: 'switch', action: "Color? Shape? Count? It changes!" },
      { icon: 'tap', action: "Pick the right answer fast" }
    ],
    successCriteria: "Answer correctly despite task switches"
  },
  
  dual_task_vision: {
    goalSentence: "Watch the middle AND tap the sides!",
    quickSteps: [
      { icon: 'watch', action: "Keep eyes on the center number" },
      { icon: 'tap', action: "Tap targets on the edges" },
      { icon: 'hold', action: "Do BOTH at the same time!" }
    ],
    successCriteria: "Handle both tasks simultaneously"
  },
  
  chaos_grid: {
    goalSentence: "Remember targets through the chaos!",
    quickSteps: [
      { icon: 'find', action: "Memorize where targets appear" },
      { icon: 'hold', action: "Stay focused during the chaos" },
      { icon: 'tap', action: "Find the targets after chaos ends" }
    ],
    successCriteria: "Find targets after visual interference"
  },
};

/**
 * Get simplified instructions for a drill
 */
export function getSimplifiedInstructions(drillId: string): SimplifiedDrillInstruction | null {
  return SIMPLIFIED_INSTRUCTIONS[drillId] || null;
}
