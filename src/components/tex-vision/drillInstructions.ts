export interface DrillInstruction {
  objective: string;
  howToPlay: string[];
  tips?: string[];
}

export const DRILL_INSTRUCTIONS: Record<string, DrillInstruction> = {
  soft_focus: {
    objective: "Develop calm visual awareness",
    howToPlay: [
      "Focus softly on the center dot",
      "Expand awareness to see the whole screen",
      "Follow the breathing cues"
    ],
    tips: ["Keep your gaze relaxed, don't stare intensely"]
  },
  pattern_search: {
    objective: "Find all matching shapes quickly",
    howToPlay: [
      "Look at the target shape shown at the top",
      "Tap/click all shapes that match the target",
      "Avoid clicking wrong shapes (counts as mistakes)"
    ],
    tips: ["Scan the grid systematically for best results"]
  },
  peripheral_vision: {
    objective: "Expand your peripheral awareness",
    howToPlay: [
      "Keep your eyes on the center dot",
      "Notice targets appearing in your peripheral vision",
      "Tap targets without moving your gaze from center"
    ],
    tips: ["Trust your peripheral vision"]
  },
  convergence: {
    objective: "Improve eye convergence and divergence",
    howToPlay: [
      "Focus on the moving target",
      "Track it as it moves toward and away from you",
      "Maintain clear, single vision of the target"
    ],
    tips: ["Blink naturally to prevent eye strain"]
  },
  near_far: {
    objective: "Train rapid focus shifts between distances",
    howToPlay: [
      "Alternate focus between near and far targets",
      "Tap when each target comes into clear focus",
      "Work on speed while maintaining accuracy"
    ],
    tips: ["Take your time to achieve clear focus"]
  },
  smooth_pursuit: {
    objective: "Track moving objects smoothly",
    howToPlay: [
      "Follow the target with your eyes",
      "Keep your head still",
      "Maintain smooth, continuous tracking"
    ],
    tips: ["Anticipate where the target is going"]
  },
  whack_a_mole: {
    objective: "Improve reaction time and decision speed",
    howToPlay: [
      "Targets will appear briefly on screen",
      "Tap/click targets as fast as possible",
      "Avoid tapping empty spaces"
    ],
    tips: ["Stay focused on the full area, not just one spot"]
  },
  meter_timing: {
    objective: "Develop precise timing and rhythm",
    howToPlay: [
      "Watch the timing meter fill up",
      "Tap when the meter reaches the target zone",
      "Aim for consistent timing accuracy"
    ],
    tips: ["Find a rhythm and stick to it"]
  },
  brock_string: {
    objective: "Strengthen binocular vision coordination",
    howToPlay: [
      "Focus on each bead in sequence",
      "Observe the string pattern (should form X)",
      "Shift focus smoothly between beads"
    ],
    tips: ["Both eyes must work together for proper X pattern"]
  },
};
