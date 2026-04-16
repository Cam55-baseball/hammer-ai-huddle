type Direction = 'up' | 'down' | 'left' | 'right';

export function normalizeDirections(dirs: Direction[]): Direction[] {
  return [...dirs].sort() as Direction[];
}

// Raw normalized key — context-free, no semantic meaning attached
export function deriveMovementKey(dirs: Direction[]): string {
  if (dirs.length === 0) return 'straight';
  return normalizeDirections(dirs).join('_');
}

// Display-only lookup — NOT stored, used for analytics/UI labels
// Keys must match alphabetical sort order
export const PROFILE_MAP: Record<string, string> = {
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

// Kept for backward compat — delegates to deriveMovementKey
export function deriveMovementProfile(dirs: Direction[]): string {
  return deriveMovementKey(dirs);
}
