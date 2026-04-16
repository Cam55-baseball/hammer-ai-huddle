type Direction = 'up' | 'down' | 'left' | 'right';

export function normalizeDirections(dirs: Direction[]): Direction[] {
  return [...dirs].sort() as Direction[];
}

const PROFILE_MAP: Record<string, string> = {
  'down_right': 'arm_side_sink',
  'down_left': 'glove_side_run',
  'up_right': 'ride_arm_side',
  'left_up': 'cut_ride',
  'down': 'vertical_drop',
  'up': 'rise',
  'left': 'glove_side',
  'right': 'arm_side',
};

export function deriveMovementProfile(dirs: Direction[]): string | undefined {
  if (dirs.length === 0) return undefined;
  const key = normalizeDirections(dirs).join('_');
  return PROFILE_MAP[key] ?? 'unknown';
}
