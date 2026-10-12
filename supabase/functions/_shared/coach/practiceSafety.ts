// Coach-scheduled practice safety check (Plan v3.1 §4 "Send workouts and practices").
// Pure. Uses only rules the app already enforces elsewhere:
//  - the player's own rest day stays a rest day;
//  - game day: only light practice (hard work is kept off game days);
//  - in season, no high-intensity practice the day before a game;
//  - throwing waits for the Pitch Smart rest date (nextThrowDate).
// It never changes the practice by itself — it explains and offers a safe alternative.

export type PracticeIntensity = "light" | "standard" | "high";

export interface PracticeFacts {
  date: string; // YYYY-MM-DD
  intensity: PracticeIntensity;
  throwing: boolean;
  isRestDay: boolean;
  gameOnDate: boolean;
  gameNextDay: boolean;
  inSeason: boolean;
  /** First date throwing is allowed again (Pitch Smart); null = no limit known/applies. */
  nextThrowDate: string | null;
}

export interface PracticeAlternative {
  intensity?: PracticeIntensity;
  throwing?: boolean;
  date?: string;
  text: string;
}

export interface PracticeSafetyResult {
  ok: boolean;
  reasons: string[];
  alternative: PracticeAlternative | null;
}

export function checkPracticeSafety(f: PracticeFacts, nextOpenDate: string | null = null): PracticeSafetyResult {
  const reasons: string[] = [];
  const alt: PracticeAlternative = { text: "" };
  const altText: string[] = [];

  if (f.isRestDay) {
    reasons.push("This is the player's rest day.");
    if (nextOpenDate) { alt.date = nextOpenDate; altText.push(`move it to ${nextOpenDate}`); }
    else altText.push("pick another day");
  }
  if (!f.isRestDay && f.gameOnDate && f.intensity !== "light") {
    reasons.push("The player has a game that day — only a light practice is allowed.");
    alt.intensity = "light"; altText.push("make it a light practice");
  }
  if (!f.isRestDay && !f.gameOnDate && f.inSeason && f.gameNextDay && f.intensity === "high") {
    reasons.push("In season, no hard practice the day before a game.");
    alt.intensity = "standard"; altText.push("make it a standard practice");
  }
  if (!f.isRestDay && f.throwing && f.nextThrowDate && f.date < f.nextThrowDate) {
    reasons.push(`The player's arm needs rest from throwing until ${f.nextThrowDate} (pitch-count rest rule).`);
    alt.throwing = false; altText.push(`leave out throwing (or schedule it on ${f.nextThrowDate})`);
  }

  if (reasons.length === 0) return { ok: true, reasons, alternative: null };
  alt.text = `Safe option: ${altText.join(" and ")}.`;
  return { ok: false, reasons, alternative: alt };
}
