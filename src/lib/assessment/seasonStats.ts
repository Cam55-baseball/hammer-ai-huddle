/** Optional player-reported stats: blank stays missing, never becomes zero. */
import { requiredAnalyses } from "./initialAssessment";
export function seasonStatGroups(sport: "baseball" | "softball", modules: readonly string[]) {
  const need = requiredAnalyses(modules);
  const fields = (entries: [string, string][]) => entries.map(([key, label]) => ({ key, label }));
  return [
    { category: "Season", fields: fields([["games", "Games played"]]) },
    ...(need.includes("hitting") ? [{ category: "Hitting", fields: fields([["plate_appearances", "Plate appearances (PA)"], ["at_bats", "At-bats (AB)"], ["hits", "Hits (H)"], ["doubles", "Doubles (2B)"], ["triples", "Triples (3B)"], ["home_runs", "Home runs (HR)"], ["walks", "Walks (BB)"], ["strikeouts", "Strikeouts (K)"], ["rbi", "Runs batted in (RBI)"], ["left_on_base", "Runners left on base (LOB)"], ["bunt_hits", "Bunt hits"], ["bunt_attempts", "Bunt attempts"], ["avg", "Batting average (AVG)"], ["obp", "On-base percentage (OBP)"], ["slg", "Slugging percentage (SLG)"]]) }] : []),
    ...(need.includes("pitching") ? [{ category: sport === "softball" ? "Pitching · per-7 rates" : "Pitching", fields: fields([["innings_pitched", "Innings pitched (IP, .1 = one out, .2 = two outs)"], ["batters_faced", "Batters faced (BF)"], ["pitching_strikeouts", "Pitching strikeouts (K)"], ["pitching_walks", "Pitching walks (BB)"], ["pitching_hits", "Hits allowed (H)"], ["earned_runs", "Earned runs (ER)"], ...(sport === "baseball" ? [["home_runs_allowed", "Home runs allowed (HR)"]] as [string,string][] : [["k_per_7", "Strikeouts per 7 innings"], ["bb_per_7", "Walks per 7 innings"], ["era", "Earned runs per 7 innings"]] as [string,string][]), ["pitch_count", "Total pitches"]]) }] : []),
    ...(need.includes("throwing") ? [{ category: "Fielding", fields: fields([["fielding_innings", "Innings in the field"], ["fielding_chances", "Fielding chances"], ["fielding_errors", "Errors"]]) }] : []),
    ...(need.includes("hitting") || need.includes("throwing") ? [{ category: "Baserunning", fields: fields([["stolen_bases", "Stolen bases (SB)"], ["caught_stealing", "Caught stealing (CS)"]]) }] : []),
  ];
}

export function parseSeasonStats(values: Readonly<Record<string, string>>): Record<string, number> | null {
  const result: Record<string, number> = {};
  for (const [key, raw] of Object.entries(values)) {
    if (!raw.trim()) continue;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) return null;
    result[key] = value;
  }
  return result;
}