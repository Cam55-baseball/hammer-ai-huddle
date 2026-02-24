export interface FatigueProxy {
  sleepScore: number;
  stressScore: number;
  fatigueLevel: 'low' | 'moderate' | 'high' | 'critical';
  multiplier: number;
}

export function calculateFatigueProxy(sleepQuality: number, stressLevel: number): FatigueProxy {
  // sleepQuality: 1-5 (5 = best), stressLevel: 1-5 (5 = most stressed)
  const sleepScore = (sleepQuality / 5) * 100;
  const stressScore = ((5 - stressLevel) / 5) * 100;
  const composite = (sleepScore * 0.6 + stressScore * 0.4);

  let fatigueLevel: FatigueProxy['fatigueLevel'];
  let multiplier: number;

  if (composite >= 80) { fatigueLevel = 'low'; multiplier = 1.0; }
  else if (composite >= 60) { fatigueLevel = 'moderate'; multiplier = 0.95; }
  else if (composite >= 40) { fatigueLevel = 'high'; multiplier = 0.85; }
  else { fatigueLevel = 'critical'; multiplier = 0.7; }

  return { sleepScore, stressScore, fatigueLevel, multiplier };
}

export const fatigueFlags = {
  inconsistencyThreshold: 20, // Flag if session grade vs fatigue state delta > 20%
  criticalSleepThreshold: 2, // Sleep quality 1-2 triggers flag
  highStressThreshold: 4, // Stress 4-5 triggers flag
};
