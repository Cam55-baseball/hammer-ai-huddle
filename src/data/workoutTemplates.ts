import { Exercise } from '@/types/customActivity';

export interface WorkoutTemplate {
  id: string;
  name: string;
  description: string;
  category: 'off-season' | 'in-season' | 'arm-care' | 'specialty';
  focus: string;
  duration: number; // in minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  sport: 'baseball' | 'softball' | 'both';
  exercises: Exercise[];
  tags: string[];
}

export const WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  // OFF-SEASON PROGRAMS
  {
    id: 'off-season-base-building',
    name: 'Off-Season Base Building',
    description: 'Foundation strength program to build a solid base for the upcoming season',
    category: 'off-season',
    focus: 'Full Body Strength',
    duration: 60,
    difficulty: 'intermediate',
    sport: 'both',
    tags: ['strength', 'foundation', 'full-body'],
    exercises: [
      { id: 'tpl-squats', name: 'Squats', type: 'strength', sets: 4, reps: 8, rest: 120 },
      { id: 'tpl-rdl', name: 'Romanian Deadlifts', type: 'strength', sets: 3, reps: 10, rest: 90 },
      { id: 'tpl-bench', name: 'Bench Press', type: 'strength', sets: 3, reps: 10, rest: 90 },
      { id: 'tpl-rows', name: 'Barbell Rows', type: 'strength', sets: 3, reps: 10, rest: 90 },
      { id: 'tpl-lunges', name: 'Lunges', type: 'strength', sets: 3, reps: 12, rest: 60 },
      { id: 'tpl-pallof', name: 'Pallof Press', type: 'core', sets: 3, reps: 10, rest: 45 },
    ],
  },
  {
    id: 'power-development',
    name: 'Power Development Phase',
    description: 'Build explosive power for hitting and throwing with plyometric emphasis',
    category: 'off-season',
    focus: 'Explosive Power',
    duration: 55,
    difficulty: 'advanced',
    sport: 'both',
    tags: ['power', 'plyometric', 'explosive'],
    exercises: [
      { id: 'tpl-box-jumps', name: 'Box Jumps', type: 'plyometric', sets: 4, reps: 6, rest: 90 },
      { id: 'tpl-med-ball-throws', name: 'Med Ball Rotational Throws', type: 'baseball', sets: 3, reps: 8, rest: 60 },
      { id: 'tpl-trap-bar', name: 'Trap Bar Deadlifts', type: 'strength', sets: 4, reps: 5, rest: 120 },
      { id: 'tpl-broad-jumps', name: 'Broad Jumps', type: 'plyometric', sets: 3, reps: 6, rest: 60 },
      { id: 'tpl-hip-thrusts', name: 'Hip Thrusts', type: 'strength', sets: 3, reps: 10, rest: 90 },
      { id: 'tpl-cable-woodchops', name: 'Cable Woodchops', type: 'core', sets: 3, reps: 12, rest: 45 },
    ],
  },
  {
    id: 'velocity-builder',
    name: 'Velocity Builder (Pitcher)',
    description: 'Targeted program for pitchers focusing on rotational power and arm strength',
    category: 'off-season',
    focus: 'Pitching Velocity',
    duration: 50,
    difficulty: 'advanced',
    sport: 'both',
    tags: ['pitching', 'velocity', 'arm-strength'],
    exercises: [
      { id: 'tpl-med-ball-slams', name: 'Rotational Med Ball Slams', type: 'plyometric', sets: 4, reps: 8, rest: 60 },
      { id: 'tpl-hip-rotation', name: 'Hip Rotation Drills', type: 'baseball', sets: 3, reps: 12, rest: 45 },
      { id: 'tpl-single-leg-rdl', name: 'Single-Leg RDL', type: 'strength', sets: 3, reps: 8, rest: 60 },
      { id: 'tpl-cable-anti-rot', name: 'Anti-Rotation Press', type: 'core', sets: 3, reps: 10, rest: 45 },
      { id: 'tpl-lateral-lunges', name: 'Lateral Lunges', type: 'strength', sets: 3, reps: 10, rest: 60 },
      { id: 'tpl-band-external', name: 'External Rotation (J-Band)', type: 'baseball', sets: 3, reps: 15, rest: 30 },
    ],
  },

  // IN-SEASON PROGRAMS
  {
    id: 'in-season-maintenance',
    name: 'In-Season Maintenance',
    description: 'Lighter loads to maintain strength while managing in-season fatigue',
    category: 'in-season',
    focus: 'Maintenance',
    duration: 35,
    difficulty: 'intermediate',
    sport: 'both',
    tags: ['maintenance', 'recovery', 'in-season'],
    exercises: [
      { id: 'tpl-goblet-squats', name: 'Goblet Squats', type: 'strength', sets: 3, reps: 8, rest: 60 },
      { id: 'tpl-db-rows', name: 'Dumbbell Rows', type: 'strength', sets: 2, reps: 10, rest: 45 },
      { id: 'tpl-push-ups', name: 'Push-Ups', type: 'strength', sets: 2, reps: 15, rest: 45 },
      { id: 'tpl-plank', name: 'Plank', type: 'core', duration: 45, rest: 30 },
      { id: 'tpl-band-pulls', name: 'Band Pull-Aparts', type: 'baseball', sets: 2, reps: 15, rest: 30 },
    ],
  },
  {
    id: 'game-day-prep',
    name: 'Game Day Prep',
    description: 'Pre-game activation routine to get your body ready for competition',
    category: 'in-season',
    focus: 'Activation',
    duration: 20,
    difficulty: 'beginner',
    sport: 'both',
    tags: ['activation', 'warmup', 'game-day'],
    exercises: [
      { id: 'tpl-hip-circles', name: 'Hip Circles', type: 'flexibility', duration: 30, rest: 0 },
      { id: 'tpl-arm-circles', name: 'Shoulder Circles', type: 'baseball', sets: 2, reps: 15, rest: 15 },
      { id: 'tpl-high-knees', name: 'High Knees', type: 'cardio', duration: 30, rest: 15 },
      { id: 'tpl-leg-swings', name: 'Leg Swings', type: 'flexibility', duration: 30, rest: 0 },
      { id: 'tpl-band-activation', name: 'Band Pull-Aparts', type: 'baseball', sets: 2, reps: 10, rest: 15 },
      { id: 'tpl-mini-sprints', name: 'Build-Up Sprints', type: 'cardio', sets: 3, reps: 1, rest: 30 },
    ],
  },

  // ARM CARE PROGRAMS
  {
    id: 'complete-arm-care',
    name: 'Complete Arm Care Routine',
    description: 'Comprehensive arm care protocol with J-Band exercises and stretches',
    category: 'arm-care',
    focus: 'Arm Health',
    duration: 25,
    difficulty: 'beginner',
    sport: 'both',
    tags: ['arm-care', 'prevention', 'j-band'],
    exercises: [
      { id: 'tpl-external-rot', name: 'External Rotation (J-Band)', type: 'baseball', sets: 3, reps: 15, rest: 30 },
      { id: 'tpl-internal-rot', name: 'Internal Rotation (J-Band)', type: 'baseball', sets: 3, reps: 15, rest: 30 },
      { id: 'tpl-band-pull-apart', name: 'Band Pull-Aparts', type: 'baseball', sets: 3, reps: 15, rest: 30 },
      { id: 'tpl-sleeper', name: 'Sleeper Stretch', type: 'baseball', duration: 30, rest: 0 },
      { id: 'tpl-crossover', name: 'Crossover Stretch', type: 'baseball', duration: 30, rest: 0 },
      { id: 'tpl-wrist-flicks', name: 'Wrist Flicks', type: 'baseball', sets: 2, reps: 15, rest: 15 },
    ],
  },
  {
    id: 'throwing-program',
    name: 'Progressive Throwing Program',
    description: 'Structured long toss protocol for building arm strength safely',
    category: 'arm-care',
    focus: 'Throwing',
    duration: 30,
    difficulty: 'intermediate',
    sport: 'both',
    tags: ['throwing', 'long-toss', 'arm-strength'],
    exercises: [
      { id: 'tpl-arm-care-warmup', name: 'External Rotation (J-Band)', type: 'baseball', sets: 2, reps: 12, rest: 30 },
      { id: 'tpl-wrist-flick', name: 'Wrist Flicks', type: 'baseball', sets: 2, reps: 15, rest: 15 },
      { id: 'tpl-long-toss', name: 'Long Toss', type: 'baseball', duration: 900, rest: 0, notes: 'Start at 60ft, work up to max distance' },
      { id: 'tpl-pulldown', name: 'Pull-Down Throws', type: 'baseball', sets: 1, reps: 10, rest: 0, notes: 'Max effort throws from max distance' },
      { id: 'tpl-cooldown', name: 'Band Pull-Aparts', type: 'baseball', sets: 2, reps: 15, rest: 30 },
    ],
  },
  {
    id: 'pitcher-recovery',
    name: 'Pitcher Recovery Protocol',
    description: 'Post-pitching recovery routine to reduce arm soreness and maintain mobility',
    category: 'arm-care',
    focus: 'Recovery',
    duration: 20,
    difficulty: 'beginner',
    sport: 'both',
    tags: ['recovery', 'pitching', 'mobility'],
    exercises: [
      { id: 'tpl-ice-bath', name: 'Arm Flush (Light Band)', type: 'baseball', sets: 2, reps: 20, rest: 15 },
      { id: 'tpl-shoulder-stretch', name: 'Shoulder Stretch', type: 'flexibility', duration: 30, rest: 0 },
      { id: 'tpl-sleeper-stretch', name: 'Sleeper Stretch', type: 'baseball', duration: 45, rest: 0 },
      { id: 'tpl-crossover-stretch', name: 'Crossover Stretch', type: 'baseball', duration: 45, rest: 0 },
      { id: 'tpl-lat-stretch', name: 'Lat Stretch', type: 'flexibility', duration: 30, rest: 0 },
      { id: 'tpl-foam-roll', name: 'Foam Roll Upper Back', type: 'flexibility', duration: 60, rest: 0 },
    ],
  },

  // SPECIALTY PROGRAMS
  {
    id: 'bat-speed-development',
    name: 'Bat Speed Development',
    description: 'Rotational power program to increase bat speed and exit velocity',
    category: 'specialty',
    focus: 'Hitting',
    duration: 45,
    difficulty: 'intermediate',
    sport: 'both',
    tags: ['hitting', 'bat-speed', 'rotational'],
    exercises: [
      { id: 'tpl-hip-rotation-drills', name: 'Hip Rotation Drills', type: 'baseball', sets: 3, reps: 12, rest: 45 },
      { id: 'tpl-med-ball-rotational', name: 'Med Ball Rotational Throws', type: 'baseball', sets: 4, reps: 8, rest: 60 },
      { id: 'tpl-heavy-bat', name: 'Heavy Bat Swings', type: 'baseball', sets: 3, reps: 10, rest: 60 },
      { id: 'tpl-speed-bat', name: 'Underload Swings (Speed Bat)', type: 'baseball', sets: 3, reps: 10, rest: 45 },
      { id: 'tpl-tee-work', name: 'Tee Work', type: 'baseball', sets: 3, reps: 15, rest: 60 },
      { id: 'tpl-russian-twists', name: 'Russian Twists', type: 'core', sets: 3, reps: 20, rest: 30 },
    ],
  },
  {
    id: 'speed-agility',
    name: 'Speed & Agility Training',
    description: 'Improve base running speed and fielding agility',
    category: 'specialty',
    focus: 'Speed',
    duration: 40,
    difficulty: 'intermediate',
    sport: 'both',
    tags: ['speed', 'agility', 'base-running'],
    exercises: [
      { id: 'tpl-high-knees-warmup', name: 'High Knees', type: 'cardio', duration: 30, rest: 15 },
      { id: 'tpl-lateral-shuffles', name: 'Lateral Shuffles', type: 'baseball', sets: 4, reps: 10, rest: 45 },
      { id: 'tpl-first-step', name: 'First Step Explosiveness', type: 'baseball', sets: 4, reps: 6, rest: 45 },
      { id: 'tpl-base-sprints', name: 'Base Running Sprints', type: 'baseball', sets: 5, reps: 1, rest: 60, notes: 'Home to first' },
      { id: 'tpl-stolen-base', name: 'Stolen Base Work', type: 'baseball', sets: 4, reps: 1, rest: 90 },
      { id: 'tpl-skater-jumps', name: 'Skater Jumps', type: 'plyometric', sets: 3, reps: 10, rest: 45 },
    ],
  },
  {
    id: 'catcher-specific',
    name: 'Catcher-Specific Training',
    description: 'Position-specific training for catchers focusing on leg strength and explosiveness',
    category: 'specialty',
    focus: 'Catcher',
    duration: 50,
    difficulty: 'intermediate',
    sport: 'both',
    tags: ['catcher', 'legs', 'explosiveness'],
    exercises: [
      { id: 'tpl-goblet-squat', name: 'Goblet Squats', type: 'strength', sets: 4, reps: 10, rest: 90 },
      { id: 'tpl-box-jump', name: 'Box Jumps', type: 'plyometric', sets: 3, reps: 6, rest: 60 },
      { id: 'tpl-lateral-lunge', name: 'Lateral Lunges', type: 'strength', sets: 3, reps: 10, rest: 60 },
      { id: 'tpl-hip-thrust-catcher', name: 'Hip Thrusts', type: 'strength', sets: 3, reps: 12, rest: 90 },
      { id: 'tpl-throws-from-squat', name: 'Pop-Up Throws (Practice)', type: 'baseball', sets: 5, reps: 1, rest: 45, notes: 'Focus on quick feet' },
      { id: 'tpl-plank-catcher', name: 'Plank', type: 'core', duration: 45, rest: 30 },
    ],
  },
];

export const getTemplatesByCategory = (category: WorkoutTemplate['category']) => 
  WORKOUT_TEMPLATES.filter(t => t.category === category);

export const getTemplatesBySport = (sport: 'baseball' | 'softball') => 
  WORKOUT_TEMPLATES.filter(t => t.sport === sport || t.sport === 'both');
