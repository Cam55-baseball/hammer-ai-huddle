/**
 * Owner Nov 5 #2: "Where are you starting from?" is cued (Level 1 drawer) ONLY when it's needed:
 *  1. any starting area for the player's program is unanswered (a new sport has no saved row → unanswered);
 *  2. no logged training for 28+ days (counted from the later of the last log and the last answer save);
 *  3. an injury was marked healed after the answers were last saved;
 *  4. the player's program changed since the answers were saved.
 * Saving the answers again clears 2–4 until a new trigger happens.
 */
export type StartingNeedReason = "unanswered" | "no_training_28" | "healed" | "program_changed";

export interface StartingNeedFacts {
  today: string; // YYYY-MM-DD
  program: string | null;
  /** null = no saved answers for this sport */
  saved: { complete: boolean; program: string | null; updatedAt: string } | null;
  lastLogDate: string | null;
  healedAts: readonly (string | null | undefined)[];
}

const day = (iso: string) => Date.parse(`${iso.slice(0, 10)}T12:00:00Z`);

export function startingPointNeed(f: StartingNeedFacts): StartingNeedReason | null {
  if (!f.program) return null; // no program → no questions at all
  if (!f.saved || !f.saved.complete) return "unanswered";
  if (f.saved.program && f.saved.program !== f.program) return "program_changed";
  const savedAt = Date.parse(f.saved.updatedAt);
  if (f.healedAts.some((h) => !!h && Date.parse(h) > savedAt)) return "healed";
  const lastActive = Math.max(savedAt, f.lastLogDate ? day(f.lastLogDate) : 0);
  if ((day(f.today) - lastActive) / 86_400_000 >= 28) return "no_training_28";
  return null;
}

export const STARTING_NEED_LINE: Record<StartingNeedReason, string> = {
  unanswered: "A few quick taps so Hammer starts you at the right level.",
  no_training_28: "You haven't logged training in 4+ weeks. Tell us where you're at now so we start you right.",
  healed: "Your injury is marked healed. Tell us where you're at now so we build back up safely.",
  program_changed: "Your program changed. Tell us where you're at for your new training.",
};
