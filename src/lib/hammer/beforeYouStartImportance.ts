/**
 * Owner Nov 3 round 2 — "Before you start" is grouped into three glowing drawers
 * (Level 1 green, Level 2 yellow, Level 3 red) by an owner-editable importance map.
 * Grouping only: every item keeps its own show/hide logic.
 */
export type BysLevel = 1 | 2 | 3;
export const BYS_SETTING_KEY = "before_you_start_importance";

export const BYS_ITEMS = [
  { id: "finish_profile", label: "Finish your profile", when: "A needed or optional profile detail is still missing" },
  { id: "competition_level", label: "Competition level question", when: "Playing level isn't saved yet" },
  { id: "mind_item", label: "Mind study / game situation", when: "A Mind item (game situation) is due today" },
  { id: "info_videos", label: "Owner-placed info videos", when: "The owner placed a video in Before you start for your sport" },
  { id: "recurring_videos", label: "Videos for recurring issues", when: "Your analyses show an issue that keeps coming back" },
  { id: "baserunning_study", label: "Base-running study (mental)", when: "Base-running card has a no-physical study part today" },
  { id: "daily_intent", label: "Today's aim + breathing primer (focus routine)", when: "Every training day" },
  { id: "defensive_prep_video", label: "Defensive prep video", when: "Defense is on today and a video fits your position" },
  { id: "coach_advice", label: "Today's coach's advice", when: "Every day (tagged advice only for matching players)" },
  { id: "day_notices", label: "Why today's plan changed / load notes / rest day / running readiness / coach notes", when: "Today has a reduction, change note, coach change, rest day or readiness line" },
  { id: "testing_day", label: "Testing day notice", when: "A coach or org scheduled a testing day" },
  { id: "royal_timing", label: "Royal timing study reminder", when: "Hitting day and the timing study is due" },
  { id: "timing_study", label: "Timing study moments", when: "You hit, run bases or pitch today" },
  { id: "analysis_prompts", label: "Record-an-analysis reminder", when: "A hitting/pitching/throwing day and a new clip is due" },
  { id: "non_physical", label: "Fuel plan / Game IQ cards", when: "Fuel plan every day (rest-day version on rest days); Game IQ only when released" },
  { id: "season_card", label: "Your training block & season", when: "Every day" },
] as const;
export type BysItemId = (typeof BYS_ITEMS)[number]["id"];

/** Starting map so nothing is lost; the owner sets the final levels. */
export const BYS_DEFAULT_LEVELS: Partial<Record<BysItemId, BysLevel>> = {
  daily_intent: 1, coach_advice: 1, mind_item: 1, non_physical: 1,
  finish_profile: 3, day_notices: 3, testing_day: 3,
};

/** Saved owner map wins, then the default; anything unassigned shows in Level 2. */
export function bysLevel(id: string, saved: Record<string, unknown> | null | undefined): BysLevel {
  const v = saved?.[id] ?? BYS_DEFAULT_LEVELS[id as BysItemId];
  return v === 1 || v === 2 || v === 3 ? v : 2;
}
