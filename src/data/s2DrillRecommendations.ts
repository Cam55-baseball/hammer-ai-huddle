// Maps cognitive limiters to recommended Tex Vision drills

export interface DrillRecommendation {
  drillId: string;
  drillName: string;
  description: string;
  duration: string;
  tier: 'beginner' | 'advanced' | 'chaos';
}

// Drill recommendations based on cognitive area
export const s2DrillRecommendations: Record<string, DrillRecommendation[]> = {
  processing_speed: [
    { drillId: 'pattern-search', drillName: 'Pattern Search', description: 'Find matching patterns quickly', duration: '2-3 min', tier: 'beginner' },
    { drillId: 'whack-a-mole', drillName: 'Whack-a-Mole', description: 'React to targets as they appear', duration: '2-4 min', tier: 'beginner' },
  ],
  decision_efficiency: [
    { drillId: 'whack-a-mole', drillName: 'Whack-a-Mole', description: 'Go/no-go target selection', duration: '2-4 min', tier: 'beginner' },
    { drillId: 'meter-timing', drillName: 'Meter Timing', description: 'Precision timing decisions', duration: '2-3 min', tier: 'advanced' },
  ],
  visual_motor: [
    { drillId: 'follow-the-target', drillName: 'Follow the Target', description: 'Track and tap moving objects', duration: '2-3 min', tier: 'beginner' },
    { drillId: 'near-far-sight', drillName: 'Near-Far Sight', description: 'Depth perception training', duration: '3-4 min', tier: 'advanced' },
  ],
  visual_tracking: [
    { drillId: 'follow-the-target', drillName: 'Follow the Target', description: 'Smooth pursuit eye movements', duration: '2-3 min', tier: 'beginner' },
    { drillId: 'brock-string', drillName: 'Brock String Exercise', description: 'Focus and convergence training', duration: '3-5 min', tier: 'advanced' },
  ],
  peripheral_awareness: [
    { drillId: 'peripheral-vision', drillName: 'Peripheral Vision Drill', description: 'Expand field of view awareness', duration: '2-3 min', tier: 'beginner' },
    { drillId: 'soft-focus', drillName: 'Soft Focus Game', description: 'Wide-gaze awareness training', duration: '2-3 min', tier: 'advanced' },
  ],
  processing_under_load: [
    { drillId: 'pattern-search', drillName: 'Pattern Search (Advanced)', description: 'Complex pattern matching under time pressure', duration: '3-4 min', tier: 'advanced' },
    { drillId: 'whack-a-mole', drillName: 'Whack-a-Mole (Chaos)', description: 'High-speed decision making', duration: '2-4 min', tier: 'chaos' },
  ],
  impulse_control: [
    { drillId: 'soft-focus', drillName: 'Soft Focus Game', description: 'Wait training and patience building', duration: '2-3 min', tier: 'beginner' },
    { drillId: 'meter-timing', drillName: 'Meter Timing', description: 'Precise timing without rushing', duration: '2-3 min', tier: 'advanced' },
  ],
  fatigue_index: [
    { drillId: 'brock-string', drillName: 'Brock String Exercise', description: 'Sustained focus training', duration: '4-6 min', tier: 'advanced' },
    { drillId: 'convergence-divergence', drillName: 'Convergence/Divergence', description: 'Eye muscle endurance', duration: '3-5 min', tier: 'advanced' },
  ],
};

// Get top 3 drill recommendations based on bottom 3 cognitive scores
export const getRecommendedDrills = (scores: Record<string, number>): { area: string; drills: DrillRecommendation[] }[] => {
  // Sort scores ascending to find weakest areas
  const sortedAreas = Object.entries(scores)
    .sort(([, a], [, b]) => a - b)
    .slice(0, 3) // Get bottom 3
    .map(([area]) => area);

  return sortedAreas.map(area => ({
    area,
    drills: s2DrillRecommendations[area] || [],
  }));
};

// Get unique drill list (no duplicates) from recommendations
export const getUniqueDrillList = (scores: Record<string, number>): DrillRecommendation[] => {
  const recommendations = getRecommendedDrills(scores);
  const seen = new Set<string>();
  const uniqueDrills: DrillRecommendation[] = [];

  recommendations.forEach(({ drills }) => {
    drills.forEach(drill => {
      if (!seen.has(drill.drillId)) {
        seen.add(drill.drillId);
        uniqueDrills.push(drill);
      }
    });
  });

  return uniqueDrills.slice(0, 5); // Return max 5 unique drills
};
