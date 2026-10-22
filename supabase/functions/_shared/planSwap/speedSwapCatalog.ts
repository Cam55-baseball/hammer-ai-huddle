/** Explicit speed-only alternatives; no treadmill acceleration or tempo-as-top-speed substitution. */
export const SPEED_SWAP_CATALOG = [
  { slug: "swap_short_acceleration", name: "Short-space accelerations", equipment: [] as string[], cue: "Drive smoothly for the marked distance, then slow down with clear stopping space." },
  { slug: "swap_hill_acceleration", name: "Hill accelerations", equipment: ["hill"], cue: "Use a gentle, even hill with good footing. Drive up smoothly; walk down." },
  { slug: "swap_sled_acceleration", name: "Resisted sled accelerations", equipment: ["sled"], cue: "Keep the sled light enough for quick steps and a smooth drive; do not grind." },
  { slug: "swap_band_acceleration", name: "Resisted band accelerations", equipment: ["bands"], cue: "Use a securely anchored sprint band; keep resistance light and steps quick." },
] as const;

/** Only declared acceleration work may use the acceleration mix. */
export const SPEED_SOURCE_INTENTS: Readonly<Record<string, "acceleration" | "max_velocity">> = {
  "10-yard starts": "acceleration", "20-yard sprints": "acceleration",
  "40-yard sprints": "acceleration", "Long-acceleration runs": "acceleration",
  "Resisted starts (sled or band)": "acceleration", "Optional resisted starts": "acceleration",
  "Flying 20s": "max_velocity",
};