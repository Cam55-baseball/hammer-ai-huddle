export interface SegmentPool {
  id: string;
  sport: string;
  label: string;
  ageRange: { min: number; max: number };
  tiers: string[];
}

export const segmentPools: SegmentPool[] = [
  { id: 'baseball_youth', sport: 'baseball', label: 'Baseball Youth', ageRange: { min: 8, max: 14 }, tiers: ['rec', 'travel'] },
  { id: 'baseball_hs', sport: 'baseball', label: 'Baseball High School', ageRange: { min: 14, max: 19 }, tiers: ['hs_jv', 'hs_varsity', 'travel'] },
  { id: 'baseball_college', sport: 'baseball', label: 'Baseball College', ageRange: { min: 18, max: 24 }, tiers: ['college_d3', 'college_d2', 'college_d1'] },
  { id: 'baseball_pro', sport: 'baseball', label: 'Baseball Professional', ageRange: { min: 18, max: 50 }, tiers: ['indie_pro', 'milb', 'mlb'] },
  { id: 'softball_youth', sport: 'softball', label: 'Softball Youth', ageRange: { min: 8, max: 14 }, tiers: ['rec', 'travel'] },
  { id: 'softball_college', sport: 'softball', label: 'Softball College', ageRange: { min: 14, max: 24 }, tiers: ['hs_jv', 'hs_varsity', 'college_d3', 'college_d2', 'college_d1'] },
  { id: 'softball_ausl', sport: 'softball', label: 'Softball Professional', ageRange: { min: 18, max: 50 }, tiers: ['indie_pro', 'ausl'] },
];

export function getSegmentPool(sport: string, age: number, tier: string): string {
  const pool = segmentPools.find(
    p => p.sport === sport && age >= p.ageRange.min && age <= p.ageRange.max && p.tiers.includes(tier)
  );
  return pool?.id ?? `${sport}_youth`;
}
