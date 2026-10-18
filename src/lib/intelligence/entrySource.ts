// Every game entry keeps its source label. NULL = logged before labels existed (never guessed).
export const ENTRY_SOURCE_LABEL: Record<string, string> = {
  player_entered: "Player-entered",
  parent_entered: "Parent-entered",
  coach_verified: "Coach-verified",
  coach_entered: "Coach-entered",
  imported: "Imported",
  video_tagged: "Video-tagged",
  estimated: "Estimated",
};
export function entrySourceLabel(src: string | null | undefined): string {
  return src ? ENTRY_SOURCE_LABEL[src] ?? "Source unknown" : "Source not recorded";
}
