/**
 * Su Wen / Neijing-inspired seasonal wisdom tips. Interpretive only —
 * blended with modern sports-science framing so athletes learn *why*.
 */

import type { SeasonPhase } from "@/lib/seasonPhase";

export interface SeasonalTip {
  title: string;
  body: string;
  category: "sleep" | "hydration" | "nutrition" | "breath" | "movement" | "mind";
}

export const SEASONAL_TIPS: Record<SeasonPhase, SeasonalTip[]> = {
  preseason: [
    {
      title: "Wake with the light",
      body: "Wood energy rises with the dawn. Getting 10 minutes of morning sun anchors circadian rhythm and sharpens the diaphragm before ramp weeks.",
      category: "sleep",
    },
    {
      title: "Sour + green to open Liver",
      body: "Small amounts of vinegar, citrus, and dark leafy greens support tendon repair as volume rises. Rotate spinach, arugula, and lemon water.",
      category: "nutrition",
    },
    {
      title: "Warm before you unleash",
      body: "Never take a max swing or throw cold. Wood asks for pliability first — 6 nasal breath rounds, then rotational primers, then intent.",
      category: "movement",
    },
  ],
  in_season: [
    {
      title: "Guard the Shen",
      body: "In-season is Fire — the Shen (mind/spirit) burns bright but is fragile. Keep pre-game screens dim, avoid caffeine after 3pm, and protect sleep as the #1 recovery lever.",
      category: "mind",
    },
    {
      title: "Cool the system between games",
      body: "Cold showers, cool foods (cucumber, melon, mint), and shaded rest between double-headers protect Heart Qi. Overheating tanks sharpness.",
      category: "hydration",
    },
    {
      title: "Small doses, high frequency",
      body: "Skip the heroic session. Fire responds to short, sharp micro-doses — 6 primer breaths, 3 focused reps, 3 clean throws. Repeat, don't extend.",
      category: "movement",
    },
    {
      title: "Hydrate ahead of thirst",
      body: "By the time you feel thirsty, performance has already dipped 5–10%. Sip 6–10oz every 20 minutes on game day, add a pinch of salt.",
      category: "hydration",
    },
  ],
  post_season: [
    {
      title: "Let the Metal descend",
      body: "Post-season is a downshift. Long exhales (in 4, out 8), warmer meals, and honest rest signal the Lung/Metal channel to clear residual tension.",
      category: "breath",
    },
    {
      title: "Address what hurt all year",
      body: "Now is the surgical window for lingering pain. Bring anything unresolved to a coach or clinician while the schedule is quiet.",
      category: "movement",
    },
    {
      title: "Grieve the season, then release",
      body: "Metal governs letting go. Write down 3 wins and 3 lessons, then close the notebook. Carrying unresolved seasons weakens next year's rise.",
      category: "mind",
    },
  ],
  off_season: [
    {
      title: "Store deep, spend later",
      body: "Water phase is about the reservoir. Sleep 8+ hours, honor early bedtimes, and don't chase peak feelings — build the tank instead.",
      category: "sleep",
    },
    {
      title: "Warm the Kidney",
      body: "Kidney/Water rules reserves. Warming, protein-rich foods (bone broth, black beans, walnuts) and salt intelligently placed help build the winter store.",
      category: "nutrition",
    },
    {
      title: "Fear signals matter",
      body: "In Water phase, hesitation and fear responses are the Kidney speaking. Don't override them with volume — respect them and back off 1 gear.",
      category: "mind",
    },
    {
      title: "Diaphragm before deadlift",
      body: "Every heavy set starts with 5–5 diaphragmatic breath. Fills the tank, sets bracing, and protects the low back from Kidney depletion.",
      category: "breath",
    },
  ],
};

export function pickTodaysTip(phase: SeasonPhase, seed = new Date()): SeasonalTip {
  const tips = SEASONAL_TIPS[phase];
  const day = Math.floor(seed.getTime() / 86400000);
  return tips[day % tips.length];
}
