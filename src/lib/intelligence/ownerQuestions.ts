/** Questions use the existing principle situation as their durable identity. */
export interface OwnerQuestion {
  id: string;
  sport: 'baseball' | 'softball';
  subscription: string;
  area: string;
  question: string;
  options: readonly string[];
}

export const OWNER_QUESTIONS: readonly OwnerQuestion[] = (['baseball', 'softball'] as const).flatMap(sport =>
  ['Complete Pitcher', '5Tool', 'Golden 2Way'].map(subscription => ({
    id: `full-go:${sport}:${subscription}`,
    sport, subscription, area: 'mechanics',
    question: `For ${sport} ${subscription}, how should full-go work differ for ages 13–15, 16–17 and adults, within the existing pain, equipment, rest and game-day rules?`,
    options: [
      'Keep the existing legal dose; make intent and execution clearer.',
      'Use the same legal dose with age-specific coaching cues.',
      'Needs more review; do not change the current plan.',
    ],
  })));

export const questionSituation = (id: string) => `Owner question: ${id}`;