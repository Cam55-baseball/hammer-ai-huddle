/** Owner Oct 31: pitcher/position focus, pitching role and "Limit my pitching".
 *  The player's answer maps onto the EXISTING schedule role (starter / reliever) so the
 *  existing outing, recovery, bullpen and arm-ledger logic consumes it unchanged. */
export type PrimaryFocus = 'pitcher' | 'position';
export type PitchingRoleAnswer = 'starter' | 'bullpen' | 'closer';

export const FOCUS_LABEL: Record<PrimaryFocus, string> = { pitcher: 'Mainly pitcher', position: 'Mainly position player' };
export const ROLE_LABEL: Record<PitchingRoleAnswer, string> = { starter: 'Starter', bullpen: 'Bullpen arm', closer: 'Closer' };

export function scheduleRoleFor(role: PitchingRoleAnswer | null | undefined): 'starter' | 'reliever' | null {
  if (!role) return null;
  return role === 'starter' ? 'starter' : 'reliever';
}

/** Does this player pitch? Complete Pitcher / Golden 2Way plans, or a "mainly pitcher" answer. */
export function playerPitches(modules: readonly string[], focus: PrimaryFocus | null | undefined): boolean {
  return focus === 'pitcher' || modules.some(m => /(pitching|pitcher|golden2way)/.test(m));
}

export interface RoleChange { primary_focus?: PrimaryFocus; pitching_role?: PitchingRoleAnswer; limit_pitching?: boolean }

/** Tell Hammers in words. Returns null when the message isn't about pitching role. */
export function parseRoleMessage(text: string): RoleChange | null {
  const t = text.toLowerCase();
  const out: RoleChange = {};
  if (/\b(stop|don'?t|do not|no longer|remove|turn off|un-?limit)\b.*\blimit(ing)? my pitching\b|\bfull pitching\b/.test(t)) out.limit_pitching = false;
  else if (/\blimit(ing)? (my )?pitch(ing|es)?\b|\bpitch less\b|\bless pitching\b/.test(t)) out.limit_pitching = true;
  if (/\bmainly (a )?pitcher\b|\bmostly (a )?pitcher\b|\bpitcher first\b/.test(t)) out.primary_focus = 'pitcher';
  else if (/\bmainly (a )?position( player)?\b|\bmostly (a )?position( player)?\b|\bposition player first\b/.test(t)) out.primary_focus = 'position';
  if (/\bcloser\b/.test(t)) out.pitching_role = 'closer';
  else if (/\b(bullpen arm|reliever|relief pitcher|out of the bullpen|in the bullpen)\b/.test(t)) out.pitching_role = 'bullpen';
  else if (/\b(starter|starting pitcher|i start)\b/.test(t)) out.pitching_role = 'starter';
  return Object.keys(out).length ? out : null;
}

export function describeRoleChange(c: RoleChange): string {
  const parts: string[] = [];
  if (c.primary_focus) parts.push(FOCUS_LABEL[c.primary_focus]);
  if (c.pitching_role) parts.push(`Pitching role: ${ROLE_LABEL[c.pitching_role]}`);
  if (c.limit_pitching !== undefined) parts.push(c.limit_pitching ? 'Limit my pitching: on' : 'Limit my pitching: off');
  return parts.join(' · ');
}
