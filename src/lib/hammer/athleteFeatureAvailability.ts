/**
 * Game IQ release switch. OFF (owner correction, 2026-10-19): Game IQ is
 * defective and internal-only. Only owner and admin accounts see it, with an
 * "Internal — not released" label (see useGameIqAccess). Players, parents,
 * coaches, organizations and scouts see no Game IQ anywhere.
 * Only the owner turns this on. Subscription checks remain separate.
 */
export const GAME_IQ_AVAILABLE_TO_ATHLETES = false;

export function gameIqVisible(roles: { isOwner: boolean; isAdmin: boolean }): boolean {
  return GAME_IQ_AVAILABLE_TO_ATHLETES || roles.isOwner || roles.isAdmin;
}
