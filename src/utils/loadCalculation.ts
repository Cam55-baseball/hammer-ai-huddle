// =====================================================
// LOAD CALCULATION UTILITIES
// CNS tracking, fascial bias, and overlap detection
// =====================================================

import {
  EnhancedExercise,
  WorkoutBlock,
  RunningSession,
  LoadMetrics,
  OverlapWarning,
  FascialBias,
  RUN_TYPE_CONFIGS,
} from '@/types/eliteWorkout';

// =====================================================
// INPUT VALIDATION HELPERS
// =====================================================

function safeNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && !isNaN(value) && isFinite(value)) return value;
  return fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// =====================================================
// CNS LOAD CALCULATION
// =====================================================

export function calculateExerciseCNS(exercise: EnhancedExercise): number {
  if (!exercise) return 0;
  
  let cns = 0;
  
  // Base by exercise type
  switch (exercise.type) {
    case 'plyometric':
      cns += 40;
      break;
    case 'strength':
      cns += 30;
      break;
    case 'baseball':
      cns += 25;
      break;
    case 'core':
      cns += 15;
      break;
    case 'cardio':
      cns += 20;
      break;
    case 'flexibility':
      cns += 5;
      break;
    default:
      cns += 15;
  }
  
  // Velocity intent modifier
  if (exercise.velocity_intent === 'ballistic') {
    cns *= 1.5;
  } else if (exercise.velocity_intent === 'fast') {
    cns *= 1.25;
  } else if (exercise.velocity_intent === 'slow') {
    cns *= 0.75;
  }
  
  // Volume modifier (sets × reps) with bounds
  const sets = clamp(safeNumber(exercise.sets, 1), 1, 20);
  const reps = typeof exercise.reps === 'number' 
    ? clamp(exercise.reps, 1, 100) 
    : 10;
  const volume = sets * reps;
  cns += volume * 0.5;
  
  // Explicit CNS demand override
  if (exercise.cns_demand === 'high') {
    cns *= 1.3;
  } else if (exercise.cns_demand === 'low') {
    cns *= 0.7;
  }
  
  // Unilateral work slightly higher CNS
  if (exercise.is_unilateral) {
    cns *= 1.1;
  }
  
  return Math.round(cns);
}

export function calculateBlockCNS(block: WorkoutBlock): number {
  if (!block?.exercises || !Array.isArray(block.exercises)) return 0;
  
  return block.exercises.reduce((total, exercise) => {
    return total + calculateExerciseCNS(exercise);
  }, 0);
}

export function calculateWorkoutCNS(blocks: WorkoutBlock[]): number {
  if (!blocks || !Array.isArray(blocks)) return 0;
  
  return blocks.reduce((total, block) => {
    return total + calculateBlockCNS(block);
  }, 0);
}

export function calculateRunningCNS(session: RunningSession): number {
  if (!session) return 0;
  
  const config = RUN_TYPE_CONFIGS[session.runType];
  if (!config) return 30; // Default fallback
  
  let baseCNS = 0;
  
  // Base by run type
  switch (config.typicalCNSLoad) {
    case 'high':
      baseCNS = 50;
      break;
    case 'medium':
      baseCNS = 30;
      break;
    case 'low':
      baseCNS = 15;
      break;
    default:
      baseCNS = 30;
  }
  
  // Intent modifier
  if (session.intent === 'max') {
    baseCNS *= 1.4;
  } else if (session.intent === 'recovery') {
    baseCNS *= 0.5;
  }
  
  // Volume modifier (reps or distance) with bounds
  const reps = clamp(safeNumber(session.reps, 1), 1, 50);
  baseCNS += reps * 5;
  
  // Ground contacts add CNS load
  if (session.contacts) {
    const contacts = clamp(safeNumber(session.contacts), 0, 500);
    baseCNS += contacts * 0.2;
  }
  
  // Fatigue state modifier
  if (session.fatigueState === 'accumulated') {
    baseCNS *= 1.2; // Higher CNS cost when fatigued
  } else if (session.fatigueState === 'game_day') {
    baseCNS *= 1.3;
  }
  
  return Math.round(baseCNS);
}

// =====================================================
// FASCIAL BIAS CALCULATION
// =====================================================

export function calculateExerciseFasciaBias(exercise: EnhancedExercise): FascialBias {
  const bias: FascialBias = { compression: 0, elastic: 0, glide: 0 };
  
  if (!exercise) return bias;
  
  // If explicitly set, use that
  if (exercise.fascia_bias) {
    switch (exercise.fascia_bias) {
      case 'compression':
        bias.compression = 80;
        bias.elastic = 10;
        bias.glide = 10;
        break;
      case 'elastic':
        bias.elastic = 80;
        bias.compression = 10;
        bias.glide = 10;
        break;
      case 'glide':
        bias.glide = 80;
        bias.compression = 10;
        bias.elastic = 10;
        break;
    }
    return bias;
  }
  
  // Auto-detect based on exercise type
  switch (exercise.type) {
    case 'strength':
      bias.compression = 60;
      bias.elastic = 20;
      bias.glide = 20;
      break;
    case 'plyometric':
      bias.elastic = 70;
      bias.compression = 20;
      bias.glide = 10;
      break;
    case 'flexibility':
      bias.glide = 70;
      bias.compression = 15;
      bias.elastic = 15;
      break;
    case 'cardio':
      bias.elastic = 40;
      bias.compression = 30;
      bias.glide = 30;
      break;
    default:
      bias.compression = 33;
      bias.elastic = 34;
      bias.glide = 33;
  }
  
  // Velocity modifies bias
  if (exercise.velocity_intent === 'ballistic') {
    bias.elastic += 20;
    bias.compression -= 10;
    bias.glide -= 10;
  } else if (exercise.velocity_intent === 'slow') {
    bias.compression += 20;
    bias.elastic -= 15;
    bias.glide -= 5;
  }
  
  return bias;
}

export function calculateBlockFasciaBias(block: WorkoutBlock): FascialBias {
  if (!block?.exercises || block.exercises.length === 0) {
    return { compression: 0, elastic: 0, glide: 0 };
  }
  
  const totals = block.exercises.reduce(
    (acc, exercise) => {
      const bias = calculateExerciseFasciaBias(exercise);
      return {
        compression: acc.compression + bias.compression,
        elastic: acc.elastic + bias.elastic,
        glide: acc.glide + bias.glide,
      };
    },
    { compression: 0, elastic: 0, glide: 0 }
  );
  
  const count = block.exercises.length;
  return {
    compression: Math.round(totals.compression / count),
    elastic: Math.round(totals.elastic / count),
    glide: Math.round(totals.glide / count),
  };
}

export function calculateWorkoutFasciaBias(blocks: WorkoutBlock[]): FascialBias {
  if (!blocks || blocks.length === 0) {
    return { compression: 0, elastic: 0, glide: 0 };
  }
  
  const totals = blocks.reduce(
    (acc, block) => {
      const bias = calculateBlockFasciaBias(block);
      return {
        compression: acc.compression + bias.compression,
        elastic: acc.elastic + bias.elastic,
        glide: acc.glide + bias.glide,
      };
    },
    { compression: 0, elastic: 0, glide: 0 }
  );
  
  const count = blocks.length;
  return {
    compression: Math.round(totals.compression / count),
    elastic: Math.round(totals.elastic / count),
    glide: Math.round(totals.glide / count),
  };
}

// =====================================================
// OVERLAP DETECTION
// =====================================================

export function detectOverlaps(
  dayMetrics: LoadMetrics,
  weeklyAverage: LoadMetrics | null
): OverlapWarning[] {
  const warnings: OverlapWarning[] = [];
  
  if (!dayMetrics) return warnings;
  
  const cnsLoad = safeNumber(dayMetrics.cnsLoad);
  
  // High CNS load warning (> 150 is concerning)
  if (cnsLoad > 150) {
    warnings.push({
      type: 'cns',
      severity: 'warning',
      message: 'High CNS load today - consider spacing explosive work',
      suggestion: 'Move one high-intensity session to tomorrow',
    });
  } else if (cnsLoad > 100) {
    warnings.push({
      type: 'cns',
      severity: 'advisory',
      message: 'Elevated CNS load - monitor recovery',
    });
  }
  
  // Elastic overload (> 100 is high)
  const elasticLoad = safeNumber(dayMetrics.fascialLoad?.elastic);
  if (elasticLoad > 100) {
    warnings.push({
      type: 'elastic',
      severity: 'advisory',
      message: 'High elastic demand - ensure adequate warmup',
    });
  }
  
  // Load spike compared to weekly average
  const volumeLoad = safeNumber(dayMetrics.volumeLoad);
  const weeklyVolume = safeNumber(weeklyAverage?.volumeLoad);
  if (weeklyAverage && weeklyVolume > 0 && volumeLoad > weeklyVolume * 1.5) {
    warnings.push({
      type: 'load_spike',
      severity: 'warning',
      message: 'Load spike detected - risk of overtraining',
      suggestion: 'Consider reducing volume by 20%',
    });
  }
  
  // Recovery debt check
  const recoveryDebt = safeNumber(dayMetrics.recoveryDebt);
  if (recoveryDebt > 50) {
    warnings.push({
      type: 'recovery',
      severity: 'warning',
      message: 'Recovery debt accumulating - prioritize rest',
      suggestion: 'Add extra sleep or take a recovery day',
    });
  }
  
  return warnings;
}

// =====================================================
// AUTO-ADAPTATION SUGGESTIONS
// =====================================================

export interface AdaptationSuggestion {
  type: 'reduce_volume' | 'reduce_intensity' | 'swap_recovery' | 'add_warmup' | 'rest_day';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

export function generateAdaptationSuggestions(
  dayMetrics: LoadMetrics,
  readinessScore: number | null,
  painAreas: string[]
): AdaptationSuggestion[] {
  const suggestions: AdaptationSuggestion[] = [];
  
  // Low readiness suggestions
  if (readinessScore !== null && readinessScore < 50) {
    suggestions.push({
      type: 'reduce_intensity',
      title: 'Lower intensity today',
      description: 'Your readiness score is low. Consider reducing intensity by 15-20%.',
      priority: 'high',
    });
  } else if (readinessScore !== null && readinessScore < 70) {
    suggestions.push({
      type: 'add_warmup',
      title: 'Extended warmup',
      description: 'Take extra time warming up to prepare your body.',
      priority: 'medium',
    });
  }
  
  // Pain area suggestions
  if (painAreas && painAreas.length > 0) {
    suggestions.push({
      type: 'swap_recovery',
      title: 'Modify for sore areas',
      description: `Consider alternative exercises for: ${painAreas.join(', ')}`,
      priority: 'medium',
    });
  }
  
  // High load suggestions
  const cnsLoad = safeNumber(dayMetrics?.cnsLoad);
  if (cnsLoad > 120) {
    suggestions.push({
      type: 'reduce_volume',
      title: 'Reduce total volume',
      description: 'High CNS demand planned. Cut 1-2 sets per exercise.',
      priority: 'medium',
    });
  }
  
  // Recovery debt
  const recoveryDebt = safeNumber(dayMetrics?.recoveryDebt);
  if (recoveryDebt > 30) {
    suggestions.push({
      type: 'rest_day',
      title: 'Consider a recovery day',
      description: 'Your body may need extra rest before the next hard session.',
      priority: 'low',
    });
  }
  
  return suggestions;
}

// =====================================================
// VOLUME CALCULATION
// =====================================================

export function calculateWorkoutVolume(blocks: WorkoutBlock[]): number {
  if (!blocks || !Array.isArray(blocks)) return 0;
  
  return blocks.reduce((total, block) => {
    if (!block?.exercises) return total;
    
    return total + block.exercises.reduce((blockTotal, exercise) => {
      const sets = clamp(safeNumber(exercise.sets, 1), 1, 20);
      const reps = typeof exercise.reps === 'number' 
        ? clamp(exercise.reps, 1, 100) 
        : 10;
      return blockTotal + (sets * reps);
    }, 0);
  }, 0);
}

export function calculateRunningVolume(session: RunningSession): number {
  if (!session) return 0;
  
  // Calculate based on contacts or reps × estimated contacts
  if (session.groundContactsTotal) {
    return clamp(safeNumber(session.groundContactsTotal), 0, 10000);
  }
  
  const reps = clamp(safeNumber(session.reps, 1), 1, 50);
  const distance = clamp(safeNumber(session.distanceValue), 0, 10000);
  
  // Estimate contacts based on distance and unit
  let contactsPerRep = 0;
  switch (session.distanceUnit) {
    case 'yards':
      contactsPerRep = distance * 1.5; // ~1.5 contacts per yard
      break;
    case 'meters':
      contactsPerRep = distance * 1.3;
      break;
    case 'feet':
      contactsPerRep = distance * 0.5;
      break;
    default:
      contactsPerRep = 50; // Default estimate
  }
  
  return Math.round(reps * contactsPerRep);
}

// =====================================================
// COMBINED LOAD METRICS
// =====================================================

export function calculateDayLoadMetrics(
  blocks: WorkoutBlock[],
  runningSessions: RunningSession[]
): LoadMetrics {
  const workoutCNS = calculateWorkoutCNS(blocks);
  const runningCNS = (runningSessions || []).reduce((total, session) => {
    return total + calculateRunningCNS(session);
  }, 0);
  
  const workoutFascia = calculateWorkoutFasciaBias(blocks);
  const workoutVolume = calculateWorkoutVolume(blocks);
  const runningVolume = (runningSessions || []).reduce((total, session) => {
    return total + calculateRunningVolume(session);
  }, 0);
  
  return {
    cnsLoad: workoutCNS + runningCNS,
    fascialLoad: workoutFascia,
    volumeLoad: workoutVolume + runningVolume,
    recoveryDebt: 0, // Calculated separately with historical data
  };
}

// =====================================================
// FORMATTING HELPERS
// =====================================================

// =====================================================
// CNS LOAD FOR CUSTOM ACTIVITIES (ALL TYPES)
// =====================================================

const TYPE_CNS_BASES: Record<string, number> = {
  workout: 30,
  running: 25,
  practice: 25,
  short_practice: 20,
  warmup: 10,
  recovery: 5,
  meal: 0,
  free_session: 15,
  exercise: 25,
  skill_work: 20,
  mobility: 8,
  conditioning: 30,
  plyometrics: 40,
  speed: 35,
  flexibility: 5,
};

export function calculateCustomActivityCNS(template: {
  exercises?: any[] | null;
  duration_minutes?: number | null;
  intensity?: string | null;
  activity_type?: string;
}): number {
  // If the activity has exercises, use standard calculation
  if (template.exercises && Array.isArray(template.exercises) && template.exercises.length > 0) {
    const total = template.exercises.reduce((sum: number, ex: any) => sum + calculateExerciseCNS(ex), 0);
    return Math.max(total, 5); // Never zero
  }
  // Duration-based estimation for activities without exercise blocks
  const durationMinutes = template.duration_minutes || 30;
  const intensityMultiplier = template.intensity === 'max' ? 1.5
    : template.intensity === 'high' ? 1.2
    : template.intensity === 'moderate' ? 1.0
    : 0.7;
  const typeBase = TYPE_CNS_BASES[template.activity_type || 'free_session'] || 15;
  const result = Math.round(typeBase * (durationMinutes / 30) * intensityMultiplier);
  return Math.max(result, typeBase === 0 ? 0 : 3); // Minimum 3 unless meal
}

export function formatCNSLoad(load: number): { label: string; color: string } {
  const safeLoad = safeNumber(load);
  
  if (safeLoad > 150) {
    return { label: 'Very High', color: 'text-red-500' };
  } else if (safeLoad > 100) {
    return { label: 'High', color: 'text-orange-500' };
  } else if (safeLoad > 60) {
    return { label: 'Moderate', color: 'text-amber-500' };
  } else if (safeLoad > 30) {
    return { label: 'Low', color: 'text-green-500' };
  }
  return { label: 'Minimal', color: 'text-muted-foreground' };
}

export function formatFasciaBias(bias: FascialBias): string {
  if (!bias) return 'Balanced';
  
  const compression = safeNumber(bias.compression);
  const elastic = safeNumber(bias.elastic);
  const glide = safeNumber(bias.glide);
  
  const max = Math.max(compression, elastic, glide);
  if (max === compression) return 'Compression';
  if (max === elastic) return 'Elastic';
  return 'Glide';
}
