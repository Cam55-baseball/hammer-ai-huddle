/**
 * Derived HPI (Human Performance Intelligence) score.
 * Interpretive-only overlay — never authors organism truth. Combines the
 * user's declared lifestyle constitution with the current season profile to
 * produce a 0–100 readiness-of-context score plus a short narrative.
 */

import type { SeasonPhase } from "@/lib/seasonPhase";
import { getSeasonHPI } from "@/lib/seasonPhase";
import type { HpiLifestyle } from "./lifestyleStore";

export interface HpiScore {
  score: number;              // 0-100
  band: "restore" | "steady" | "sharp" | "peak";
  drivers: { label: string; delta: number }[];
  narrative: string;
  breathPrimer: string;
  element: string;
  qiDirective: string;
  yinYangEmphasis: string;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

export function computeHpiSignal(
  phase: SeasonPhase,
  lifestyle: HpiLifestyle | null,
): HpiScore {
  const hpi = getSeasonHPI(phase);

  // Base band comes from the season profile — Fire/In-Season starts sharper,
  // Water/Off-Season starts deeper but not "sharp".
  const baseByPhase: Record<SeasonPhase, number> = {
    preseason: 68,
    in_season: 72,
    post_season: 58,
    off_season: 62,
  };

  let score = baseByPhase[phase];
  const drivers: { label: string; delta: number }[] = [];

  if (lifestyle) {
    // Sleep debt driver — the biggest lever.
    const sleepDebt = lifestyle.sleepTargetHours - lifestyle.sleepActualHours;
    const sleepDelta = clamp(-sleepDebt * 4, -20, 12);
    drivers.push({
      label:
        sleepDebt <= 0
          ? `Sleep on target (${lifestyle.sleepActualHours}h)`
          : `Sleep debt ${sleepDebt.toFixed(1)}h`,
      delta: Math.round(sleepDelta),
    });
    score += sleepDelta;

    // Hydration driver — 0.5 oz per lb ≈ 80oz baseline.
    const hydrationDelta = clamp((lifestyle.waterOz - 60) / 6, -8, 8);
    drivers.push({
      label: `Hydration ${lifestyle.waterOz}oz`,
      delta: Math.round(hydrationDelta),
    });
    score += hydrationDelta;

    // Stress driver — 3 is neutral.
    const stressDelta = (3 - lifestyle.stressLevel) * 4;
    drivers.push({
      label: `Stress ${lifestyle.stressLevel}/5`,
      delta: stressDelta,
    });
    score += stressDelta;

    // Constitution alignment with season Yin/Yang emphasis.
    const seasonYang = phase === "preseason" || phase === "off_season";
    const alignedYang = lifestyle.constitution === "yang" && seasonYang;
    const alignedYin = lifestyle.constitution === "yin" && !seasonYang;
    if (alignedYang || alignedYin) {
      drivers.push({ label: "Constitution aligned with season", delta: 4 });
      score += 4;
    } else if (lifestyle.constitution !== "balanced") {
      drivers.push({ label: "Constitution counter-seasonal", delta: -3 });
      score -= 3;
    }
  } else {
    drivers.push({
      label: "Lifestyle intake incomplete — using season baseline",
      delta: 0,
    });
  }

  score = clamp(Math.round(score), 0, 100);
  const band: HpiScore["band"] =
    score >= 85 ? "peak" : score >= 70 ? "sharp" : score >= 55 ? "steady" : "restore";

  const narrative = buildNarrative(band, phase, lifestyle);

  return {
    score,
    band,
    drivers,
    narrative,
    breathPrimer: hpi.breathPrimer,
    element: hpi.element,
    qiDirective: hpi.qiDirective,
    yinYangEmphasis: hpi.yinYangEmphasis,
  };
}

function buildNarrative(
  band: HpiScore["band"],
  phase: SeasonPhase,
  lifestyle: HpiLifestyle | null,
): string {
  const hpi = getSeasonHPI(phase);
  const bandTone: Record<HpiScore["band"], string> = {
    peak: "You're in the sweet spot — express, don't chase.",
    sharp: "Signal is clean — use today, don't over-spend.",
    steady: "Solid base — protect it and add one intentional win.",
    restore: "System is asking for repair — honor it before pushing.",
  };
  const context = lifestyle
    ? `${hpi.element} phase asks for ${hpi.qiDirective.toLowerCase()}`
    : `${hpi.element} phase — ${hpi.qiDirective}`;
  return `${bandTone[band]} ${context}`;
}
