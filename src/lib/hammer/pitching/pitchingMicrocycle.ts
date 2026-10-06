/**
 * Weekly Pitching Microcycle — pure, replay-safe.
 *
 * Given the athlete's sport, role, rung, quarter, and pitcher profile,
 * returns a 7-day plan of pitching day-types and the day-type for TODAY.
 *
 * Doctrine:
 *   - Foundation rung never gets Start days. Only Touch / Side.
 *   - Bridge unlocks Live BP and Start.
 *   - Peak / Sustain follow full pro-style rotations.
 *   - Baseball starters get a 5-day rotation. Baseball relievers get a
 *     capacity-based availability plan. Softball starters follow a shorter
 *     tolerance cycle (higher weekly frequency, lower per-outing intensity).
 *   - Post-season / off-season Q1 = pen-heavy build; in-season = protect the
 *     next outing.
 *   - Game-day and day-before-game override to "Game" / "Touch".
 */
import type { RoadmapRung } from "@/lib/hammer/roadmap/roadmapLadder";
import type { QuarterDescriptor } from "@/lib/hammer/roadmap/seasonQuarters";
import type { PitcherProfile } from "./pitcherProfile";
import { resolveOutingFacts, type PitcherSettingsRow, type PitcherOutingRow, type PitcherAvailabilityRow } from "../../../../supabase/functions/_shared/wic/pitching/outingFacts";

export type PitcherDayType =
  | "start"
  | "bullpen"
  | "side"
  | "touch"
  | "long_toss"
  | "flush"
  | "fielding_only"
  | "rest"
  | "available"    // reliever, ready to pitch in a game
  | "game";        // scheduled game today

export interface PitcherDay {
  readonly dow: number;               // 0..6, JS getDay()
  readonly dayType: PitcherDayType;
  readonly headline: string;
  readonly detail: string;
}

export interface PitchingMicrocycle {
  readonly week: ReadonlyArray<PitcherDay>;
  readonly today: PitcherDay;
  readonly weekLabel: string;
}

const DOW_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function labelFor(t: PitcherDayType): { headline: string; detail: string } {
  switch (t) {
    case "start":         return { headline: "Start",         detail: "Compete on the mound today." };
    case "bullpen":       return { headline: "Bullpen",       detail: "Structured pen — build the outing." };
    case "side":          return { headline: "Side / Touch",  detail: "Short mound work at feel intensity." };
    case "touch":         return { headline: "Touch-and-feel",detail: "10–15 easy pitches, no radar chase." };
    case "long_toss":     return { headline: "Long toss",     detail: "Distance ladder + pulldowns if unlocked." };
    case "flush":         return { headline: "Flush / recover",detail: "Recovery throws + arm care. No mound." };
    case "fielding_only": return { headline: "PFP + catch play",detail: "Fielding routine, no bullpen work." };
    case "rest":          return { headline: "Full rest",     detail: "No throwing. Sleep is the workout." };
    case "available":     return { headline: "Available",     detail: "Reliever ready. Warm on demand only." };
    case "game":          return { headline: "Game day",      detail: "Compete — plan is subordinate to the game." };
  }
}

function mkDay(dow: number, t: PitcherDayType): PitcherDay {
  const { headline, detail } = labelFor(t);
  return { dow, dayType: t, headline, detail };
}

interface Input {
  readonly sport: "baseball" | "softball";
  readonly rung: RoadmapRung;
  readonly quarter: QuarterDescriptor;
  readonly profile: PitcherProfile;
  readonly today: Date;
  readonly gameDows: ReadonlyArray<number>;   // JS getDay() values of games in the next 7 days
  readonly preferredBullpenDow: number | null;
  readonly pitcherSchedule?: { settings: PitcherSettingsRow | null; outings: PitcherOutingRow[]; availability: PitcherAvailabilityRow[] };
}

/**
 * Anchor Start-days for a baseball starter around games; drop pens on day+2.
 * The pattern below is the standard MLB-style 5-man rotation adapted to the
 * "next start is on gameDow" case; when no game is visible, fall back to a
 * Mon start (preferredBullpenDow becomes Thu).
 */
function baseballStarter(input: Input): PitcherDay[] {
  const { rung, quarter, gameDows, preferredBullpenDow } = input;
  const startDow = gameDows[0] ?? 1; // Mon fallback
  const week: PitcherDay[] = [];
  for (let i = 0; i < 7; i++) {
    const dow = i;
    const isGame = gameDows.includes(dow);
    // Days offset from next start
    const offset = ((dow - startDow) + 7) % 7;
    let t: PitcherDayType;
    if (isGame && dow === startDow) t = "start";
    else if (isGame) t = "game";
    else {
      switch (offset) {
        case 1: t = "flush"; break;
        case 2: t = "long_toss"; break;
        case 3: t = rung === "foundation" ? "touch" : "bullpen"; break;
        case 4: t = "fielding_only"; break;
        case 5: t = "touch"; break;
        case 6: t = quarter.phase === "in" ? "rest" : "long_toss"; break;
        default: t = "start"; break;
      }
    }
    // Foundation rung never sees "start" or full "bullpen" without a game
    if (rung === "foundation" && (t === "start" && !isGame)) t = "side";
    // Preferred pen day overrides offset-3 pen if it lands sensibly
    if (
      preferredBullpenDow !== null &&
      dow === preferredBullpenDow &&
      offset !== 0 && offset !== 6 && offset !== 1
    ) {
      t = rung === "foundation" ? "side" : "bullpen";
    }
    week.push(mkDay(dow, t));
  }
  return week;
}

function baseballReliever(input: Input): PitcherDay[] {
  const { rung, gameDows, preferredBullpenDow } = input;
  const week: PitcherDay[] = [];
  for (let i = 0; i < 7; i++) {
    const dow = i;
    const isGame = gameDows.includes(dow);
    let t: PitcherDayType;
    if (isGame) t = "available";
    else if (preferredBullpenDow !== null && dow === preferredBullpenDow) t = rung === "foundation" ? "side" : "bullpen";
    else if (dow === 0) t = "rest";
    else t = "touch";
    week.push(mkDay(dow, t));
  }
  return week;
}

function softballStarter(input: Input): PitcherDay[] {
  // Softball tolerates higher weekly frequency. Rotation is typically
  // Start · Flush · Side · Start · Flush · Side · Start.
  const { rung, gameDows, quarter } = input;
  const anchor = gameDows[0] ?? 1;
  const week: PitcherDay[] = [];
  const softPattern: PitcherDayType[] = [
    "start", "flush", "side", "start", "flush", "side", "start",
  ];
  for (let i = 0; i < 7; i++) {
    const dow = i;
    const isGame = gameDows.includes(dow);
    const offset = ((dow - anchor) + 7) % 7;
    let t = softPattern[offset] ?? "touch";
    if (isGame) t = dow === anchor ? "start" : "game";
    if (rung === "foundation" && t === "start" && !isGame) t = "side";
    if (quarter.phase === "in" && !isGame && t === "start") t = "side";
    week.push(mkDay(dow, t));
  }
  return week;
}

function softballReliever(input: Input): PitcherDay[] {
  const { gameDows } = input;
  const week: PitcherDay[] = [];
  for (let i = 0; i < 7; i++) {
    const dow = i;
    const isGame = gameDows.includes(dow);
    let t: PitcherDayType;
    if (isGame) t = "available";
    else if (dow === 0) t = "rest";
    else t = "touch";
    week.push(mkDay(dow, t));
  }
  return week;
}

export function buildPitchingMicrocycle(input: Input): PitchingMicrocycle {
  const { sport, profile, quarter } = input;
  const role = profile.role;
  let week: PitcherDay[];
  if (sport === "softball") {
    week = role === "reliever" || role === "closer"
      ? softballReliever(input)
      : softballStarter(input);
  } else {
    week = role === "reliever" || role === "closer"
      ? baseballReliever(input)
      : baseballStarter(input);
  }
  if (input.pitcherSchedule) {
    const baseDate = new Date(input.today.getTime() - input.today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    week = week.map((entry) => {
      const offset = (entry.dow - input.today.getDay() + 7) % 7;
      const date = new Date(`${baseDate}T12:00:00Z`);
      date.setUTCDate(date.getUTCDate() + offset);
      const planDate = date.toISOString().slice(0, 10);
      const facts = resolveOutingFacts({ planDate, ...input.pitcherSchedule });
      if (!facts.hasSchedule) return entry;
      // A scheduled competition is an anchor, not permission to add practice pitches.
      // Recovery and pain clamps remain downstream and authoritative.
      if (facts.startsToday) return mkDay(entry.dow, "start");
      if (facts.pitchedYesterday) return mkDay(entry.dow, "flush");
      if (facts.startsTomorrow) return mkDay(entry.dow, "touch");
      const available = input.pitcherSchedule.availability.find((a) => a.date === planDate);
      if (available?.available && (input.pitcherSchedule.settings?.role === "reliever" || input.pitcherSchedule.settings?.role === "both")) return mkDay(entry.dow, "available");
      // Never invent a start from a weekday template once real scheduling exists.
      if (entry.dayType === "start" || entry.dayType === "game" || entry.dayType === "available") return mkDay(entry.dow, "touch");
      return entry;
    });
  }
  const todayDow = input.today.getDay();
  const today = week.find((d) => d.dow === todayDow) ?? week[0];
  const weekLabel = `${sport === "softball" ? "Softball" : "Baseball"} ${
    role === "reliever" || role === "closer" ? "reliever" : "starter"
  } · ${quarter.accent} week`;
  return { week, today, weekLabel };
}

export function labelDow(dow: number): string {
  return DOW_NAMES[dow] ?? "";
}
