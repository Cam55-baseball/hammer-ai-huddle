export const VIDEO_SPORTS = ['baseball', 'softball'] as const;
export type VideoSport = (typeof VIDEO_SPORTS)[number];

export const VIDEO_CATEGORIES = [
  'hitting',
  'pitching',
  'throwing',
  'fielding',
  'catching',
  'baserunning',
  'strength',
  'mental',
] as const;
export type VideoCategory = (typeof VIDEO_CATEGORIES)[number];

type Taxonomy = Record<VideoSport, Record<VideoCategory, readonly string[]>>;

/**
 * Owner-facing categorical identity for a video. These are deliberately more
 * specific than the recommendation engine's four weighted layers: this branch
 * prevents illegal combinations before the weighted mechanics tags are chosen.
 */
export const VIDEO_SUB_SKILLS: Taxonomy = {
  baseball: {
    hitting: ['Bat speed', 'Contact quality', 'Swing decisions', 'Plate discipline', 'Timing', 'Pitch recognition', 'Barrel path', 'Lower-half sequencing', 'Adjustability', 'Bunting'],
    pitching: ['Fastball', 'Changeup', 'Curveball', 'Slider', 'Cutter', 'Sinker', 'Splitter', 'Command', 'Velocity', 'Tempo', 'Shoulder tilt', 'Lower-half sequencing', 'Arm action', 'Pickoffs and holds', 'Pitch design'],
    throwing: ['Arm strength', 'Throw accuracy', 'Transfer', 'Footwork', 'Long toss', 'Relays and cuts', 'Double-play feeds', 'Position-specific arm action'],
    fielding: ['First step', 'Range', 'Glove work', 'Footwork', 'Approach angle', 'Backhand', 'Forehand', 'Slow roller', 'Double plays', 'Outfield routes', 'Wall play', 'Pitcher fielding'],
    catching: ['Receiving', 'Framing', 'Blocking', 'Exchange', 'Pop time', 'Throw accuracy', 'Game calling', 'Stance and setup', 'Bunt coverage'],
    baserunning: ['Home to first', 'First to third', 'Lead', 'Secondary lead', 'Steal start', 'Reads and reactions', 'Turns', 'Sliding', 'Tagging up'],
    strength: ['Acceleration strength', 'Rotational power', 'Upper-body push', 'Upper-body pull', 'Lower-body strength', 'Single-leg strength', 'Deceleration', 'Arm care', 'Mobility', 'Recovery'],
    mental: ['Approach and routine', 'Confidence', 'Focus', 'Emotional regulation', 'Failure response', 'Game awareness', 'Visualization', 'Communication'],
  },
  softball: {
    hitting: ['Bat speed', 'Contact quality', 'Swing decisions', 'Plate discipline', 'Timing', 'Pitch recognition', 'Barrel path', 'Lower-half sequencing', 'Adjustability', 'Slap hitting', 'Bunting'],
    pitching: ['Fastball', 'Changeup', 'Rise ball', 'Drop ball', 'Curveball', 'Screwball', 'Off-speed', 'Command', 'Velocity', 'Arm circle', 'Stride direction', 'Hip-shoulder separation', 'Release consistency', 'Drive-leg force', 'Pitch design'],
    throwing: ['Arm strength', 'Throw accuracy', 'Transfer', 'Footwork', 'Long toss', 'Relays and cuts', 'Double-play feeds', 'Position-specific arm action'],
    fielding: ['First step', 'Range', 'Glove work', 'Footwork', 'Approach angle', 'Backhand', 'Forehand', 'Short-game defense', 'Double plays', 'Outfield routes', 'Wall play', 'Pitcher fielding'],
    catching: ['Receiving', 'Framing', 'Blocking', 'Exchange', 'Pop time', 'Throw accuracy', 'Game calling', 'Stance and setup', 'Short-game coverage'],
    baserunning: ['Home to first', 'First to third', 'Lead', 'Secondary lead', 'Steal start', 'Reads and reactions', 'Turns', 'Sliding', 'Tagging up'],
    strength: ['Acceleration strength', 'Rotational power', 'Upper-body push', 'Upper-body pull', 'Lower-body strength', 'Single-leg strength', 'Deceleration', 'Arm care', 'Mobility', 'Recovery'],
    mental: ['Approach and routine', 'Confidence', 'Focus', 'Emotional regulation', 'Failure response', 'Game awareness', 'Visualization', 'Communication'],
  },
};

export function subSkillsFor(sport: VideoSport | '', category: VideoCategory | ''): readonly string[] {
  if (!sport || !category) return [];
  return VIDEO_SUB_SKILLS[sport][category];
}

export function isValidVideoClassification(
  sport: string,
  category: string,
  subSkill: string,
): boolean {
  if (!VIDEO_SPORTS.includes(sport as VideoSport)) return false;
  if (!VIDEO_CATEGORIES.includes(category as VideoCategory)) return false;
  return subSkillsFor(sport as VideoSport, category as VideoCategory).includes(subSkill);
}

export function categoryToSkillDomain(category: VideoCategory): string | null {
  if (category === 'baserunning') return 'base_running';
  if (category === 'catching') return 'throwing';
  if (category === 'hitting' || category === 'pitching' || category === 'throwing' || category === 'fielding') return category;
  return null;
}