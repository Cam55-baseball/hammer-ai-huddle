export interface DrillDefinition {
  id: string;
  name: string;
  module: string;
  description: string;
  defaultReps: number;
  intensity: 'low' | 'medium' | 'high';
  equipmentNeeded: string[];
}

export const baseballDrills: DrillDefinition[] = [
  // Pitching
  { id: 'mound_work', name: 'Mound Work', module: 'pitching', description: 'Full windup and stretch pitching from the mound', defaultReps: 30, intensity: 'high', equipmentNeeded: ['baseballs', 'mound'] },
  { id: 'long_toss', name: 'Long Toss', module: 'throwing', description: 'Progressive distance throwing (150-200ft range)', defaultReps: 20, intensity: 'medium', equipmentNeeded: ['baseballs'] },
  { id: 'crow_hop', name: 'Crow Hop Throws', module: 'throwing', description: 'Overhand crow hop throws for arm strength', defaultReps: 15, intensity: 'high', equipmentNeeded: ['baseballs'] },
  { id: 'plyocare', name: 'PlyoCare Protocol', module: 'throwing', description: 'Weighted ball arm care and velocity program', defaultReps: 20, intensity: 'medium', equipmentNeeded: ['plyo balls'] },
  { id: 'pitch_tunneling', name: 'Pitch Tunneling Drill', module: 'pitching', description: 'Sequencing pitches through the same tunnel point', defaultReps: 25, intensity: 'high', equipmentNeeded: ['baseballs', 'mound'] },
  { id: 'velocity_day', name: 'Velocity Day', module: 'pitching', description: 'Max intent fastball sessions with gun readings', defaultReps: 15, intensity: 'high', equipmentNeeded: ['baseballs', 'mound', 'radar gun'] },
  // Hitting
  { id: 'bp_rounds', name: 'BP Rounds', module: 'hitting', description: 'Standard batting practice rounds', defaultReps: 20, intensity: 'high', equipmentNeeded: ['bat', 'baseballs', 'cage/field'] },
  { id: 'tee_work', name: 'Tee Work', module: 'hitting', description: 'Hitting off a batting tee for swing mechanics', defaultReps: 25, intensity: 'medium', equipmentNeeded: ['bat', 'tee', 'baseballs'] },
  { id: 'live_abs', name: 'Live At-Bats', module: 'hitting', description: 'Live at-bats against a pitcher', defaultReps: 10, intensity: 'high', equipmentNeeded: ['bat', 'helmet', 'baseballs'] },
  { id: 'soft_toss', name: 'Soft Toss', module: 'hitting', description: 'Front or side toss for timing and bat path', defaultReps: 25, intensity: 'medium', equipmentNeeded: ['bat', 'baseballs'] },
  // Fielding
  { id: 'ground_ball_work', name: 'Ground Ball Work', module: 'fielding', description: 'Fielding ground balls with proper footwork', defaultReps: 20, intensity: 'medium', equipmentNeeded: ['glove', 'baseballs'] },
  { id: 'fly_ball_reads', name: 'Fly Ball Reads', module: 'fielding', description: 'Reading fly balls off the bat for routes', defaultReps: 15, intensity: 'medium', equipmentNeeded: ['glove', 'baseballs'] },
  { id: 'double_play_turns', name: 'Double Play Turns', module: 'fielding', description: 'Middle infield double play pivot and feed', defaultReps: 15, intensity: 'high', equipmentNeeded: ['glove', 'baseballs'] },
  // Baserunning
  { id: 'sixty_yard', name: '60-Yard Dash', module: 'baserunning', description: 'Timed 60-yard dash for speed evaluation', defaultReps: 3, intensity: 'high', equipmentNeeded: ['stopwatch'] },
  { id: 'lead_off_drill', name: 'Lead-Off Drill', module: 'baserunning', description: 'Primary and secondary lead-off technique', defaultReps: 10, intensity: 'medium', equipmentNeeded: ['bases'] },
  { id: 'first_to_third', name: 'First-to-Third', module: 'baserunning', description: 'Baserunning from first to third on a single', defaultReps: 5, intensity: 'high', equipmentNeeded: ['bases'] },
];
