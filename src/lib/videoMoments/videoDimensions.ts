/**
 * Owner Nov 2: cross-cutting video dimensions. Values live in the owner-editable
 * `video_tag_dimension_values` table; a video carries them as `dim:<dimension>:<key>`
 * entries in its existing `tags` array (player-readable, no second storage).
 * Gating dimensions: a video that names values only shows to players who match one.
 */
export const VIDEO_DIMENSIONS = {
  position: 'Position',
  pitcher_role: 'Pitching role',
  program: 'Program',
  level: 'Level',
  progression: 'Progression level',
  training_context: 'Training context',
  pitch_source: 'Pitch source',
  bunt_type: 'Bunt type',
  bunt_side: 'Bunt side',
  purpose: 'Video purpose',
} as const;
export type VideoDimension = keyof typeof VIDEO_DIMENSIONS;
/** Dimensions that restrict who sees a video. The rest describe the video only. */
export const GATING_DIMENSIONS = ['position', 'pitcher_role', 'program', 'level', 'progression'] as const;
export type GatingDimension = typeof GATING_DIMENSIONS[number];

export const dimTag = (dimension: string, key: string) => `dim:${dimension}:${key}`;
export function dimValues(tags: readonly string[], dimension: string): string[] {
  const prefix = `dim:${dimension}:`;
  return tags.filter(tag => tag.startsWith(prefix)).map(tag => tag.slice(prefix.length));
}

export type PlayerDimensions = Partial<Record<GatingDimension, string[]>>;

/** True when every gating dimension the video names includes one of the player's values.
 *  Unknown player values never match a restricted video (no spill-over). */
export function passesDimensions(tags: readonly string[], player: PlayerDimensions): boolean {
  return GATING_DIMENSIONS.every(dimension => {
    const wanted = dimValues(tags, dimension);
    if (!wanted.length) return true;
    return (player[dimension] ?? []).some(value => wanted.includes(value));
  });
}

const POSITION_GROUP_TO_DIM: Record<string, string> = {
  pitcher: 'pitcher', catcher: 'catcher', first_base: 'infielder', middle_infield: 'infielder', third_base: 'infielder',
  corner_outfield: 'outfielder', center_field: 'outfielder',
};
/** Everyone hits and runs; field groups come from the shared position mapper. */
export function positionDims(groups: readonly string[], pitches: boolean): string[] {
  const out = new Set(['hitter', 'runner']);
  for (const group of groups) if (POSITION_GROUP_TO_DIM[group]) out.add(POSITION_GROUP_TO_DIM[group]);
  if (pitches) out.add('pitcher');
  return [...out];
}
export function levelDims(experience: string | null | undefined): { level: string[]; progression: string[] } {
  const t = (experience ?? '').toLowerCase().replace(/[\s-]+/g, '_');
  const level = t.includes('middle') || t.includes('youth') ? ['youth'] : t.includes('high') ? ['high_school']
    : t.includes('college') ? ['college'] : t.includes('pro') ? ['pro'] : [];
  const progression = ['beginner', 'intermediate', 'advanced', 'professional'].filter(key => t === key);
  return { level, progression };
}
