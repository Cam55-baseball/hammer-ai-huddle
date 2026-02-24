export const baseballProBaselines = {
  minScoreForProbability: 40,
  maxCappedProbability: 99,
  verifiedOnlyMax: 100,
  proLeagues: ['mlb', 'milb', 'indie_pro'],
  hofMinSeasons: 5,
  hofMinProProbability: 100,
  hofLeagues: ['mlb'],
  tierThresholds: {
    elite: { score: 85, probability: 90 },
    high: { score: 75, probability: 70 },
    above_average: { score: 65, probability: 45 },
    average: { score: 55, probability: 20 },
    developing: { score: 45, probability: 8 },
    entry: { score: 35, probability: 2 },
  },
};
