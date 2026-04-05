// =====================================================================
// TEST INTELLIGENCE ENGINE — Actionable Insights from Test Results
// =====================================================================

import { rawToGrade, gradeToLabel } from '@/lib/gradeEngine';
import { computeToolGrades, type ToolGrades, type ToolName, TOOL_LABELS } from '@/data/positionToolProfiles';
import { METRIC_BY_KEY } from '@/data/performanceTestRegistry';

export interface MetricGradeResult {
  key: string;
  label: string;
  rawValue: number;
  grade: number;
  gradeLabel: string;
  category: string;
  unit: string;
}

export interface TestIntelligenceReport {
  metricGrades: MetricGradeResult[];
  toolGrades: ToolGrades;
  topStrengths: MetricGradeResult[];
  limitingFactors: { metric: MetricGradeResult; blocks: string }[];
  trainingPriority: string;
}

// Causal links: a weak metric in key X limits performance in Y metrics
const CAUSAL_LINKS: Record<string, { blocks: string[]; message: string }> = {
  mb_rotational_throw: {
    blocks: ['tee_exit_velocity', 'bat_speed'],
    message: 'Rotational power is limiting your exit velocity ceiling',
  },
  sl_broad_jump: {
    blocks: ['sixty_yard_dash', 'ten_yard_dash'],
    message: 'Lower body power is limiting your sprint speed potential',
  },
  vertical_jump: {
    blocks: ['bat_speed', 'pitching_velocity'],
    message: 'Lower body explosiveness is limiting your velocity output',
  },
  hip_internal_rotation: {
    blocks: ['mb_rotational_throw', 'bat_speed', 'pitching_velocity'],
    message: 'Hip mobility is limiting your rotational mechanics',
  },
  shoulder_rom_external: {
    blocks: ['pitching_velocity', 'position_throw_velo', 'long_toss_distance'],
    message: 'Shoulder external rotation is limiting your arm speed',
  },
  shoulder_rom_internal: {
    blocks: ['pitching_velocity', 'position_throw_velo'],
    message: 'Shoulder internal rotation limitation increases injury risk',
  },
  pro_agility: {
    blocks: ['fielding_exchange_time', 'lateral_shuffle'],
    message: 'Lateral quickness is limiting your fielding range',
  },
  sl_vert_jump: {
    blocks: ['pitching_velocity', 'position_throw_velo'],
    message: 'Single-leg power is limiting your drive-leg force production',
  },
  seated_chest_pass: {
    blocks: ['pitching_velocity', 'position_throw_velo'],
    message: 'Upper body push power is limiting your arm deceleration capacity',
  },
  ankle_dorsiflexion: {
    blocks: ['sl_broad_jump', 'pro_agility'],
    message: 'Ankle mobility is limiting your lower body mechanics',
  },
};

/**
 * Generate a full intelligence report from test results.
 */
export function generateReport(
  results: Record<string, number>,
  position: string | null | undefined,
  sport: 'baseball' | 'softball',
  age?: number | null
): TestIntelligenceReport {
  // 1. Grade all metrics
  const metricGrades: MetricGradeResult[] = [];
  
  for (const [key, value] of Object.entries(results)) {
    if (key.startsWith('_')) continue;
    const def = METRIC_BY_KEY[key];
    if (!def) continue;
    
    const grade = rawToGrade(key, value, sport, age);
    if (grade === null) continue;
    
    metricGrades.push({
      key,
      label: def.label,
      rawValue: value,
      grade,
      gradeLabel: gradeToLabel(grade),
      category: def.category,
      unit: def.unit,
    });
  }

  // 2. Compute tool grades
  const toolGrades = computeToolGrades(results, position, sport, age);

  // 3. Find top 3 strengths (highest grades)
  const sorted = [...metricGrades].sort((a, b) => b.grade - a.grade);
  const topStrengths = sorted.slice(0, 3);

  // 4. Find top 3 limiting factors (lowest grades with causal links, excluding strengths)
  const strengthKeys = new Set(topStrengths.map(s => s.key));
  const weakest = [...metricGrades]
    .filter(m => !strengthKeys.has(m.key))
    .sort((a, b) => a.grade - b.grade);
  const limitingFactors: { metric: MetricGradeResult; blocks: string }[] = [];
  
  for (const metric of weakest) {
    if (limitingFactors.length >= 3) break;
    
    const causal = CAUSAL_LINKS[metric.key];
    const blocksMessage = causal?.message || `${metric.label} is a development priority`;
    
    limitingFactors.push({ metric, blocks: blocksMessage });
  }

  // 5. Generate training priority message
  let trainingPriority = 'Complete more metrics for a detailed training analysis.';
  
  if (limitingFactors.length > 0) {
    const topLimiter = limitingFactors[0];
    const causal = CAUSAL_LINKS[topLimiter.metric.key];
    
    if (causal) {
      trainingPriority = `Your ${topLimiter.metric.label.toLowerCase()} (${topLimiter.metric.grade}-grade, ${topLimiter.metric.gradeLabel}) is your primary limiting factor. ${causal.message}.`;
    } else {
      trainingPriority = `Focus on improving ${topLimiter.metric.label.toLowerCase()} (${topLimiter.metric.grade}-grade) — it's currently your weakest measured metric.`;
    }

    // Add tool context
    const toolEntries = (['hit', 'power', 'run', 'field', 'arm'] as ToolName[])
      .filter(t => toolGrades[t] !== null)
      .map(t => ({ tool: t, grade: toolGrades[t]! }))
      .sort((a, b) => a.grade - b.grade);
    
    if (toolEntries.length > 0 && toolEntries[0].grade < 45) {
      trainingPriority += ` Your ${TOOL_LABELS[toolEntries[0].tool]} tool (${toolEntries[0].grade}) needs the most development.`;
    }
  }

  return {
    metricGrades,
    toolGrades,
    topStrengths,
    limitingFactors,
    trainingPriority,
  };
}
