import type { HittingPhaseId } from '../../lib/hittingPhases';

export interface DrillDefinition {
  id: string;
  name: string;
  module: string;
  description: string;
  defaultReps: number;
  intensity: 'low' | 'medium' | 'high';
  equipmentNeeded: string[];
  /** Hitting 1-2-3-4 phases this drill trains. Only applies to module === 'hitting'. */
  phasesTrained?: HittingPhaseId[];
  /** What cause this drill removes (cause→effect coaching). Hitting only. */
  fixesCause?: string;
  /** What on-field effect/result this drill eliminates. Hitting only. */
  eliminatesEffect?: string;
  /** Slot in the 4-step roadmap ladder for this phase. Hitting only. */
  roadmapStep?: 'feel' | 'iso' | 'constraint' | 'transfer';
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
  { id: 'bp_rounds', name: 'BP Rounds (Live)', module: 'hitting', description: 'Standard batting practice — overhand live pitching', defaultReps: 20, intensity: 'high', equipmentNeeded: ['bat', 'baseballs', 'cage/field'], phasesTrained: ['P1', 'P2', 'P3', 'P4'], roadmapStep: 'transfer', fixesCause: 'sequence breakdown under live timing', eliminatesEffect: 'late swings, weak contact in games' },
  { id: 'machine_bp', name: 'Machine BP', module: 'hitting', description: 'Batting practice off pitching machine', defaultReps: 25, intensity: 'high', equipmentNeeded: ['bat', 'baseballs', 'machine'], phasesTrained: ['P3', 'P4'], roadmapStep: 'transfer', fixesCause: 'losing landing or elbow-first sequence at velocity', eliminatesEffect: 'late on velocity, jammed contact' },
  { id: 'front_toss', name: 'Front Toss', module: 'hitting', description: 'Underhand front toss for timing and load', defaultReps: 25, intensity: 'medium', equipmentNeeded: ['bat', 'baseballs', 'L-screen'], phasesTrained: ['P1', 'P2', 'P3'], roadmapStep: 'constraint', fixesCause: 'leaking chest open before contact', eliminatesEffect: 'pull-off, weak oppo flares' },
  { id: 'flip_drill', name: 'Flips / Short Toss', module: 'hitting', description: 'Side flips for inside/outside pitch work', defaultReps: 25, intensity: 'medium', equipmentNeeded: ['bat', 'baseballs'], phasesTrained: ['P4'], roadmapStep: 'transfer', fixesCause: 'hands firing before elbow drives', eliminatesEffect: 'rollover, swing-and-miss away' },
  { id: 'tee_work', name: 'Tee Work', module: 'hitting', description: 'Hitting off a batting tee for swing mechanics', defaultReps: 25, intensity: 'medium', equipmentNeeded: ['bat', 'tee', 'baseballs'], phasesTrained: ['P1', 'P2', 'P4'], roadmapStep: 'iso', fixesCause: 'broken sequence with no timing pressure', eliminatesEffect: 'inconsistent contact quality' },
  { id: 'live_abs', name: 'Live At-Bats', module: 'hitting', description: 'Live at-bats against a pitcher (game intent)', defaultReps: 10, intensity: 'high', equipmentNeeded: ['bat', 'helmet', 'baseballs'], phasesTrained: ['P1', 'P2', 'P3', 'P4'], roadmapStep: 'transfer', fixesCause: 'sequence collapse under competitive stress', eliminatesEffect: 'process breaking down in games' },
  { id: 'soft_toss', name: 'Soft Toss', module: 'hitting', description: 'Front or side toss for timing and bat path', defaultReps: 25, intensity: 'medium', equipmentNeeded: ['bat', 'baseballs'], phasesTrained: ['P2', 'P4'], roadmapStep: 'constraint', fixesCause: 'hands drifting forward with body', eliminatesEffect: 'no bat-head depth, casting' },
  // Hitting 1-2-3-4 phase-isolation drills
  { id: 'hip_load_iso', name: 'Hip Load Isolation', module: 'hitting', description: 'P1: Slow back-hip load only, hands frozen — feel balanced loaded back hip before any hand movement. Mirror or video.', defaultReps: 15, intensity: 'low', equipmentNeeded: ['bat', 'mirror or phone'], phasesTrained: ['P1'], roadmapStep: 'feel', fixesCause: 'hands loading before back hip', eliminatesEffect: 'no separation, weak contact, late swings' },
  { id: 'load_sequence_pause', name: 'Load Sequence Pause', module: 'hitting', description: 'P1→P2: Hip load → 1-count freeze → hand load. Locks correct order so hands never fire before hips.', defaultReps: 15, intensity: 'low', equipmentNeeded: ['bat'], phasesTrained: ['P1', 'P2'], roadmapStep: 'constraint', fixesCause: 'hands and hips firing in wrong order', eliminatesEffect: 'rushed swing, no torque storage' },
  { id: 'sideways_landing_check', name: 'Sideways Landing Check', module: 'hitting', description: 'P3: Stride and freeze at landing — chest + shoulders square to plate, body sideways, both feet down. Photograph or video.', defaultReps: 12, intensity: 'low', equipmentNeeded: ['bat', 'phone'], phasesTrained: ['P3'], roadmapStep: 'iso', fixesCause: 'landing open instead of sideways', eliminatesEffect: "can't reach outside pitch, jammed inside" },
  { id: 'elbow_first_fulcrum', name: 'Elbow-First Fulcrum', module: 'hitting', description: 'P4: Knob acts as fulcrum — drive back elbow forward FIRST while hands stay back. Tee or front toss. Hands must trail elbow.', defaultReps: 20, intensity: 'medium', equipmentNeeded: ['bat', 'tee', 'baseballs'], phasesTrained: ['P4'], roadmapStep: 'feel', fixesCause: 'hands leading the back elbow', eliminatesEffect: 'casting, early barrel flip, rollover' },
  { id: 'catch_the_ball', name: 'Catch The Ball', module: 'hitting', description: 'P4: Soft toss focus — line your hands up with the ball and try to "catch it" with your hands. Extension comes after contact.', defaultReps: 20, intensity: 'medium', equipmentNeeded: ['bat', 'baseballs'], phasesTrained: ['P4'], roadmapStep: 'constraint', fixesCause: 'reaching/casting at the ball', eliminatesEffect: 'rollover, weak pop-up oppo' },
  { id: 'no_stride_power', name: 'No-Stride Power', module: 'hitting', description: 'P1: Stanceless reps — prove that hip load alone produces power. Removes stride variable to expose true hip-load quality.', defaultReps: 15, intensity: 'medium', equipmentNeeded: ['bat', 'tee', 'baseballs'], phasesTrained: ['P1'], roadmapStep: 'iso', fixesCause: 'relying on stride for power instead of hip load', eliminatesEffect: 'low exit velo, weak contact' },
  // Fielding
  { id: 'ground_ball_work', name: 'Ground Ball Work', module: 'fielding', description: 'Fielding ground balls with proper footwork', defaultReps: 20, intensity: 'medium', equipmentNeeded: ['glove', 'baseballs'] },
  { id: 'fly_ball_reads', name: 'Fly Ball Reads', module: 'fielding', description: 'Reading fly balls off the bat for routes', defaultReps: 15, intensity: 'medium', equipmentNeeded: ['glove', 'baseballs'] },
  { id: 'double_play_turns', name: 'Double Play Turns', module: 'fielding', description: 'Middle infield double play pivot and feed', defaultReps: 15, intensity: 'high', equipmentNeeded: ['glove', 'baseballs'] },
  // Baserunning
  { id: 'sixty_yard', name: '60-Yard Dash', module: 'baserunning', description: 'Timed 60-yard dash for speed evaluation', defaultReps: 3, intensity: 'high', equipmentNeeded: ['stopwatch'] },
  { id: 'lead_off_drill', name: 'Lead-Off Drill', module: 'baserunning', description: 'Primary and secondary lead-off technique', defaultReps: 10, intensity: 'medium', equipmentNeeded: ['bases'] },
  { id: 'first_to_third', name: 'First-to-Third', module: 'baserunning', description: 'Baserunning from first to third on a single', defaultReps: 5, intensity: 'high', equipmentNeeded: ['bases'] },
];
