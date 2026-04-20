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
