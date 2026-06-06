/**
 * UHRC — deterministic AI Hammer brief.
 *
 * Hammer is a TRANSLATOR, not an analyst. This function takes the
 * canonical UHRC report + the recommendation/trend envelopes and
 * produces a constitutionally bounded coaching brief. Every field
 * traces to a source signal id; no free-floating prose. RR-5 envelope
 * preserved (no destiny framing, no invented feelings).
 *
 * The brief never:
 *  - re-scores
 *  - re-ranks
 *  - re-selects recommendations
 *  - performs independent analysis
 */
import type {
  UhrcRecommendationEnvelope,
  UhrcReport,
  UhrcTrendEnvelope,
} from "./types";

export interface HammerBriefEvidence {
  field: keyof Omit<HammerBrief, "evidence" | "engine_version" | "computed_at">;
  source_event_id: string;
  source_signal_id: string;
}

export interface HammerBrief {
  biggest_win: { headline: string; source_signal_id: string };
  biggest_leak: { headline: string; source_signal_id: string };
  priority_fix: { headline: string; source_signal_id: string; tier: string | null };
  why_it_matters: { text: string; source_signal_id: string };
  drill: { id: string; name: string; rationale: string; source_signal_id: string } | null;
  video: { id: string; title: string; rationale: string; source_signal_id: string } | null;
  trend: { direction: string; source_signal_id: string };
  evidence: HammerBriefEvidence[];
  computed_at: string;
  engine_version: string;
}

export function generateHammerBrief(input: {
  uhrc: UhrcReport;
  recommendations: UhrcRecommendationEnvelope;
  trends: UhrcTrendEnvelope[];
}): HammerBrief {
  const { uhrc, recommendations, trends } = input;

  // Priority fix: worst non-missing contribution across all pillars.
  let worst: { value: number; signal: string; explanation: string; tier: string | null; eventId: string } | null = null;
  for (const p of uhrc.pillars) {
    for (const c of p.contributions) {
      if (c.value == null) continue;
      if (!worst || c.value < worst.value) {
        worst = {
          value: c.value,
          signal: c.source_signal_id,
          explanation: c.explanation,
          tier: (c.tier as string) ?? null,
          eventId: c.source_event_id ?? `${c.source_signal_id}:source`,
        };
      }
    }
  }

  // Biggest win: best non-missing contribution.
  let best: { value: number; signal: string; explanation: string; eventId: string } | null = null;
  for (const p of uhrc.pillars) {
    for (const c of p.contributions) {
      if (c.value == null) continue;
      if (!best || c.value > best.value) {
        best = {
          value: c.value,
          signal: c.source_signal_id,
          explanation: c.explanation,
          eventId: c.source_event_id ?? `${c.source_signal_id}:source`,
        };
      }
    }
  }

  const fallbackSignal = worst?.signal ?? best?.signal ?? "uhrc.no_signal";
  const trend = trends.find((t) => t.source_signal_id === (worst?.signal ?? "")) ??
    trends[0] ?? { source_signal_id: fallbackSignal, trend: "insufficient_data", slope: null };

  const brief: HammerBrief = {
    biggest_win: {
      headline: best
        ? `${best.explanation} is your strongest pattern.`
        : "Not enough data yet to call a strength.",
      source_signal_id: best?.signal ?? fallbackSignal,
    },
    biggest_leak: {
      headline: worst
        ? `${worst.explanation} is the lowest-scoring pattern in this report.`
        : "No leaks detected in this report.",
      source_signal_id: worst?.signal ?? fallbackSignal,
    },
    priority_fix: {
      headline: worst
        ? `Prioritize ${worst.explanation.toLowerCase()}.`
        : "Hold the pattern.",
      source_signal_id: worst?.signal ?? fallbackSignal,
      tier: worst?.tier ?? null,
    },
    why_it_matters: {
      text: worst
        ? `This signal sits inside the pillar that anchors your composite. Tightening it lifts the report card without changing intent.`
        : `Nothing in the current report is regressing past threshold. Stay on plan.`,
      source_signal_id: worst?.signal ?? fallbackSignal,
    },
    drill: recommendations.drill,
    video: recommendations.video,
    trend: {
      direction: trend.trend,
      source_signal_id: trend.source_signal_id,
    },
    evidence: [
      { field: "biggest_win", source_event_id: best?.eventId ?? "uhrc:none", source_signal_id: best?.signal ?? fallbackSignal },
      { field: "biggest_leak", source_event_id: worst?.eventId ?? "uhrc:none", source_signal_id: worst?.signal ?? fallbackSignal },
      { field: "priority_fix", source_event_id: worst?.eventId ?? "uhrc:none", source_signal_id: worst?.signal ?? fallbackSignal },
      { field: "why_it_matters", source_event_id: worst?.eventId ?? "uhrc:none", source_signal_id: worst?.signal ?? fallbackSignal },
      ...(recommendations.drill
        ? [{ field: "drill" as const, source_event_id: `drill:${recommendations.drill.id}`, source_signal_id: recommendations.drill.source_signal_id }]
        : []),
      ...(recommendations.video
        ? [{ field: "video" as const, source_event_id: `video:${recommendations.video.id}`, source_signal_id: recommendations.video.source_signal_id }]
        : []),
      { field: "trend", source_event_id: `trend:${trend.source_signal_id}`, source_signal_id: trend.source_signal_id },
    ],
    computed_at: uhrc.computed_at,
    engine_version: uhrc.engine_version,
  };

  return brief;
}
