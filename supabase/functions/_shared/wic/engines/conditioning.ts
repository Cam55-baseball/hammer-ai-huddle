// WIC Conditioning Engine — position-aware pool.
export function conditioningSlugFor(position: string | null): string {
  const pos = (position ?? "").toLowerCase();
  if (pos.includes("catch")) return "catcher_up_downs";
  if (pos.includes("pitch")) return "pitcher_field_and_cover";
  if (pos.includes("of") || pos.includes("outfield")) return "of_read_and_go";
  if (pos === "ss" || pos === "2b" || pos.includes("mid") || pos.includes("infield")) return "mif_turn_and_fire";
  if (pos.includes("if")) return "if_lateral_repeat";
  return "bases_1st_3rd";
}
export function inningRestartSlug(sport: "baseball" | "softball"): string {
  return sport === "baseball" ? "inning_restart_sim_bb" : "inning_restart_sim_sb";
}
