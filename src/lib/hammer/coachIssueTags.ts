/**
 * Owner Nov 5 round 3 #4 — "Tag an issue" on coach notes.
 * A tag is optional. Only the area and the coach's short label reach the
 * player (through my_coach_issue_tags), never the note itself.
 */
export type IssueArea = "defense" | "hitting" | "throwing" | "baserunning";

export const ISSUE_AREAS: ReadonlyArray<{ id: IssueArea; label: string }> = [
  { id: "defense", label: "Defense" }, { id: "hitting", label: "Hitting" },
  { id: "throwing", label: "Throwing" }, { id: "baserunning", label: "Baserunning" },
];

/** Columns to save with a note: nothing when untagged. */
export function noteTag(area: IssueArea | null, label: string): { issue_area?: IssueArea; issue_label?: string | null } {
  if (!area) return {};
  const l = label.trim().slice(0, 120);
  return { issue_area: area, issue_label: l || null };
}

/** Which Before-you-start item a tag turns on. */
export const TAG_ITEM: Record<IssueArea, string> = {
  defense: "defensive_prep_video",
  hitting: "royal_timing",
  throwing: "recurring_videos",
  baserunning: "baserunning_study",
};
