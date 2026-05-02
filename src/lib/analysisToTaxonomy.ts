/**
 * Maps existing analysis outputs (HIE weakness clusters, outcome tags, session intent)
 * to taxonomy keys consumed by the video recommendation engine.
 */
import type { SkillDomain } from './videoRecommendationEngine';

// HIE weakness area → movement_pattern key
const HIE_AREA_TO_MOVEMENT: Record<string, string> = {
  'hands_forward': 'hands_forward_early',
  'early_extension': 'early_extension',
  'head_movement': 'head_pull_off',
  'late_barrel': 'late_barrel',
  'flat_path': 'flat_path',
  'over_rotation': 'over_rotation',
  'under_rotation': 'under_rotation',
  'weight_shift_back': 'weight_stuck_back',
  'weight_leak': 'weight_leak_forward',
  'first_step': 'slow_first_step',
  'glove_drift': 'glove_drift',
  'arm_lag': 'arm_lag',
};

export function mapHIEAreaToMovement(area: string): string | null {
  const k = area.toLowerCase().replace(/[\s-]/g, '_');
  return HIE_AREA_TO_MOVEMENT[k] || null;
}

// outcomeTags.ts ID → result key
const OUTCOME_TO_RESULT: Record<string, string> = {
  'roll_over': 'roll_over_contact',
  'roll_over_contact': 'roll_over_contact',
  'weak': 'weak_contact',
  'weak_contact': 'weak_contact',
  'jam': 'jam_shot',
  'pop_up': 'pop_up',
  'popup': 'pop_up',
  'line_drive': 'hard_line_drive',
  'hard_line_drive': 'hard_line_drive',
  'barrel': 'barrel',
  'opposite_field': 'opposite_field_flare',
  'ground_ball': 'ground_ball_middle',
  'whiff': 'missed_pitch',
  'miss': 'missed_pitch',
  'booted': 'booted_ball',
  'late_throw': 'late_throw',
  'offline': 'offline_throw',
};

export function mapOutcomeToResult(tag: string): string | null {
  return OUTCOME_TO_RESULT[tag.toLowerCase()] || null;
}

// Session context → context keys
export interface SessionContext {
  pitchType?: string;
  pitchLocation?: string;
  count?: string;
  runnersOn?: boolean;
  velocity?: 'low' | 'medium' | 'high';
  pressure?: boolean;
  fatigue?: boolean;
}

export function mapSessionContext(ctx: SessionContext): string[] {
  const out: string[] = [];
  if (ctx.count?.includes('2')) out.push('two_strike');
  if (ctx.runnersOn) out.push('risp');
  if (ctx.velocity === 'high') out.push('high_velocity');
  if (ctx.pitchType?.match(/curve|slider|breaking/i)) out.push('breaking_ball');
  if (ctx.pitchLocation === 'inside') out.push('inside_pitch');
  if (ctx.pitchLocation === 'outside') out.push('outside_pitch');
  if (ctx.pitchLocation === 'high') out.push('high_pitch');
  if (ctx.pitchLocation === 'low') out.push('low_pitch');
  if (ctx.pressure) out.push('game_pressure');
  if (ctx.fatigue) out.push('fatigue_state');
  return out;
}

// Skill module → skill domain
export function moduleToSkillDomain(module: string): SkillDomain | null {
  const m = module.toLowerCase();
  if (m.includes('hit')) return 'hitting';
  if (m.includes('field')) return 'fielding';
  if (m.includes('throw')) return 'throwing';
  if (m.includes('base') || m.includes('run')) return 'base_running';
  if (m.includes('pitch')) return 'pitching';
  return null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Aggregation helpers — single mapper for both post-session and long-term
// ──────────────────────────────────────────────────────────────────────────────

interface DrillBlockLike {
  drill_type?: string;
  drill_name?: string;
  intent?: string;
  execution_grade?: number;
  outcome_tags?: string[];
  detected_issues?: string[];
  micro_layer_data?: any[];
}

interface SessionLike {
  module?: string | null;
  session_type?: string | null;
  drill_blocks?: any;
  session_context?: any;
  detected_issues?: string[] | null;
  throwing_hand_used?: string | null;
  batting_side_used?: string | null;
}

export interface AggregatedTaxonomy {
  skillDomain: SkillDomain | null;
  movementPatterns: string[];
  resultTags: string[];
  contextTags: string[];
}

/** Aggregate a single saved session's signals into taxonomy keys. */
export function aggregateSessionToTaxonomy(session: SessionLike): AggregatedTaxonomy {
  const skillDomain = moduleToSkillDomain(session.module || session.session_type || '');
  const blocks: DrillBlockLike[] = Array.isArray(session.drill_blocks) ? session.drill_blocks : [];

  // Movement: bottom-graded blocks + any detected_issues at session level
  const sortedByGrade = [...blocks]
    .filter(b => typeof b.execution_grade === 'number')
    .sort((a, b) => (a.execution_grade ?? 100) - (b.execution_grade ?? 100));
  const lowGradeBlocks = sortedByGrade.slice(0, 2);

  const movementSet = new Set<string>();
  for (const b of lowGradeBlocks) {
    for (const issue of b.detected_issues || []) {
      const k = mapHIEAreaToMovement(issue);
      if (k) movementSet.add(k);
    }
    // Fall back to drill_type as a movement hint
    if (b.drill_type) {
      const k = mapHIEAreaToMovement(b.drill_type);
      if (k) movementSet.add(k);
    }
  }
  for (const issue of session.detected_issues || []) {
    const k = mapHIEAreaToMovement(issue);
    if (k) movementSet.add(k);
  }

  // Result: top-3 most frequent outcome tags across all blocks
  const counts = new Map<string, number>();
  for (const b of blocks) {
    for (const tag of b.outcome_tags || []) {
      const k = mapOutcomeToResult(tag);
      if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  const resultTags = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);

  // Context: from session_context + handedness/side
  const ctx: SessionContext = (session.session_context && typeof session.session_context === 'object')
    ? session.session_context as SessionContext
    : {};
  const contextTags = mapSessionContext(ctx);

  return {
    skillDomain,
    movementPatterns: [...movementSet],
    resultTags,
    contextTags,
  };
}

/** Aggregate weakness_clusters + recent sessions into long-term taxonomy signals. */
export function aggregateWeaknessClustersToTaxonomy(
  skillDomain: SkillDomain,
  weaknessClusters: any,
  recentSessions: SessionLike[] = []
): AggregatedTaxonomy {
  const movementSet = new Set<string>();

  // weakness_clusters jsonb shape: array of { area, severity } or { metric, score }
  const clusters = Array.isArray(weaknessClusters) ? weaknessClusters : [];
  for (const c of clusters.slice(0, 5)) {
    const area = c?.area || c?.metric || c?.weakness_metric;
    if (typeof area === 'string') {
      const k = mapHIEAreaToMovement(area);
      if (k) movementSet.add(k);
    }
  }

  // Roll-up of recent sessions for result + context signals
  const counts = new Map<string, number>();
  const ctxSet = new Set<string>();
  for (const s of recentSessions) {
    const agg = aggregateSessionToTaxonomy(s);
    if (agg.skillDomain && agg.skillDomain !== skillDomain) continue;
    agg.movementPatterns.forEach(m => movementSet.add(m));
    agg.resultTags.forEach(r => counts.set(r, (counts.get(r) ?? 0) + 1));
    agg.contextTags.forEach(c => ctxSet.add(c));
  }

  const resultTags = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([k]) => k);

  return {
    skillDomain,
    movementPatterns: [...movementSet].slice(0, 5),
    resultTags,
    contextTags: [...ctxSet].slice(0, 4),
  };
}
