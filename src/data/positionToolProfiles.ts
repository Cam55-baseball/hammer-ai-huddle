// =====================================================================
// POSITION-SPECIFIC 5-TOOL PROFILES
// =====================================================================
// Maps positions to tool weights and metric-to-tool assignments.
// =====================================================================

import { rawToGrade } from '@/lib/gradeEngine';

export type ToolName = 'hit' | 'power' | 'run' | 'field' | 'arm';

interface ToolMapping {
  weight: number;
  metrics: string[]; // metric keys that feed this tool
}

export type ToolProfile = Record<ToolName, ToolMapping>;

// ── METRIC → TOOL ASSIGNMENTS ────────────────────────────
const HIT_METRICS = ['tee_exit_velocity', 'bat_speed', 'avg_exit_velo_bp'];
const POWER_METRICS = ['tee_exit_velocity', 'max_tee_distance', 'mb_rotational_throw', 'vertical_jump', 'sl_broad_jump', 'mb_situp_throw', 'seated_chest_pass', 'mb_overhead_throw', 'standing_broad_jump'];
const RUN_METRICS = ['sixty_yard_dash', 'ten_yard_dash', 'thirty_yard_dash', 'pro_agility', 'lateral_shuffle', 'first_step_5yd'];
const FIELD_METRICS = ['fielding_exchange_time', 'pop_time', 'lateral_shuffle', 'sixty_yard_shuttle', 'sl_balance_eyes_closed', 'pro_agility'];
const ARM_METRICS = ['position_throw_velo', 'long_toss_distance', 'pulldown_velocity', 'pitching_velocity'];

// ── POSITION WEIGHT TABLES ───────────────────────────────
export const POSITION_TOOL_PROFILES: Record<string, ToolProfile> = {
  SS: {
    hit:   { weight: 0.20, metrics: HIT_METRICS },
    power: { weight: 0.10, metrics: POWER_METRICS },
    run:   { weight: 0.20, metrics: RUN_METRICS },
    field: { weight: 0.25, metrics: FIELD_METRICS },
    arm:   { weight: 0.25, metrics: ARM_METRICS },
  },
  C: {
    hit:   { weight: 0.15, metrics: HIT_METRICS },
    power: { weight: 0.10, metrics: POWER_METRICS },
    run:   { weight: 0.05, metrics: RUN_METRICS },
    field: { weight: 0.35, metrics: [...FIELD_METRICS, 'pop_time'] },
    arm:   { weight: 0.35, metrics: ARM_METRICS },
  },
  '1B': {
    hit:   { weight: 0.25, metrics: HIT_METRICS },
    power: { weight: 0.35, metrics: POWER_METRICS },
    run:   { weight: 0.05, metrics: RUN_METRICS },
    field: { weight: 0.25, metrics: FIELD_METRICS },
    arm:   { weight: 0.10, metrics: ARM_METRICS },
  },
  '2B': {
    hit:   { weight: 0.25, metrics: HIT_METRICS },
    power: { weight: 0.10, metrics: POWER_METRICS },
    run:   { weight: 0.20, metrics: RUN_METRICS },
    field: { weight: 0.25, metrics: FIELD_METRICS },
    arm:   { weight: 0.20, metrics: ARM_METRICS },
  },
  '3B': {
    hit:   { weight: 0.20, metrics: HIT_METRICS },
    power: { weight: 0.20, metrics: POWER_METRICS },
    run:   { weight: 0.10, metrics: RUN_METRICS },
    field: { weight: 0.25, metrics: FIELD_METRICS },
    arm:   { weight: 0.25, metrics: ARM_METRICS },
  },
  CF: {
    hit:   { weight: 0.15, metrics: HIT_METRICS },
    power: { weight: 0.10, metrics: POWER_METRICS },
    run:   { weight: 0.25, metrics: RUN_METRICS },
    field: { weight: 0.30, metrics: FIELD_METRICS },
    arm:   { weight: 0.20, metrics: ARM_METRICS },
  },
  LF: {
    hit:   { weight: 0.25, metrics: HIT_METRICS },
    power: { weight: 0.25, metrics: POWER_METRICS },
    run:   { weight: 0.10, metrics: RUN_METRICS },
    field: { weight: 0.20, metrics: FIELD_METRICS },
    arm:   { weight: 0.20, metrics: ARM_METRICS },
  },
  RF: {
    hit:   { weight: 0.25, metrics: HIT_METRICS },
    power: { weight: 0.25, metrics: POWER_METRICS },
    run:   { weight: 0.10, metrics: RUN_METRICS },
    field: { weight: 0.20, metrics: FIELD_METRICS },
    arm:   { weight: 0.20, metrics: ARM_METRICS },
  },
  P: {
    hit:   { weight: 0.00, metrics: HIT_METRICS },
    power: { weight: 0.15, metrics: POWER_METRICS },
    run:   { weight: 0.10, metrics: RUN_METRICS },
    field: { weight: 0.15, metrics: FIELD_METRICS },
    arm:   { weight: 0.60, metrics: ARM_METRICS },
  },
  DH: {
    hit:   { weight: 0.50, metrics: HIT_METRICS },
    power: { weight: 0.50, metrics: POWER_METRICS },
    run:   { weight: 0.00, metrics: RUN_METRICS },
    field: { weight: 0.00, metrics: FIELD_METRICS },
    arm:   { weight: 0.00, metrics: ARM_METRICS },
  },
  UT: {
    hit:   { weight: 0.20, metrics: HIT_METRICS },
    power: { weight: 0.15, metrics: POWER_METRICS },
    run:   { weight: 0.20, metrics: RUN_METRICS },
    field: { weight: 0.25, metrics: FIELD_METRICS },
    arm:   { weight: 0.20, metrics: ARM_METRICS },
  },
  UTIL: {
    hit:   { weight: 0.20, metrics: HIT_METRICS },
    power: { weight: 0.15, metrics: POWER_METRICS },
    run:   { weight: 0.20, metrics: RUN_METRICS },
    field: { weight: 0.25, metrics: FIELD_METRICS },
    arm:   { weight: 0.20, metrics: ARM_METRICS },
  },
  DP: {
    hit:   { weight: 0.50, metrics: HIT_METRICS },
    power: { weight: 0.50, metrics: POWER_METRICS },
    run:   { weight: 0.00, metrics: RUN_METRICS },
    field: { weight: 0.00, metrics: FIELD_METRICS },
    arm:   { weight: 0.00, metrics: ARM_METRICS },
  },
  SLAPPER: {
    hit:   { weight: 0.30, metrics: HIT_METRICS },
    power: { weight: 0.05, metrics: POWER_METRICS },
    run:   { weight: 0.30, metrics: RUN_METRICS },
    field: { weight: 0.20, metrics: FIELD_METRICS },
    arm:   { weight: 0.15, metrics: ARM_METRICS },
  },
};

// Default profile if position not found
const DEFAULT_PROFILE: ToolProfile = {
  hit:   { weight: 0.20, metrics: HIT_METRICS },
  power: { weight: 0.20, metrics: POWER_METRICS },
  run:   { weight: 0.20, metrics: RUN_METRICS },
  field: { weight: 0.20, metrics: FIELD_METRICS },
  arm:   { weight: 0.20, metrics: ARM_METRICS },
};

export interface ToolGrades {
  hit: number | null;
  power: number | null;
  run: number | null;
  field: number | null;
  arm: number | null;
  overall: number | null;
}

/**
 * Compute 5-tool grades + overall for a position based on test results.
 * Missing metrics reduce the denominator (partial tests still work).
 */
export function computeToolGrades(
  results: Record<string, number>,
  position: string | null | undefined,
  sport: 'baseball' | 'softball',
  age?: number | null
): ToolGrades {
  const pos = (position || 'UT').toUpperCase();
  const profile = POSITION_TOOL_PROFILES[pos] || DEFAULT_PROFILE;
  
  const toolGrades: Record<ToolName, number | null> = {
    hit: null, power: null, run: null, field: null, arm: null,
  };

  const tools: ToolName[] = ['hit', 'power', 'run', 'field', 'arm'];
  
  for (const tool of tools) {
    const mapping = profile[tool];
    if (mapping.weight === 0) {
      toolGrades[tool] = null;
      continue;
    }

    let totalGrade = 0;
    let count = 0;

    for (const metricKey of mapping.metrics) {
      // Check for bilateral metrics (e.g., sl_broad_jump → sl_broad_jump_left, sl_broad_jump_right)
      const leftKey = `${metricKey}_left`;
      const rightKey = `${metricKey}_right`;
      
      if (results[leftKey] !== undefined && results[rightKey] !== undefined) {
        const leftGrade = rawToGrade(metricKey, results[leftKey], sport, age);
        const rightGrade = rawToGrade(metricKey, results[rightKey], sport, age);
        if (leftGrade !== null && rightGrade !== null) {
          totalGrade += (leftGrade + rightGrade) / 2;
          count++;
        }
      } else if (results[metricKey] !== undefined) {
        const grade = rawToGrade(metricKey, results[metricKey], sport, age);
        if (grade !== null) {
          totalGrade += grade;
          count++;
        }
      }
    }

    toolGrades[tool] = count > 0 ? Math.round(totalGrade / count) : null;
  }

  // Compute overall as weighted average of non-null tool grades
  let weightedSum = 0;
  let totalWeight = 0;
  
  for (const tool of tools) {
    const grade = toolGrades[tool];
    const weight = profile[tool].weight;
    if (grade !== null && weight > 0) {
      weightedSum += grade * weight;
      totalWeight += weight;
    }
  }

  const overall = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null;

  return { ...toolGrades, overall };
}

export const TOOL_LABELS: Record<ToolName, string> = {
  hit: 'Hit',
  power: 'Power',
  run: 'Run',
  field: 'Field',
  arm: 'Arm',
};
