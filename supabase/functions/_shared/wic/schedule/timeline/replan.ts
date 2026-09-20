// v1.2 §B2 — any timeline change re-plans the next 7 days, with a reason on the
// card. Pure: the caller supplies the timeline; this returns the new plan.

import { decide } from "../tissueCost/decide.ts";
import { TCS_CONFIG } from "../tissueCost/config.ts";
import { weekdayName } from "../tissueCost/reasons.ts";
import type { CheckIn, DaySchedule, Profile, TcsConfig } from "../tissueCost/types.ts";
import { addDays } from "./blocks.ts";
import type { PlannedDay, ReplanResult, TimelineChange } from "./types.ts";

export const REPLAN_HORIZON_DAYS = 7;

/** "Game added Thursday — heavy day moved to Saturday." */
export function changeReasonText(change: TimelineChange, movedHeavyTo: string | null): string {
  const when = weekdayName(change.date);
  const head: Record<TimelineChange["kind"], string> = {
    game_added: `Game added ${when}`,
    game_cancelled: `Game off ${when}`,
    practice_added: `Extra practice ${when}`,
    off_day_added: `Off day ${when}`,
    travel_added: `Travel ${when}`,
    onboarding: "Plan set up from your answers",
  };
  const tail = movedHeavyTo ? ` — heavy day moved to ${weekdayName(movedHeavyTo)}.` : ".";
  return `${head[change.kind]}${tail}`;
}

export interface ReplanInput {
  today: string;
  profile: Profile;
  /** Days strictly before today. */
  history: DaySchedule[];
  /** Today and forward. */
  calendar: DaySchedule[];
  checkIns?: CheckIn[];
  /** v1.2 §B1.3 — zero-load days: optional mobility only. */
  offDayDates?: readonly string[];
  change?: TimelineChange | null;
  /** Where the heavy day sat before the change, for the card reason. */
  previousHeavyDate?: string | null;
  config?: TcsConfig;
  timezone?: string;
}

/**
 * Re-plan the next 7 days. Off days are zero-load and never loadable, but they
 * still carry a card (mobility only), so no day is ever left empty.
 */
export function replanNextSevenDays(input: ReplanInput): ReplanResult {
  const config = input.config ?? TCS_CONFIG;
  const off = new Set(input.offDayDates ?? []);
  const calendar = input.calendar.filter((d) => !off.has(d.date));
  const days: PlannedDay[] = [];
  let firstHeavy: string | null = null;

  for (let i = 0; i < REPLAN_HORIZON_DAYS; i++) {
    const date = addDays(input.today, i);
    if (off.has(date)) {
      days.push({
        date,
        slot: "off",
        class: null,
        reason: "Planned off day — mobility only if you feel like it.",
      });
      continue;
    }
    const decision = decide(
      input.profile,
      input.history,
      calendar,
      input.checkIns ?? [],
      config,
      date,
      input.timezone ?? "UTC",
    );
    const cls = decision.allowedClass;
    if (cls === "H" && firstHeavy === null) firstHeavy = date;
    days.push({
      date,
      slot: cls === "none" ? "rest" : "lift",
      class: cls === "none" ? null : cls,
      reason: decision.reasons[0] ?? "Recovery and skills today.",
    });
  }

  const changeReason = input.change
    ? changeReasonText(
        input.change,
        firstHeavy && firstHeavy !== input.previousHeavyDate ? firstHeavy : null,
      )
    : null;

  return { days, changeReason };
}
