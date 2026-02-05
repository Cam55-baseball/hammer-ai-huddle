// =====================================================
// ELITE WORKOUT & RUNNING CARD SYSTEM - TYPE DEFINITIONS
// Block-based architecture with CNS/fascial tracking
// =====================================================

import { Exercise as BaseExercise } from './customActivity';

// =====================================================
// BLOCK TYPES
// =====================================================

export type BlockType = 
  | 'activation'
  | 'elastic_prep' 
  | 'cns_primer'
  | 'strength_output'
  | 'power_speed'
  | 'capacity'
  | 'skill_transfer'
  | 'decompression'
  | 'recovery'
  | 'custom';

export type BlockIntent =
  | 'elastic'
  | 'max_output'
  | 'submax_technical'
  | 'accumulation'
  | 'glide_restoration'
  | 'cns_downregulation'
  | 'custom';

export interface BlockMetadata {
  cnsContribution?: number; // 0-100
  fasciaBias?: FascialBias;
  estimatedDuration?: number; // minutes
  notes?: string;
}

export interface WorkoutBlock {
  id: string;
  name: string;
  blockType: BlockType;
  intent: BlockIntent;
  orderIndex: number;
  isCustom: boolean;
  exercises: EnhancedExercise[];
  metadata: BlockMetadata;
}

// Database representation
export interface WorkoutBlockDB {
  id: string;
  user_id: string;
  template_id: string | null;
  name: string;
  intent: string;
  order_index: number;
  block_type: string;
  is_custom: boolean;
  exercises: EnhancedExercise[];
  metadata: BlockMetadata;
  created_at: string;
  updated_at: string;
}

// =====================================================
// ENHANCED EXERCISE TYPES
// =====================================================

export type VelocityIntent = 'slow' | 'moderate' | 'fast' | 'ballistic';
export type LoadType = 'barbell' | 'dumbbell' | 'band' | 'bodyweight' | 'cable' | 'machine' | 'kettlebell' | 'other';
export type FasciaBiasType = 'compression' | 'elastic' | 'glide';
export type CNSDemand = 'low' | 'medium' | 'high';

export interface FascialBias {
  compression: number;
  elastic: number;
  glide: number;
}

export interface PainWarning {
  severity: 'moderate' | 'high';
  message: string;
  affectedAreas: string[];
}

export interface EnhancedExercise extends BaseExercise {
  // Advanced Fields (Hidden by default - Coach mode)
  tempo?: string; // e.g., "3-1-2-0" (eccentric-pause-concentric-pause)
  velocity_intent?: VelocityIntent;
  external_load?: number;
  load_type?: LoadType;
  surface?: string;
  
  // Fascia & CNS (Coach Mode)
  fascia_bias?: FasciaBiasType;
  breathing_pattern?: string;
  cns_demand?: CNSDemand;
  is_unilateral?: boolean;
  
  // Execution cues
  video_reference?: string;
  coaching_cues?: string[];
  
  // Warnings (system-generated)
  pain_warning?: PainWarning;
  
  // Calculated fields
  calculated_cns_load?: number;
}

// =====================================================
// RUNNING TYPES
// =====================================================

export type RunType = 
  | 'linear_sprint' 
  | 'tempo' 
  | 'conditioning' 
  | 'elastic' 
  | 'accel_decel' 
  | 'curve' 
  | 'cod' 
  | 'gait';

export type RunIntent = 'max' | 'submax' | 'elastic' | 'technical' | 'recovery';
export type SurfaceType = 'turf' | 'grass' | 'dirt' | 'concrete' | 'sand' | 'track';
export type ShoeType = 'barefoot' | 'barefoot_shoe' | 'flats' | 'cross_trainer' | 'cushion' | 'plastic_cleat' | 'metal_cleat';
export type FatigueState = 'fresh' | 'accumulated' | 'game_day';

export interface RunningInterval {
  id: string;
  type: 'run' | 'walk' | 'sprint' | 'jog' | 'rest';
  duration?: number; // in seconds
  distance?: number;
  distanceUnit?: 'yards' | 'meters' | 'feet' | 'miles' | 'km';
  pace?: string;
  intensity?: number; // 1-100
}

export interface RunningSession {
  id: string;
  user_id?: string;
  template_id?: string | null;
  runType: RunType;
  intent: RunIntent;
  title?: string;
  
  // Structure
  distanceValue?: number;
  distanceUnit?: 'yards' | 'meters' | 'feet' | 'miles' | 'km';
  timeGoal?: string; // 'H:MM:SS.T' format
  reps?: number;
  contacts?: number; // ground contact tracking
  
  // Context
  surface?: SurfaceType;
  shoeType?: ShoeType;
  fatigueState?: FatigueState;
  environmentNotes?: string;
  preRunStiffness?: number; // 1-5 scale
  
  // Intervals
  intervals?: RunningInterval[];
  
  // Calculated Load
  cnsLoad?: number;
  groundContactsTotal?: number;
  
  // Completion
  completed?: boolean;
  completedAt?: string;
  actualTime?: string;
  notes?: string;
}

// Database representation
export interface RunningSessionDB {
  id: string;
  user_id: string;
  template_id: string | null;
  run_type: string;
  intent: string;
  title: string | null;
  distance_value: number | null;
  distance_unit: string | null;
  time_goal: string | null;
  reps: number | null;
  contacts: number | null;
  surface: string | null;
  shoe_type: string | null;
  fatigue_state: string | null;
  environment_notes: string | null;
  pre_run_stiffness: number | null;
  intervals: RunningInterval[];
  cns_load: number | null;
  ground_contacts_total: number | null;
  completed: boolean;
  completed_at: string | null;
  actual_time: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// =====================================================
// VIEW MODES
// =====================================================

export type ViewMode = 'execute' | 'coach' | 'parent';

export interface ViewModeConfig {
  mode: ViewMode;
  label: string;
  description: string;
  showAdvancedFields: boolean;
  showCNSMetrics: boolean;
  showFascialData: boolean;
  showTrends: boolean;
  simplifiedUI: boolean;
}

export const VIEW_MODE_CONFIGS: Record<ViewMode, ViewModeConfig> = {
  execute: {
    mode: 'execute',
    label: 'Do It',
    description: 'Simple view focused on what to do next',
    showAdvancedFields: false,
    showCNSMetrics: false,
    showFascialData: false,
    showTrends: false,
    simplifiedUI: true,
  },
  coach: {
    mode: 'coach',
    label: 'Full Data',
    description: 'Complete data with all metrics and trends',
    showAdvancedFields: true,
    showCNSMetrics: true,
    showFascialData: true,
    showTrends: true,
    simplifiedUI: false,
  },
  parent: {
    mode: 'parent',
    label: 'Overview',
    description: 'Compliance and safety focused view',
    showAdvancedFields: false,
    showCNSMetrics: false,
    showFascialData: false,
    showTrends: true,
    simplifiedUI: true,
  },
};

// =====================================================
// LOAD TRACKING
// =====================================================

export interface LoadMetrics {
  cnsLoad: number;
  fascialLoad: FascialBias;
  volumeLoad: number;
  recoveryDebt: number;
}

export interface DailyLoadTracking {
  id: string;
  user_id: string;
  entry_date: string;
  cns_load_total: number;
  fascial_load: FascialBias;
  volume_load: number;
  intensity_avg: number | null;
  recovery_debt: number;
  workout_ids: string[];
  running_ids: string[];
  overlap_warnings: OverlapWarning[];
}

// =====================================================
// OVERLAP DETECTION & WARNINGS
// =====================================================

export type OverlapType = 'cns' | 'elastic' | 'load_spike' | 'recovery';
export type WarningSeverity = 'advisory' | 'warning';

export interface OverlapWarning {
  type: OverlapType;
  severity: WarningSeverity;
  message: string;
  suggestion?: string;
  timestamp?: string;
}

// =====================================================
// PRESETS
// =====================================================

export type PresetCategory = 
  | 'explosive_lower'
  | 'elastic_day'
  | 'game_day_prime'
  | 'fascial_recovery'
  | 'power_upper'
  | 'speed_day'
  | 'accumulation'
  | 'custom';

export type PresetDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'all';

export interface WorkoutPreset {
  id: string;
  user_id: string | null; // null for system presets
  name: string;
  description?: string;
  category: PresetCategory;
  difficulty: PresetDifficulty;
  sport: 'baseball' | 'softball' | 'both';
  presetData: {
    blocks: WorkoutBlock[];
  };
  estimatedDurationMinutes?: number;
  cnsLoadEstimate?: number;
  fascialBias?: FascialBias;
  isSystem: boolean;
  isLocked: boolean;
}

// Database representation
export interface WorkoutPresetDB {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  category: string;
  difficulty: string | null;
  sport: string | null;
  preset_data: {
    blocks: WorkoutBlock[];
  };
  estimated_duration_minutes: number | null;
  cns_load_estimate: number | null;
  fascial_bias: FascialBias | null;
  is_system: boolean;
  is_locked: boolean;
  created_at: string;
}

// =====================================================
// READINESS CHECK
// =====================================================

export interface QuickReadinessCheck {
  sleepQuality: 1 | 2 | 3 | 4 | 5;
  energyLevel: 1 | 2 | 3 | 4 | 5;
  soreness: 1 | 2 | 3 | 4 | 5;
  timestamp: string;
}

export interface ReadinessData {
  fromVault?: {
    sleepQuality?: number;
    stressLevel?: number;
    painAreas?: string[];
    lastCheckinDate?: string;
  };
  quickCheck?: QuickReadinessCheck;
  overallScore?: number; // 0-100
  recommendation?: 'full_send' | 'modify_volume' | 'recovery_focus';
}

// =====================================================
// BLOCK TYPE CONFIGURATIONS
// =====================================================

export interface BlockTypeConfig {
  type: BlockType;
  label: string;
  description: string;
  icon: string;
  defaultIntent: BlockIntent;
  color: string; // Tailwind color class
  suggestedExerciseTypes: string[];
}

export const BLOCK_TYPE_CONFIGS: Record<BlockType, BlockTypeConfig> = {
  activation: {
    type: 'activation',
    label: 'Activation',
    description: 'Wake up muscles and nervous system',
    icon: 'Flame',
    defaultIntent: 'submax_technical',
    color: 'bg-amber-500/20 border-amber-500/40',
    suggestedExerciseTypes: ['flexibility', 'core'],
  },
  elastic_prep: {
    type: 'elastic_prep',
    label: 'Elastic Prep',
    description: 'Prepare tendons and fascia for bouncy work',
    icon: 'Zap',
    defaultIntent: 'elastic',
    color: 'bg-sky-500/20 border-sky-500/40',
    suggestedExerciseTypes: ['plyometric'],
  },
  cns_primer: {
    type: 'cns_primer',
    label: 'CNS Primer',
    description: 'Short explosive bursts to wake up fast-twitch',
    icon: 'Bolt',
    defaultIntent: 'max_output',
    color: 'bg-red-500/20 border-red-500/40',
    suggestedExerciseTypes: ['plyometric', 'strength'],
  },
  strength_output: {
    type: 'strength_output',
    label: 'Strength Output',
    description: 'Main lifting work',
    icon: 'Dumbbell',
    defaultIntent: 'accumulation',
    color: 'bg-purple-500/20 border-purple-500/40',
    suggestedExerciseTypes: ['strength'],
  },
  power_speed: {
    type: 'power_speed',
    label: 'Power/Speed',
    description: 'Maximum velocity and power output',
    icon: 'Rocket',
    defaultIntent: 'max_output',
    color: 'bg-orange-500/20 border-orange-500/40',
    suggestedExerciseTypes: ['plyometric', 'baseball'],
  },
  capacity: {
    type: 'capacity',
    label: 'Capacity',
    description: 'Work capacity and conditioning',
    icon: 'Battery',
    defaultIntent: 'accumulation',
    color: 'bg-green-500/20 border-green-500/40',
    suggestedExerciseTypes: ['cardio', 'strength'],
  },
  skill_transfer: {
    type: 'skill_transfer',
    label: 'Skill Transfer',
    description: 'Sport-specific movement patterns',
    icon: 'Target',
    defaultIntent: 'submax_technical',
    color: 'bg-blue-500/20 border-blue-500/40',
    suggestedExerciseTypes: ['baseball'],
  },
  decompression: {
    type: 'decompression',
    label: 'Decompression',
    description: 'Restore tissue glide and length',
    icon: 'Wind',
    defaultIntent: 'glide_restoration',
    color: 'bg-teal-500/20 border-teal-500/40',
    suggestedExerciseTypes: ['flexibility'],
  },
  recovery: {
    type: 'recovery',
    label: 'Recovery',
    description: 'Cool down and restore',
    icon: 'Moon',
    defaultIntent: 'cns_downregulation',
    color: 'bg-indigo-500/20 border-indigo-500/40',
    suggestedExerciseTypes: ['flexibility'],
  },
  custom: {
    type: 'custom',
    label: 'Custom Block',
    description: 'Create your own block type',
    icon: 'Plus',
    defaultIntent: 'custom',
    color: 'bg-slate-500/20 border-slate-500/40',
    suggestedExerciseTypes: [],
  },
};

// =====================================================
// RUN TYPE CONFIGURATIONS
// =====================================================

export interface RunTypeConfig {
  type: RunType;
  label: string;
  description: string;
  icon: string;
  defaultIntent: RunIntent;
  color: string;
  typicalCNSLoad: 'low' | 'medium' | 'high';
}

export const RUN_TYPE_CONFIGS: Record<RunType, RunTypeConfig> = {
  linear_sprint: {
    type: 'linear_sprint',
    label: 'Sprint',
    description: 'Maximum velocity straight-line running',
    icon: 'Zap',
    defaultIntent: 'max',
    color: 'bg-red-500/20 border-red-500/40',
    typicalCNSLoad: 'high',
  },
  tempo: {
    type: 'tempo',
    label: 'Tempo',
    description: 'Controlled pace running',
    icon: 'Timer',
    defaultIntent: 'submax',
    color: 'bg-blue-500/20 border-blue-500/40',
    typicalCNSLoad: 'medium',
  },
  conditioning: {
    type: 'conditioning',
    label: 'Conditioning',
    description: 'Work capacity and endurance',
    icon: 'Heart',
    defaultIntent: 'submax',
    color: 'bg-green-500/20 border-green-500/40',
    typicalCNSLoad: 'medium',
  },
  elastic: {
    type: 'elastic',
    label: 'Elastic/Bounce',
    description: 'Springy, reactive running',
    icon: 'ArrowUp',
    defaultIntent: 'elastic',
    color: 'bg-sky-500/20 border-sky-500/40',
    typicalCNSLoad: 'medium',
  },
  accel_decel: {
    type: 'accel_decel',
    label: 'Accel/Decel',
    description: 'Speed up and slow down drills',
    icon: 'TrendingUp',
    defaultIntent: 'max',
    color: 'bg-orange-500/20 border-orange-500/40',
    typicalCNSLoad: 'high',
  },
  curve: {
    type: 'curve',
    label: 'Curve Run',
    description: 'Arc and curve path running',
    icon: 'RotateCcw',
    defaultIntent: 'submax',
    color: 'bg-purple-500/20 border-purple-500/40',
    typicalCNSLoad: 'medium',
  },
  cod: {
    type: 'cod',
    label: 'Change of Direction',
    description: 'Agility and direction changes',
    icon: 'Shuffle',
    defaultIntent: 'max',
    color: 'bg-amber-500/20 border-amber-500/40',
    typicalCNSLoad: 'high',
  },
  gait: {
    type: 'gait',
    label: 'Gait Work',
    description: 'Running mechanics and form',
    icon: 'Footprints',
    defaultIntent: 'technical',
    color: 'bg-teal-500/20 border-teal-500/40',
    typicalCNSLoad: 'low',
  },
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

export function createEmptyBlock(type: BlockType, orderIndex: number): WorkoutBlock {
  const config = BLOCK_TYPE_CONFIGS[type];
  return {
    id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: config.label,
    blockType: type,
    intent: config.defaultIntent,
    orderIndex,
    isCustom: type === 'custom',
    exercises: [],
    metadata: {},
  };
}

export function createEmptyRunningSession(): RunningSession {
  return {
    id: `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    runType: 'tempo',
    intent: 'submax',
    distanceUnit: 'yards',
    fatigueState: 'fresh',
    intervals: [],
  };
}

export function getBlockColor(type: BlockType): string {
  return BLOCK_TYPE_CONFIGS[type]?.color || 'bg-slate-500/20 border-slate-500/40';
}

export function getRunTypeColor(type: RunType): string {
  return RUN_TYPE_CONFIGS[type]?.color || 'bg-slate-500/20 border-slate-500/40';
}
