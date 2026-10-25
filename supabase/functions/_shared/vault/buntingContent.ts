import { BUNT_TYPES, BUNT_WORDING } from '../wic/buntingProgram.ts';
import type { VaultExercise } from './validateExercise.ts';
/** Owner wording is canonical content; drafts do not grant planner eligibility. */
export function buntingVaultContent(): VaultExercise[] {
  return (['R','L'] as const).flatMap(side => BUNT_TYPES.map(type => ({
    slug: `bunt_${side.toLowerCase()}_${type}`, name: BUNT_WORDING[side][type],
    how_to_one_rep: `One rep is one ${side === 'R' ? 'right-handed' : 'left-handed'} bunt attempt. ${BUNT_WORDING[side][type]}. Record whether that attempt succeeded; do not guess an unentered result.`,
    setup: 'Use a bat, ball and safe hitting space. Keep other people clear of the bat and ball.',
    cue: BUNT_WORDING[side][type], stop_if: 'Stop for pain, dizziness, fatigue or unsafe space.',
    why: 'Situational offense — practice this exact bunt type on this batting side.',
    default_sets: 1, default_reps: 5, measure_type: 'bunt_attempts', bunt_side: side, bunt_type: type,
    equipment: ['gamer_bat','open_field'], equipment_alternatives: [['baseballs'],['softballs']],
    card_type: 'hitting', catalog_category: 'hitting', sports: ['baseball','softball'],
    season_phases: ['os_q1','os_q2','os_q3','os_q4','pre_season','in_season'],
    min_age: 0, rest_rule: 'light_bat', arm_weight: 0, primer_role: 'none', intensity_class: 'low',
  })));
}