/**
 * Raw identifiers must never reach an athlete's screen.
 *
 * Everything the analyzer groups by — a vision drill id, a pitch type — is a
 * machine key like `color_flash` or `four_seam`. This turns one into the name
 * the athlete already sees elsewhere in the app, and falls back to plain title
 * case so a key we have not named still reads as English rather than code.
 */
const KNOWN_LABELS: Record<string, string> = {
  // Tex Vision drills
  color_flash: "Color Flash",
  eye_relaxation: "Eye Relaxation",
  near_far: "Near-Far Sight",
  smooth_pursuit: "Follow the Target",
  whack_a_mole: "Whack-a-Mole",
  convergence: "Convergence",
  peripheral: "Peripheral Vision",
  saccades: "Quick Eye Jumps",
  pitch_recognition: "Pitch Recognition",
  recognition: "Pitch Recognition",
  reaction: "Reaction",
  tracking: "Tracking",
  general: "Vision",
  // Pitch types
  four_seam: "Four-Seam Fastball",
  two_seam: "Two-Seam Fastball",
  fastball: "Fastball",
  changeup: "Changeup",
  curveball: "Curveball",
  slider: "Slider",
  cutter: "Cutter",
  splitter: "Splitter",
  sinker: "Sinker",
  knuckleball: "Knuckleball",
  riseball: "Riseball",
  dropball: "Dropball",
  screwball: "Screwball",
};

export function humanLabel(key: string | null | undefined, fallback = "this drill"): string {
  if (!key || typeof key !== "string") return fallback;
  const k = key.trim().toLowerCase();
  if (KNOWN_LABELS[k]) return KNOWN_LABELS[k];
  return k
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
