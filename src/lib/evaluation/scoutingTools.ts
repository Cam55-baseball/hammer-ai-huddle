/**
 * Canonical scouting-report tool catalog.
 *
 * One source of truth shared by the evaluation form and every report reader,
 * so a label never drifts between where a grade is entered and where it is read.
 *
 * Position rule: `defense_grade` and `throwing_grade` on a report row are grades
 * AT `position_evaluated` on that row — not one career-wide number. A player
 * accumulates position-specific defense/arm marks by filing looks at different
 * positions; aggregation groups on `position_evaluated`.
 */

export interface ToolDef {
  key: string;
  label: string;
  hint: string;
}

export interface ToolGroup {
  id: string;
  title: string;
  description: string;
  tools: ToolDef[];
}

/** Grades that are only meaningful alongside a position look. */
export const POSITION_BOUND_KEYS = ['defense_grade', 'throwing_grade'] as const;

/**
 * Positions a POSITION-PLAYER look can be filed at.
 *
 * 'P' is deliberately absent: pitching is its own set of tools with its own
 * section on the report, so a pitcher look is never a "position seen" entry.
 */
export const POSITION_OPTIONS = [
  'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'UTIL',
] as const;

/**
 * Offensive tools that genuinely differ by batting side. When a switch hitter
 * was seen from both sides, these are graded once per side; everything else on
 * the report stays a single number (a player has one frame, one motor).
 */
export const SIDE_SPLIT_KEYS = [
  'hitting_grade',
  'power_grade',
  'plate_discipline_grade',
] as const;

export type BatSide = 'R' | 'L';

export const BAT_SIDE_LABELS: Record<BatSide, string> = {
  R: 'Right-handed AB',
  L: 'Left-handed AB',
};

const HITTING_TOOLS: ToolDef[] = [
  { key: 'hitting_grade', label: 'Hit', hint: 'Bat-to-ball, approach, contact quality' },
  { key: 'power_grade', label: 'Power', hint: 'Raw and game power' },
  { key: 'plate_discipline_grade', label: 'Plate Discipline', hint: 'Pitch recognition, lays off out-of-zone, draws walks' },
  { key: 'speed_grade', label: 'Run', hint: 'Home-to-first, underway speed' },
];

const DEFENSE_TOOLS: ToolDef[] = [
  { key: 'defense_grade', label: 'Defense', hint: 'Actions, hands, footwork, instincts — at the position seen' },
  { key: 'throwing_grade', label: 'Arm', hint: 'Arm strength, carry, accuracy — at the position seen' },
];

const PHYSICAL_MAKEUP_TOOLS: ToolDef[] = [
  { key: 'eye_test_grade', label: 'Eye Test / Projection', hint: 'Height, weight, athleticism, room on the frame, presence' },
  { key: 'hustle_grade', label: 'Hustle', hint: 'Effort level, plays through the whistle' },
  { key: 'game_iq_grade', label: 'Game IQ', hint: 'Extra base on a bobble, positioning, situational reads' },
  { key: 'mental_makeup_grade', label: 'Mental Makeup', hint: 'Sportsmanship, work ethic, coachability, handles failure' },
  { key: 'self_efficacy_grade', label: 'Competitiveness', hint: 'Self-belief, response to failure' },
  { key: 'leadership_grade', label: 'Leadership', hint: 'Presence, dugout/field impact' },
];

const PITCH_ARSENAL_TOOLS: ToolDef[] = [
  { key: 'fastball_grade', label: 'Fastball', hint: 'Velocity, life, plane' },
  { key: 'offspeed_grade', label: 'Offspeed', hint: 'Changeup / drop-change separation' },
  { key: 'breaking_ball_grade', label: 'Breaking Ball', hint: 'Shape, tilt, sharpness' },
  { key: 'control_grade', label: 'Control / Command', hint: 'Strikes and location within zone' },
];

const RISE_BALL_TOOL: ToolDef = {
  key: 'rise_ball_grade',
  label: 'Rise Ball',
  hint: 'Late lift, spin quality (softball)',
};

const PITCHER_CRAFT_TOOLS: ToolDef[] = [
  { key: 'pitchability_grade', label: 'Pitchability', hint: 'Sequencing, changing speeds, keeping hitters off balance' },
  { key: 'delivery_arm_action_grade', label: 'Delivery & Arm Action', hint: 'Clean, repeatable, low-stress — durability proxy' },
  { key: 'deception_grade', label: 'Deception', hint: 'Hidden release, unorthodox look that disguises velo/pitch type' },
];

const PITCHER_PHYSICAL_TOOLS: ToolDef[] = [
  { key: 'body_type_frame_grade', label: 'Body Type / Frame', hint: 'Pitcher-specific physical projection' },
  { key: 'poise_competitiveness_grade', label: 'Poise & Competitiveness', hint: 'Composure in high-stress counts, handles adversity' },
  { key: 'leadership_grade', label: 'Leadership', hint: 'Staff and clubhouse impact' },
];

export function positionPlayerGroups(): ToolGroup[] {
  return [
    { id: 'offense', title: 'Offense', description: 'Bat and legs.', tools: HITTING_TOOLS },
    {
      id: 'defense',
      title: 'Defense',
      description: 'Graded at the position you selected above.',
      tools: DEFENSE_TOOLS,
    },
    {
      id: 'physical-makeup',
      title: 'Physical & Makeup',
      description: 'Projection, effort, instincts, and character.',
      tools: PHYSICAL_MAKEUP_TOOLS,
    },
  ];
}

export function pitchingGroups(sport: string): ToolGroup[] {
  const arsenal =
    sport === 'softball'
      ? [...PITCH_ARSENAL_TOOLS.slice(0, 3), RISE_BALL_TOOL, PITCH_ARSENAL_TOOLS[3]]
      : PITCH_ARSENAL_TOOLS;
  return [
    { id: 'arsenal', title: 'Arsenal', description: 'Each pitch and the command of it.', tools: arsenal },
    {
      id: 'craft',
      title: 'Pitching Craft',
      description: 'How the stuff plays: sequencing, delivery, deception.',
      tools: PITCHER_CRAFT_TOOLS,
    },
    {
      id: 'physical-makeup',
      title: 'Physical & Makeup',
      description: 'Frame, composure, and impact on a staff.',
      tools: PITCHER_PHYSICAL_TOOLS,
    },
  ];
}

export function groupsFor(gradeType: string, sport: string): ToolGroup[] {
  return gradeType === 'pitching' ? pitchingGroups(sport) : positionPlayerGroups();
}

/** Flat, de-duplicated tool list for a report type. */
export function toolsFor(gradeType: string, sport: string): ToolDef[] {
  const seen = new Set<string>();
  const out: ToolDef[] = [];
  for (const g of groupsFor(gradeType, sport)) {
    for (const t of g.tools) {
      if (seen.has(t.key)) continue;
      seen.add(t.key);
      out.push(t);
    }
  }
  return out;
}

/** Every label the app knows, for read-only report rendering. */
export const TOOL_LABELS: Record<string, string> = Object.fromEntries(
  [
    ...HITTING_TOOLS,
    ...DEFENSE_TOOLS,
    ...PHYSICAL_MAKEUP_TOOLS,
    ...PITCH_ARSENAL_TOOLS,
    RISE_BALL_TOOL,
    ...PITCHER_CRAFT_TOOLS,
    ...PITCHER_PHYSICAL_TOOLS,
    // Legacy column kept for historical reports filed before the split.
    { key: 'delivery_grade', label: 'Delivery (legacy)', hint: '' },
  ].map((t) => [t.key, t.label]),
);

/** Stable display order for read-only report rendering. */
export const TOOL_DISPLAY_ORDER: string[] = [
  ...HITTING_TOOLS,
  ...DEFENSE_TOOLS,
  ...PITCH_ARSENAL_TOOLS,
  RISE_BALL_TOOL,
  ...PITCHER_CRAFT_TOOLS,
  ...PHYSICAL_MAKEUP_TOOLS,
  ...PITCHER_PHYSICAL_TOOLS,
  { key: 'delivery_grade', label: '', hint: '' },
]
  .map((t) => t.key)
  .filter((k, i, a) => a.indexOf(k) === i);

/**
 * A report can carry position-player tools, pitching tools, or both (two-way).
 * `grade_type` stays the coarse label so existing readers keep working; the
 * boolean section flags on the row are the precise truth.
 */
export function deriveGradeType(opts: {
  includesPositionTools: boolean;
  includesPitchingTools: boolean;
}): 'hitting_throwing' | 'pitching' | 'two_way' {
  if (opts.includesPositionTools && opts.includesPitchingTools) return 'two_way';
  return opts.includesPitchingTools ? 'pitching' : 'hitting_throwing';
}

/** Human label for a report's coverage. */
export function reportTypeLabel(gradeType: string | null | undefined): string {
  if (gradeType === 'two_way') return 'Two-way report';
  if (gradeType === 'pitching') return 'Pitching report';
  return 'Position player report';
}

/** Average of the graded sides, or null when neither side was graded. */
export function blendSides(a: number | null, b: number | null): number | null {
  const vals = [a, b].filter((v): v is number => typeof v === 'number');
  if (vals.length === 0) return null;
  return Math.round(vals.reduce((x, y) => x + y, 0) / vals.length);
}
