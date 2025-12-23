// Baseball-specific translations for S2 Cognition Diagnostic scores
// Each cognitive area has context for low and high scores

export interface BaseballTranslation {
  area: string;
  lowScoreMessage: string;
  highScoreMessage: string;
  strengthDescription: string;
  limiterDescription: string;
}

export const s2BaseballTranslations: Record<string, BaseballTranslation> = {
  processing_speed: {
    area: 'Processing Speed',
    lowScoreMessage: 'You may struggle to identify pitch type early out of the hand. Recognizing spin and trajectory takes longer, which can reduce your reaction window.',
    highScoreMessage: 'You read pitches quickly out of the hand. Fast pattern recognition gives you more time to make swing decisions.',
    strengthDescription: 'Quick pattern recognition and early pitch identification',
    limiterDescription: 'Work on recognizing pitch types earlier in flight path',
  },
  decision_efficiency: {
    area: 'Decision Efficiency',
    lowScoreMessage: 'Split-second decisions may take extra time. In high-pressure at-bats or defensive plays, this delay can affect outcomes.',
    highScoreMessage: 'You make quick, accurate reads on plays. Your decision-making is sharp when it counts.',
    strengthDescription: 'Fast, accurate choices under pressure',
    limiterDescription: 'Practice faster go/no-go decisions in game situations',
  },
  visual_motor: {
    area: 'Visual-Motor Integration',
    lowScoreMessage: 'Translating what you see into physical action may have slight delays. This affects timing on swings and fielding reactions.',
    highScoreMessage: 'Your eyes and hands work in sync. You execute physical responses to visual cues smoothly.',
    strengthDescription: 'Seamless eye-to-hand coordination',
    limiterDescription: 'Focus on hand-eye reaction drills',
  },
  visual_tracking: {
    area: 'Visual Tracking',
    lowScoreMessage: 'You may occasionally lose sight of the ball through the zone. Breaking pitches and fast-moving plays can be harder to follow.',
    highScoreMessage: 'You track ball flight smoothly from release point through contact zone. You see the ball well.',
    strengthDescription: 'Smooth pursuit tracking through the zone',
    limiterDescription: 'Practice tracking objects through their full path',
  },
  peripheral_awareness: {
    area: 'Peripheral Awareness',
    lowScoreMessage: 'You may miss baserunner movement or defensive shifts while focused on the ball. Field awareness can improve.',
    highScoreMessage: 'You see the whole field while staying focused on the ball. Runner movement and defensive positioning register naturally.',
    strengthDescription: 'Excellent field vision and situational awareness',
    limiterDescription: 'Expand awareness of action outside your focal point',
  },
  processing_under_load: {
    area: 'Processing Under Load',
    lowScoreMessage: 'Complex game situations may slow your thinking. When multiple factors compete for attention, processing efficiency drops.',
    highScoreMessage: 'You perform well under complex game situations. Multi-factor decisions don\'t faze you.',
    strengthDescription: 'Maintains processing speed under pressure',
    limiterDescription: 'Build mental stamina for high-complexity situations',
  },
  impulse_control: {
    area: 'Impulse Control',
    lowScoreMessage: 'You may chase borderline pitches, especially with two strikes. Defensive fakes may occasionally catch you reacting too early.',
    highScoreMessage: 'Excellent plate discipline. You wait for your pitch and don\'t bite on fakes or borderline offerings.',
    strengthDescription: 'Outstanding plate discipline and patience',
    limiterDescription: 'Work on waiting and not chasing',
  },
  fatigue_index: {
    area: 'Fatigue Index',
    lowScoreMessage: 'Your focus may drop in late innings or during long at-bats. Mental endurance could use strengthening.',
    highScoreMessage: 'You maintain sharpness throughout the game. Late-game focus stays consistent with early-game performance.',
    strengthDescription: 'Consistent mental stamina throughout competition',
    limiterDescription: 'Build mental endurance for sustained focus',
  },
};

// Score thresholds for athletic labels
export const scoreLabels = {
  elite: { min: 85, max: 100, label: 'Elite', color: 'text-amber-700', bgColor: 'bg-amber-100', borderColor: 'border-amber-400' },
  advanced: { min: 70, max: 84, label: 'Advanced', color: 'text-emerald-700', bgColor: 'bg-emerald-100', borderColor: 'border-emerald-400' },
  developing: { min: 55, max: 69, label: 'Developing', color: 'text-teal-700', bgColor: 'bg-teal-100', borderColor: 'border-teal-400' },
  foundational: { min: 0, max: 54, label: 'Foundational', color: 'text-slate-700', bgColor: 'bg-slate-100', borderColor: 'border-slate-400' },
};

export const getScoreLabel = (score: number) => {
  if (score >= scoreLabels.elite.min) return scoreLabels.elite;
  if (score >= scoreLabels.advanced.min) return scoreLabels.advanced;
  if (score >= scoreLabels.developing.min) return scoreLabels.developing;
  return scoreLabels.foundational;
};

export const getBaseballTranslation = (area: string, score: number): string => {
  const translation = s2BaseballTranslations[area];
  if (!translation) return '';
  return score >= 70 ? translation.highScoreMessage : translation.lowScoreMessage;
};
