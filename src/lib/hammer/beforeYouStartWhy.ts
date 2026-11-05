/**
 * Owner Nov 5 round 2 #6c — every Before-you-start item says why it is showing for this
 * player. Pure: built only from facts the plan screen already has; never adds an item.
 * Items whose own card already explains the reason (starting point, defensive prep,
 * day notices, arm-strength unlock) return null so the reason isn't repeated.
 */
export interface BysWhyFacts {
  restDay: boolean;
  hittingToday: boolean;
  timingRoles: readonly ("hitter" | "baserunner" | "pitcher")[];
  analysisModules: readonly string[];
  recurringIssueCount: number;
  baserunningStudyToday: boolean;
  hasFuelGoal: boolean;
}

const list = (xs: readonly string[]) => xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
const ROLE: Record<string, string> = { hitter: "hit", baserunner: "run bases", pitcher: "pitch" };

export function bysWhy(id: string, f: BysWhyFacts): string | null {
  switch (id) {
    case "finish_profile": return "a detail in your profile is still empty. Adding it makes your plan fit you better.";
    case "competition_level": return "your playing level isn't saved yet.";
    case "mind_item": return "a Mind item is due for you today.";
    case "info_videos": return "your coach placed this video for players in your sport.";
    case "recurring_videos": return f.recurringIssueCount > 0
      ? `${f.recurringIssueCount === 1 ? "an issue keeps" : `${f.recurringIssueCount} issues keep`} showing up in your recent clips.`
      : null;
    case "baserunning_study": return f.baserunningStudyToday ? "your base-running card has a study part today (no running needed)." : null;
    case "daily_intent": return f.restDay ? "it's your rest day; a calm aim and breathing still help." : "every training day starts with an aim and a short breathing primer.";
    case "coach_advice": return "you get one piece of coach's advice every day.";
    case "testing_day": return "a coach or your organization scheduled a testing day.";
    case "royal_timing": return f.hittingToday ? "you hit today and your timing study is due." : null;
    case "timing_study": return f.timingRoles.length ? `you ${list(f.timingRoles.map((r) => ROLE[r]))} today.` : null;
    case "analysis_prompts": return f.analysisModules.length ? `you have ${list([...f.analysisModules])} today and a new clip is due.` : null;
    case "non_physical": return f.restDay
      ? "you get a fuel plan every day, with a rest-day version today."
      : f.hasFuelGoal ? "you get a fuel plan every training day, built from your saved nutrition goal." : "you get a fuel plan every training day.";
    case "season_card": return "this shows where you are in your season and week, every day.";
    default: return null; // starting_point, defensive_prep_video, day_notices explain themselves
  }
}
