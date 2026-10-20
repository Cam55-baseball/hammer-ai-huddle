/** Explicit catalog eligibility for existing non-throwing live read reps.
 * Names are catalog identities, not a pattern that can promote arbitrary owner work.
 * Missing identities stay skill drills. This never grants throwing permission.
 */
const FIELDING_READS = new Set([
  'Short-hop blocking angles',
  'Blocking recovery to ball',
  'Block-and-recover',
  'Blocking — screwball/drop',
  'Slapper block-and-recover',
  'Comebacker glove work',
  'Cover 1B on 3-6-1 / 3-6-3',
  'Cover 1B on 3-6-1',
  'Pick footwork — stretch to all angles',
  'Stretch & pick — 4 angles',
  'Stretch — 4 angles',
  'Stretch to all angles',
  'Backhand & forehand range',
  'Backhand range',
  'Backhand primer',
  'Slow-roller barehand',
  'Slap read + barehand',
  'Slap barehand primer',
  'Backhand at the line',
  'Backhand down the line',
  'In-between hop reads',
  'Crossover first step',
  'Gap reads with wing (LF & RF)',
  'Rise-ball tracking',
  'Rise-ball tracking primer',
  'Slap-hit read — soft line drive in front',
]);

export function defenseExecutionKind(name: string): 'fielding_reads' | undefined {
  return FIELDING_READS.has(name) ? 'fielding_reads' : undefined;
}