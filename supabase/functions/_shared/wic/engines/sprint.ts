// WIC Sprint Engine — owns the speed-lab pool.
export function sprintSlugs(sport: "baseball" | "softball"): string[] {
  return [
    "accel_10_30y",
    sport === "baseball" ? "lateral_first_step" : "slap_runner_crossover",
    sport === "baseball" ? "repeat_90ft_bb" : "repeat_43ft_sb",
  ];
}
