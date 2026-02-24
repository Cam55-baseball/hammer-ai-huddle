export interface OutcomeTag {
  id: string;
  label: string;
  category: 'positive' | 'neutral' | 'negative';
  color: string;
}

export const baseballHittingOutcomes: OutcomeTag[] = [
  { id: 'barrel', label: 'Barrel', category: 'positive', color: 'green' },
  { id: 'hard_hit', label: 'Hard Hit', category: 'positive', color: 'green' },
  { id: 'line_drive', label: 'Line Drive', category: 'positive', color: 'green' },
  { id: 'ground_ball', label: 'Ground Ball', category: 'neutral', color: 'yellow' },
  { id: 'fly_ball', label: 'Fly Ball', category: 'neutral', color: 'yellow' },
  { id: 'pop_up', label: 'Pop Up', category: 'negative', color: 'red' },
  { id: 'foul', label: 'Foul', category: 'neutral', color: 'yellow' },
  { id: 'swing_miss', label: 'Swing & Miss', category: 'negative', color: 'red' },
  { id: 'take_ball', label: 'Take (Ball)', category: 'positive', color: 'green' },
  { id: 'take_strike', label: 'Take (Strike)', category: 'negative', color: 'red' },
  { id: 'hbp', label: 'HBP', category: 'neutral', color: 'yellow' },
];

export const baseballPitchingOutcomes: OutcomeTag[] = [
  { id: 'called_strike', label: 'Called Strike', category: 'positive', color: 'green' },
  { id: 'swinging_strike', label: 'Swinging Strike', category: 'positive', color: 'green' },
  { id: 'ball', label: 'Ball', category: 'negative', color: 'red' },
  { id: 'foul', label: 'Foul', category: 'neutral', color: 'yellow' },
  { id: 'in_play_out', label: 'In Play (Out)', category: 'positive', color: 'green' },
  { id: 'in_play_hit', label: 'In Play (Hit)', category: 'negative', color: 'red' },
  { id: 'hbp', label: 'HBP', category: 'negative', color: 'red' },
  { id: 'wild_pitch', label: 'Wild Pitch', category: 'negative', color: 'red' },
];
