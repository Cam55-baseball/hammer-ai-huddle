import type { DrillDefinition } from '../baseball/drillDefinitions';

export const softballDrills: DrillDefinition[] = [
  // Pitching (Windmill-specific)
  { id: 'circle_work', name: 'Circle Work', module: 'pitching', description: 'Windmill pitching from the circle/rubber', defaultReps: 30, intensity: 'high', equipmentNeeded: ['softballs', 'pitching rubber'] },
  { id: 'windmill_mechanics', name: 'Windmill Mechanics Breakdown', module: 'pitching', description: '5-phase breakdown: Wind-up, Stride, SFC, Acceleration, Follow-through', defaultReps: 20, intensity: 'medium', equipmentNeeded: ['softballs'] },
  { id: 'riseball_tracking', name: 'Riseball Tracking Drill', module: 'pitching', description: 'Training eye to command the riseball trajectory', defaultReps: 20, intensity: 'high', equipmentNeeded: ['softballs', 'pitching rubber'] },
  { id: 'dropball_location', name: 'Drop Ball Location Work', module: 'pitching', description: 'Command grid work for drop ball placement', defaultReps: 25, intensity: 'medium', equipmentNeeded: ['softballs', 'pitching rubber'] },
  { id: 'snap_angle', name: 'Snap Angle Drill', module: 'pitching', description: 'Wrist snap consistency for windmill delivery', defaultReps: 30, intensity: 'medium', equipmentNeeded: ['softballs'] },
  { id: 'release_point', name: 'Release Point Consistency', module: 'pitching', description: 'Underhand release point repetition training', defaultReps: 25, intensity: 'medium', equipmentNeeded: ['softballs'] },
  { id: 'power_line', name: 'Power Line Drill', module: 'pitching', description: 'Stride alignment specific to softball mechanics', defaultReps: 15, intensity: 'medium', equipmentNeeded: ['softballs', 'tape/chalk'] },
  // Hitting (includes slap)
  { id: 'bp_rounds', name: 'BP Rounds', module: 'hitting', description: 'Standard batting practice rounds', defaultReps: 20, intensity: 'high', equipmentNeeded: ['bat', 'softballs', 'cage/field'] },
  { id: 'tee_work', name: 'Tee Work', module: 'hitting', description: 'Hitting off a batting tee for swing mechanics', defaultReps: 25, intensity: 'medium', equipmentNeeded: ['bat', 'tee', 'softballs'] },
  { id: 'slap_progression', name: 'Slap Hitting Progression', module: 'hitting', description: 'Soft slap, power slap, drag bunt sequence training', defaultReps: 20, intensity: 'medium', equipmentNeeded: ['bat', 'softballs'] },
  { id: 'live_abs', name: 'Live At-Bats', module: 'hitting', description: 'Live at-bats against a pitcher', defaultReps: 10, intensity: 'high', equipmentNeeded: ['bat', 'helmet', 'softballs'] },
  { id: 'reaction_speed', name: 'Reaction Speed Drill', module: 'hitting', description: 'Shorter distance reaction training for faster pitch recognition', defaultReps: 15, intensity: 'high', equipmentNeeded: ['bat', 'softballs'] },
  // Throwing
  { id: 'long_toss', name: 'Long Toss', module: 'throwing', description: 'Progressive distance throwing for arm strength', defaultReps: 20, intensity: 'medium', equipmentNeeded: ['softballs'] },
  { id: 'crow_hop', name: 'Crow Hop Throws', module: 'throwing', description: 'Crow hop throws for outfield strength', defaultReps: 15, intensity: 'high', equipmentNeeded: ['softballs'] },
  // Fielding
  { id: 'ground_ball_work', name: 'Ground Ball Work', module: 'fielding', description: 'Fielding ground balls with proper footwork', defaultReps: 20, intensity: 'medium', equipmentNeeded: ['glove', 'softballs'] },
  { id: 'slapper_defense', name: 'Slapper Defense', module: 'fielding', description: 'Infield defense against slap hitters', defaultReps: 15, intensity: 'high', equipmentNeeded: ['glove', 'softballs'] },
  // Baserunning
  { id: 'home_to_home', name: 'Home-to-Home', module: 'baserunning', description: 'Full circuit baserunning (60ft bases)', defaultReps: 3, intensity: 'high', equipmentNeeded: ['bases'] },
  { id: 'home_to_first', name: 'Home-to-1st', module: 'baserunning', description: 'Timed sprint to first base', defaultReps: 5, intensity: 'high', equipmentNeeded: ['bases', 'stopwatch'] },
];
