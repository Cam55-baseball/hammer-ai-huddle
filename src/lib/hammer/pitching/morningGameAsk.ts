/**
 * Decide what the morning check-in should ask about yesterday's games and
 * pitching. Pure so the rule is testable; the UI only renders what this says.
 * Shared "asked" rule with Hammers Today's game prompt
 * (GameLogPromptCard): each user+date is asked once, in either place.
 */
export interface MorningGameAskState {
  /** Any game or calendar game event exists for yesterday. */
  hasYesterdayGame: boolean;
  /** Yesterday's game already has a final log. */
  yesterdayLogged: boolean;
  /** Morning/Hammers-Today already asked about yesterday (asked-once key). */
  askedBefore: boolean;
  /** Athlete pitches (profile or position says so). */
  isPitcher: boolean;
  /** There is already a thrown outing dated yesterday. */
  yesterdayPitchThrown: boolean;
}

export interface MorningGameAskDecision {
  askGame: boolean;
  askPitch: boolean;
}

export function decideMorningGameAsk(s: MorningGameAskState): MorningGameAskDecision {
  if (s.askedBefore) return { askGame: false, askPitch: false };
  return {
    askGame: s.hasYesterdayGame && !s.yesterdayLogged,
    askPitch: s.isPitcher && !s.yesterdayPitchThrown,
  };
}

/** Same key GameLogPromptCard uses, so answering in either place counts. */
export function gameLogAskedKey(userId: string | null | undefined, date: string): string {
  return `hm.gameLogAsked.${userId}.${date}`;
}
