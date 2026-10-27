export const SKILL_AREAS = ['hitting', 'bat_speed', 'bunting', 'pitching', 'throwing', 'defense', 'baserunning', 'conditioning'] as const;
export const ROUTINE_ROLES = ['routine', 'fix_it', 'prep'] as const;
export const BAT_SPEED_KINDS = ['weighted', 'overspeed', 'standard'] as const;

/** Tags describe the owner's intent; they confer no efficacy or dose authority. */
export function validDrillRoleTags(row: { skill_area?: string | null; routine_role?: string | null; bat_speed_kind?: string | null }): boolean {
  return (!row.skill_area || SKILL_AREAS.some(value => value === row.skill_area))
    && (!row.routine_role || ROUTINE_ROLES.some(value => value === row.routine_role))
    && (!row.bat_speed_kind || (row.skill_area === 'bat_speed' && BAT_SPEED_KINDS.some(value => value === row.bat_speed_kind)));
}