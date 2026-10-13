// Coach game and practice logging (owner decision 2026-10-13). The server re-checks all of this.
export interface LineupSpot { athlete_id: string; jersey: string; name: string }
export type GuardResult = { ok: boolean; athleteId?: string; reason?: string };

/** Option 1: the page is locked to one player; the save must name that same player. */
export function guardSinglePlayer(lockedId: string | null | undefined, confirmId: string | null | undefined): GuardResult {
  if (!lockedId) return { ok: false, reason: "No player is locked on this page." };
  if (confirmId !== lockedId) return { ok: false, reason: "Wrong player — this entry is not for the player at the top." };
  return { ok: true, athleteId: lockedId };
}

/** Option 2: tapped jersey + the name the coach confirmed must point to the same lineup player. */
export function guardLineupPlay(lineup: LineupSpot[], tappedJersey: string | null, confirmedAthleteId: string | null): GuardResult {
  if (!tappedJersey) return { ok: false, reason: "Tap the player's jersey number first." };
  const spot = lineup.find((s) => s.jersey === tappedJersey);
  if (!spot) return { ok: false, reason: `No player wears #${tappedJersey} in this lineup.` };
  if (!confirmedAthleteId) return { ok: false, reason: `Confirm the name for #${tappedJersey}.` };
  if (confirmedAthleteId !== spot.athlete_id) return { ok: false, reason: `Wrong player — #${tappedJersey} is ${spot.name}.` };
  return { ok: true, athleteId: spot.athlete_id };
}

export const STAT_FIELDS = [
  { key: "ab", label: "At-bats" }, { key: "hits", label: "Hits" }, { key: "rbi", label: "RBI" },
  { key: "bb", label: "Walks" }, { key: "so", label: "Strikeouts" }, { key: "runs", label: "Runs" },
  { key: "sb", label: "Stolen bases" }, { key: "pitches", label: "Pitches thrown" },
  { key: "position_throws", label: "Hard throws from a position" },
] as const;

/** Keeps only whole numbers 0–300; blanks are left out (never saved as 0). */
export function cleanStats(input: Record<string, string>): { stats: Record<string, number>; error: string | null } {
  const stats: Record<string, number> = {};
  for (const f of STAT_FIELDS) {
    const raw = (input[f.key] ?? "").trim();
    if (!raw) continue;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0 || n > 300) return { stats, error: `${f.label} must be a whole number from 0 to 300.` };
    stats[f.key] = n;
  }
  if ((stats.hits ?? 0) > (stats.ab ?? 0)) return { stats, error: "Hits can't be more than at-bats." };
  if (Object.keys(stats).length === 0) return { stats, error: "Enter at least one number." };
  return { stats, error: null };
}

export const ENTRY_STATUS_LABEL: Record<string, string> = {
  pending: "Waiting for the player to confirm", confirmed: "Confirmed by the player",
  flagged: "Flagged by the player — kept out of ratings", undone: "Undone by the coach",
};
