export interface ReflectionQuestion {
  id: string;
  type: 'rating' | 'choice' | 'text';
  question: string;
  options?: string[];
  ratingLabels?: { low: string; high: string };
}

export const DRILL_REFLECTIONS: Record<string, ReflectionQuestion[]> = {
  soft_focus: [
    {
      id: 'awareness_level',
      type: 'rating',
      question: 'How expanded did your peripheral awareness feel?',
      ratingLabels: { low: 'Narrow', high: 'Very Wide' },
    },
    {
      id: 'peripheral_notice',
      type: 'choice',
      question: 'What did you notice in your peripheral vision?',
      options: ['Colors shifting', 'Subtle movement', 'Shapes softening', 'Nothing specific'],
    },
    {
      id: 'relaxation_level',
      type: 'rating',
      question: 'How relaxed did your eyes feel?',
      ratingLabels: { low: 'Tense', high: 'Very Relaxed' },
    },
  ],
  brock_string: [
    {
      id: 'double_vision',
      type: 'choice',
      question: 'Did you experience any double vision?',
      options: ['Not at all', 'Briefly', 'Throughout', 'Unsure'],
    },
    {
      id: 'string_pattern',
      type: 'choice',
      question: 'What pattern did the strings form?',
      options: ['V shape (converging)', 'X shape (crossing)', 'One string only', 'Unclear'],
    },
    {
      id: 'focus_difficulty',
      type: 'rating',
      question: 'How difficult was it to maintain focus on each bead?',
      ratingLabels: { low: 'Very Easy', high: 'Very Difficult' },
    },
  ],
  convergence: [
    {
      id: 'eye_strain',
      type: 'rating',
      question: 'Did you experience any eye strain?',
      ratingLabels: { low: 'None', high: 'Significant' },
    },
    {
      id: 'focus_clarity',
      type: 'choice',
      question: 'Could you keep the target as a single image?',
      options: ['Yes, the whole time', 'Mostly', 'Sometimes saw double', 'Often saw double'],
    },
  ],
  eye_relaxation: [
    {
      id: 'relaxation_depth',
      type: 'rating',
      question: 'How deep was your relaxation?',
      ratingLabels: { low: 'Shallow', high: 'Very Deep' },
    },
    {
      id: 'visual_rest',
      type: 'choice',
      question: 'Do your eyes feel rested now?',
      options: ['Very rested', 'Somewhat rested', 'About the same', 'More tired'],
    },
  ],
  near_far: [
    {
      id: 'switch_speed',
      type: 'rating',
      question: 'How quickly could you shift focus between distances?',
      ratingLabels: { low: 'Slow', high: 'Very Fast' },
    },
    {
      id: 'clarity_consistency',
      type: 'choice',
      question: 'Was the clarity consistent at both distances?',
      options: ['Yes, equally clear', 'Near was clearer', 'Far was clearer', 'Both were blurry'],
    },
  ],
};
