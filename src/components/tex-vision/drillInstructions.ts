export interface DrillInstruction {
  objective: string;
  howToPlay: string[];
  tips: string[];
}

export const DRILL_INSTRUCTIONS: Record<string, DrillInstruction> = {
  soft_focus: {
    objective: "Develop calm, wide-angle visual awareness",
    howToPlay: [
      "A dot will appear in the center of the screen",
      "Look at the dot with a relaxed, soft gaze",
      "Without moving your eyes, become aware of the entire screen",
      "Follow the on-screen breathing cues to maintain calm focus"
    ],
    tips: [
      "Imagine looking 'through' the screen rather than at it",
      "If your eyes feel strained, you're focusing too hard"
    ]
  },
  pattern_search: {
    objective: "Quickly identify and select matching shapes in a grid",
    howToPlay: [
      "A target shape will appear at the top of the screen",
      "Scan the grid below to find all matching shapes",
      "Tap each matching shape - it will fade when found",
      "Complete all rounds before time runs out"
    ],
    tips: [
      "Shapes are circles (teal), squares (green), and triangles (amber)",
      "Wrong taps count as mistakes - be accurate, then fast"
    ]
  },
  peripheral_vision: {
    objective: "React to targets without moving your central focus",
    howToPlay: [
      "Keep your eyes fixed on the center dot at all times",
      "Targets will flash on the left, right, top, or bottom",
      "Tap the target using your peripheral vision only",
      "The center dot changes color to show correct (green) or wrong (amber)"
    ],
    tips: [
      "Do not look directly at the targets - trust your peripheral vision",
      "Stay relaxed - tension narrows your field of view"
    ]
  },
  convergence: {
    objective: "Strengthen your eyes' ability to focus at varying distances",
    howToPlay: [
      "A target will move toward and away from you on screen",
      "Track the target smoothly with both eyes",
      "Try to keep the target as a single, clear image",
      "If you see double, blink and refocus"
    ],
    tips: [
      "This exercise mimics tracking a ball approaching you",
      "If you experience discomfort, take a break"
    ]
  },
  near_far: {
    objective: "Train your eyes to shift focus quickly between distances",
    howToPlay: [
      "Two targets will appear at different 'depths' on screen",
      "Focus on one target until it becomes clear",
      "Tap when the target is in sharp focus",
      "Quickly shift to the other target and repeat"
    ],
    tips: [
      "Speed comes with practice - prioritize clear focus first",
      "This mimics looking from your hands to the outfield"
    ]
  },
  smooth_pursuit: {
    objective: "Track a moving target with smooth, continuous eye movement",
    howToPlay: [
      "A target will move across the screen in various patterns",
      "Follow the target smoothly with your eyes only",
      "Keep your head completely still",
      "Try not to lose sight of the target at any point"
    ],
    tips: [
      "Anticipate where the target is heading",
      "If you lose track, quickly reacquire and continue smoothly"
    ]
  },
  whack_a_mole: {
    objective: "Build reaction speed while making go/no-go decisions",
    howToPlay: [
      "Targets will pop up briefly on a grid",
      "TEAL targets with checkmarks: TAP these quickly",
      "AMBER targets with X marks: DO NOT tap these",
      "Targets disappear fast - react quickly but accurately"
    ],
    tips: [
      "Watch the color before reacting - amber is a trap",
      "Missed teal targets and tapped amber targets both hurt your score"
    ]
  },
  meter_timing: {
    objective: "Develop precise timing by hitting a moving target zone",
    howToPlay: [
      "A marker moves back and forth across a horizontal bar",
      "A highlighted zone marks your target area",
      "Tap anywhere on screen when the marker enters the zone",
      "Center of the zone = 'PERFECT', elsewhere in zone = 'Good'"
    ],
    tips: [
      "Find a rhythm - the marker moves at a constant speed",
      "Watch for the thin line in the center for perfect timing"
    ]
  },
  brock_string: {
    objective: "Improve binocular coordination with a guided visualization",
    howToPlay: [
      "This is a guided exercise - follow the on-screen steps",
      "Focus on the highlighted bead (near, mid, or far)",
      "You should see the strings form a V or X pattern",
      "Use the navigation buttons to move between steps if needed"
    ],
    tips: [
      "If you only see one string, one eye may be suppressing",
      "This exercise works best with an actual Brock string for practice"
    ]
  },
  // New drills
  color_flash: {
    objective: "Rapidly recognize and react to a specific target color",
    howToPlay: [
      "A target color is shown at the top of the screen",
      "Colors will flash briefly in the center",
      "Tap anywhere when you see your target color",
      "Avoid tapping on wrong colors - accuracy matters"
    ],
    tips: [
      "Stay focused but relaxed - reaction time improves with calm focus",
      "The target color may change every few seconds"
    ]
  },
  eye_relaxation: {
    objective: "Rest and restore your eyes with guided relaxation exercises",
    howToPlay: [
      "Follow the guided steps: palming, breathing, eye circles, blinking",
      "Each step has a timer - just follow along",
      "For palming, cup your hands gently over closed eyes",
      "End with a final rest period"
    ],
    tips: [
      "This drill is about recovery - no performance pressure",
      "Use this after intense drills or when eyes feel fatigued"
    ]
  },
  stroop_challenge: {
    objective: "Train cognitive flexibility with color-word interference",
    howToPlay: [
      "A color word (e.g., 'RED') will appear in a different ink color",
      "Identify either the INK COLOR or the WORD (instruction shown above)",
      "Tap the correct answer from the four buttons below",
      "The task may switch between color and word identification"
    ],
    tips: [
      "Read the instruction each time - it may change",
      "This trains your brain to filter conflicting information"
    ]
  },
  multi_target_track: {
    objective: "Track multiple moving objects simultaneously",
    howToPlay: [
      "Several targets will be highlighted briefly - memorize them",
      "All dots will start moving and look identical",
      "Track the original targets with your attention only",
      "After movement stops, select the targets you tracked"
    ],
    tips: [
      "Don't try to focus on one target - use peripheral awareness",
      "This drill trains the same skills used in team sports"
    ]
  },
  rapid_switch: {
    objective: "Quickly switch between different visual tasks",
    howToPlay: [
      "A stimulus will appear (color, shape, count, or direction)",
      "The task type is shown above - identify correctly",
      "Tap the correct answer from the options below",
      "Task type changes periodically - stay adaptable"
    ],
    tips: [
      "Read the task instruction before answering",
      "This trains cognitive flexibility and rapid adaptation"
    ]
  },
  dual_task_vision: {
    objective: "Maintain central focus while responding to peripheral events",
    howToPlay: [
      "Numbers will change in the center - try to track the total",
      "Targets will appear in your peripheral vision",
      "Tap peripheral targets WITHOUT looking away from center",
      "Both tasks happen simultaneously"
    ],
    tips: [
      "Keep your gaze locked on the center",
      "Use peripheral vision to detect and tap targets"
    ]
  },
  chaos_grid: {
    objective: "Track targets through visual distractions and chaos",
    howToPlay: [
      "Targets are highlighted briefly - memorize their positions",
      "A chaos phase begins with distracting animations",
      "After chaos, select the cells where targets were",
      "Avoid clicking wrong cells"
    ],
    tips: [
      "During chaos, try to hold the target pattern in your mind",
      "Don't let distractors pull your attention"
    ]
  },
};
