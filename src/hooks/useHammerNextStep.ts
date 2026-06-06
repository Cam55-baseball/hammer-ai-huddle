/**
 * useHammerNextStep — canonical "what should the athlete do next" authority.
 *
 * Sprint: Coach Hammer Authority Consolidation (post Audit v1 FAIL).
 *
 * Internally arbitrates between two prior parallel authorities:
 *   • useCoachHammerNextStep  — AI-derived interpretive recommendation
 *   • useNextAction           — deterministic time-of-day / readiness heuristic
 *
 * Replay-safe / lineage-visible: every Hammer surface (Today, Dashboard,
 * Command Center, Recommendations, Onboarding) MUST consume this hook —
 * never the underlying primitives. Hammer remains interpretive: this hook
 * does not author organism_truth / athlete_intent / authority_override /
 * hard_stop / rehabilitation_state. (Megaphase 151–160 · RR-5 · RR-6 · RR-8.)
 */
import { useMemo } from "react";
import {
  useCoachHammerNextStep,
  type CoachHammerStep,
  type CoachHammerTier,
} from "@/hooks/useCoachHammerNextStep";
import { useNextAction, type NextAction } from "@/hooks/useNextAction";

export type HammerNextStepSource = "ai" | "heuristic";

export interface HammerNextStep {
  /** Stable interpretive tier. */
  readonly tier: CoachHammerTier;
  readonly tierLabel: string;
  /** Short imperative title — the headline the athlete reads. */
  readonly title: string;
  /** One-sentence "why this, now" interpretation. */
  readonly why: string;
  /** Concrete actionable instruction. */
  readonly instruction: string;
  /** CTA label. */
  readonly ctaLabel: string;
  /** Target route — guaranteed to resolve in App.tsx. */
  readonly route: string;
  /** Module hint for downstream loggers (`physio` · `practice` · …). */
  readonly moduleHint: string;
  /** Provenance of this step (single arbitration audit dimension). */
  readonly source: HammerNextStepSource;
  /** Loading state. */
  readonly isLoading: boolean;
  /** Last error encountered (does not block fallback). */
  readonly error: Error | null;
}

const TIER_LABEL: Record<CoachHammerTier, string> = {
  survivability: "Survivability",
  recovery: "Recovery",
  "readiness-low": "Readiness low",
  consistency: "Consistency",
  performance: "Performance",
  optimization: "Optimization",
  missing: "Missing signal",
};

function fromAi(step: CoachHammerStep): HammerNextStep {
  return {
    tier: step.tier,
    tierLabel: step.tierLabel ?? TIER_LABEL[step.tier] ?? "Next step",
    title: step.title,
    why: step.why,
    instruction: step.instruction,
    ctaLabel: step.ctaLabel,
    route: step.ctaRoute,
    moduleHint: deriveModuleHintFromRoute(step.ctaRoute),
    source: "ai",
    isLoading: false,
    error: null,
  };
}

function fromHeuristic(next: NextAction, isLoading: boolean, error: Error | null): HammerNextStep {
  // Map heuristic moduleHint → interpretive tier for visual consistency.
  const tier: CoachHammerTier =
    next.moduleHint === "recovery"
      ? "recovery"
      : next.moduleHint === "physio"
      ? "consistency"
      : next.moduleHint === "practice"
      ? "performance"
      : next.moduleHint === "reflect"
      ? "consistency"
      : "optimization";
  return {
    tier,
    tierLabel: TIER_LABEL[tier],
    title: next.label,
    why: "Calibrated to your time of day and current readiness.",
    instruction: next.ctaLabel,
    ctaLabel: next.ctaLabel,
    route: next.route,
    moduleHint: next.moduleHint,
    source: "heuristic",
    isLoading,
    error,
  };
}

function deriveModuleHintFromRoute(route: string): string {
  if (route.startsWith("/tex-vision")) return "physio";
  if (route.startsWith("/practice")) return "practice";
  if (route.startsWith("/bounce-back-bay")) return "recovery";
  if (route.startsWith("/vault")) return "reflect";
  if (route.startsWith("/nutrition-hub")) return "wind-down";
  if (route.startsWith("/check-in")) return "checkin";
  if (route.startsWith("/command")) return "command";
  return "general";
}

export function useHammerNextStep(): HammerNextStep {
  const ai = useCoachHammerNextStep();
  const heuristic = useNextAction();

  return useMemo(() => {
    // AI primary when available; deterministic fallback otherwise.
    if (ai.step) return fromAi(ai.step);
    return fromHeuristic(heuristic, ai.isLoading, ai.error);
  }, [ai.step, ai.isLoading, ai.error, heuristic]);
}
