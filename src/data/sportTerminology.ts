// Master Sport Terminology Dictionary
// Maps every UI-facing term to its sport-appropriate version

export type SportKey = 'baseball' | 'softball';

export interface TerminologyDictionary {
  pitchTypes: Record<string, string>;
  sessionTypes: Record<string, string>;
  metrics: Record<string, string>;
  positions: Record<string, string>;
  drillNames: Record<string, string>;
  heatMapLabels: Record<string, string>;
  speedDistances: Record<string, string>;
  fieldingTerms: Record<string, string>;
}

export const sportTerminology: Record<SportKey, TerminologyDictionary> = {
  baseball: {
    pitchTypes: {
      fastball: '4-Seam Fastball',
      secondary_fastball: '2-Seam Fastball',
      breaking: 'Slider',
      offspeed: 'Changeup',
      curve: 'Curveball',
    },
    sessionTypes: {
      bullpen: 'Bullpen Session',
      practice: 'Batting Practice',
      scrimmage: 'Live Scrimmage',
      warmup: 'Long Toss',
      cage: 'Cage Work',
    },
    metrics: {
      spinEfficiency: 'Spin Efficiency',
      barrelPct: 'Barrel %',
      commandPct: 'Command %',
      chaseRate: 'Chase Rate',
      whiffRate: 'Whiff Rate',
      exitVelo: 'Exit Velocity',
      launchAngle: 'Launch Angle',
    },
    positions: {
      pitcher: 'Pitcher',
      catcher: 'Catcher',
      shortstop: 'Shortstop',
    },
    drillNames: {
      moundWork: 'Mound Work',
      longToss: 'Long Toss',
      bp: 'BP Rounds',
      teeWork: 'Tee Work',
    },
    heatMapLabels: {
      pitchLocation: 'Pitch Location',
      swingChase: 'Chase Zone Map',
      barrelZone: 'Barrel Zone',
      pitchCommand: 'Command Map',
      missCluster: 'Miss Cluster',
    },
    speedDistances: {
      primarySprint: '60-Yard Dash',
      baseDistance: '90 ft',
    },
    fieldingTerms: {
      pitcher: 'Pitcher',
      groundBallWork: 'Ground Ball Work',
    },
  },
  softball: {
    pitchTypes: {
      fastball: 'Fastball (Windmill)',
      secondary_fastball: 'Circle Change',
      breaking: 'Riseball',
      offspeed: 'Drop Ball',
      curve: 'Curveball (12-6 Drop)',
    },
    sessionTypes: {
      bullpen: 'Circle Session',
      practice: 'Batting Practice',
      scrimmage: 'Live Scrimmage',
      warmup: 'Long Toss',
      cage: 'Cage Work',
    },
    metrics: {
      spinEfficiency: 'Snap Tightness',
      barrelPct: 'Sweet Spot %',
      commandPct: 'Location %',
      chaseRate: 'Chase Rate',
      whiffRate: 'Whiff Rate',
      exitVelo: 'Exit Velocity',
      launchAngle: 'Launch Angle',
      riseballMovement: 'Riseball Movement Index',
      dropBallDepth: 'Drop Ball Depth',
      releaseHeightVar: 'Release Height Variance',
      snapAngle: 'Snap Angle Consistency',
      slapExecution: 'Slap Hit Execution %',
      reactionSpeed: 'Reaction Speed Differential',
    },
    positions: {
      pitcher: 'Pitcher / Circle Player',
      catcher: 'Catcher',
      shortstop: 'Shortstop',
    },
    drillNames: {
      moundWork: 'Circle Work',
      longToss: 'Long Toss',
      bp: 'BP Rounds',
      teeWork: 'Tee Work',
    },
    heatMapLabels: {
      pitchLocation: 'Pitch Location',
      swingChase: 'Chase Zone Map',
      barrelZone: 'Sweet Spot Zone',
      pitchCommand: 'Location Map',
      missCluster: 'Miss Pattern',
    },
    speedDistances: {
      primarySprint: 'Home-to-Home',
      baseDistance: '60 ft',
    },
    fieldingTerms: {
      pitcher: 'Circle Player',
      groundBallWork: 'Ground Ball Work',
    },
  },
};

export function getTerm(sport: SportKey, category: keyof TerminologyDictionary, key: string): string {
  return sportTerminology[sport]?.[category]?.[key] ?? key;
}
