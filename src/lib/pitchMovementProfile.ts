type Direction = 'up' | 'down' | 'left' | 'right';

export type MovementKey =
  | 'straight' | 'up' | 'down' | 'left' | 'right'
  | 'down_left' | 'down_right' | 'left_up' | 'right_up';

export function normalizeDirections(dirs: Direction[]): Direction[] {
  return [...dirs].sort() as Direction[];
}

// Raw normalized key — context-free, no semantic meaning attached
export function deriveMovementKey(dirs: Direction[]): MovementKey {
  if (dirs.length === 0) return 'straight';
  return normalizeDirections(dirs).join('_') as MovementKey;
}

// Display-only lookup — NOT stored, used for analytics/UI labels
// Keys must match alphabetical sort order
export const PROFILE_MAP: Record<MovementKey, string> = {
  'down_right': 'arm_side_sink',
  'down_left': 'glove_side_run',
  'right_up': 'ride_arm_side',
  'left_up': 'cut_ride',
  'down': 'vertical_drop',
  'up': 'rise',
  'left': 'glove_side',
  'right': 'arm_side',
  'straight': 'straight',
};

/** @deprecated Use deriveMovementKey instead — this alias will be removed */
export function deriveMovementProfile(dirs: Direction[]): string {
  return deriveMovementKey(dirs);
}
