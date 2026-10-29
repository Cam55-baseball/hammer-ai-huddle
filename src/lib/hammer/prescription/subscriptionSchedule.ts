import { priorityAccess } from '../priorityAccess';

/** Purchased program authorizes skills, never arm dose or injury overrides. */
export function subscriptionSchedule(modules: readonly string[], sport: 'baseball'|'softball') {
  const access = priorityAccess(modules, sport);
  const pitcher = modules.includes(`${sport}_pitcher`);
  const position = modules.includes(`${sport}_5tool`) || modules.includes(`${sport}_golden2way`) || (access.hasHitting&&access.hasThrowing);
  return { ...access, pitcherOnly: (pitcher || access.hasPitching) && !position && !access.hasHitting,
    hasDefense: pitcher || position || access.hasThrowing, hasBaserunning: position,
    hasBunting: position, hasPitching: access.hasPitching };
}