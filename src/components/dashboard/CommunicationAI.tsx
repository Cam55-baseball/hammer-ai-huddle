/**
 * Communication AI — Coach Hammer · Next Best Step.
 *
 * Real AI coach: reads canonical ASB projections, sends a bounded snapshot to
 * the coach-hammer-next-step edge function (Lovable AI Gateway), and renders
 * the personalized recommendation. Falls back to a deterministic step if the
 * model is unavailable so the dashboard never breaks.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAthleteCommandRows } from "@/hooks/command/useAthleteCommandRows";
import { useEscalationFeed } from "@/hooks/command/useEscalationFeed";
import {
  useCoachHammerNextStep,
  type CoachHammerStep,
  type CoachHammerTier,
} from "@/hooks/useCoachHammerNextStep";
import { QuickCheckInSheet } from "@/components/checkin/QuickCheckInSheet";
import { cn } from "@/lib/utils";

const TIER_TONE: Record<CoachHammerTier, string> = {
  survivability: "bg-destructive/15 text-destructive border-destructive/30",
  recovery:
    "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  "readiness-low":
    "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  consistency:
    "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
  performance:
    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  optimization: "bg-primary/10 text-primary border-primary/30",
  missing: "bg-muted text-muted-foreground border-border",
};

/**
 * Deterministic fallback used only when the AI call fails. Keeps the
 * survivability/escalation routing intact so the agent never silently
 * disappears or hallucinates a step.
 */
function deriveFallbackStep(
  hasRows: boolean,
  escalationCount: number,
): CoachHammerStep {
  if (escalationCount > 0) {
    return {
      tier: "survivability",
      tierLabel: "Check In",
      title: "Pause and check your alert.",
      analysis: "Your system flagged a pattern that needs your attention.",
      instruction: "Open the alert and acknowledge it before training today.",
      why: "Survivability comes before performance.",
      ctaLabel: "Review Alert",
      ctaRoute: "/command",
    };
  }
  if (!hasRows) {
    return {
      tier: "missing",
      tierLabel: "Start Here",
      title: "Log today's check-in.",
      analysis: "No fresh signals yet today.",
      instruction:
        "Take 30 seconds to tell Coach Hammer how you feel and what's on the schedule.",
      why: "Without a fresh signal, guidance falls back to defaults.",
      ctaLabel: "Open Check-In",
      ctaRoute: "/command",
    };
  }
  return {
    tier: "optimization",
    tierLabel: "Standby",
    title: "Coach Hammer is catching his breath.",
    analysis: "Hammer guidance is temporarily unavailable.",
    instruction: "Open Command to review today's signals manually.",
    why: "We'd rather pause than guess.",
    ctaLabel: "Open Command",
    ctaRoute: "/command",
  };
}

interface Props {
  className?: string;
}

export function CommunicationAI({ className }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: rows, isLoading: rowsLoading } = useAthleteCommandRows({
    days: 30,
    limit: 500,
  });
  const { unackedCount } = useEscalationFeed({ withinHours: 72 });
  const { step: aiStep, isLoading: aiLoading, error } =
    useCoachHammerNextStep();

  const step = useMemo<CoachHammerStep | null>(() => {
    if (aiStep) return aiStep;
    if (error) return deriveFallbackStep(!!rows?.length, unackedCount ?? 0);
    return null;
  }, [aiStep, error, rows, unackedCount]);

  if (!user || rowsLoading || (aiLoading && !step)) {
    return (
      <section
        className={cn(
          "rounded-2xl border border-primary/20 bg-card p-3 sm:p-4 animate-pulse",
          className,
        )}
        aria-busy="true"
      >
        <div className="h-3 w-40 rounded bg-muted mb-3" />
        <div className="h-5 w-2/3 rounded bg-muted mb-2" />
        <div className="h-4 w-full rounded bg-muted mb-2" />
        <div className="h-8 w-28 rounded bg-muted" />
      </section>
    );
  }

  if (!step) return null;

  return (
    <section
      aria-labelledby="communication-ai-heading"
      className={cn(
        "relative overflow-hidden rounded-2xl border border-primary/20 p-3 sm:p-4",
        "bg-gradient-to-br from-primary/10 via-card to-card",
        "shadow-sm",
        className,
      )}
    >
      <div className="relative flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          <h2
            id="communication-ai-heading"
            className="text-[11px] font-black uppercase tracking-[0.22em] text-foreground"
          >
            Coach Hammer · Next Best Step
          </h2>
        </div>
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            TIER_TONE[step.tier],
          )}
        >
          {step.tierLabel}
        </span>
      </div>

      <div className="relative space-y-1.5 max-w-2xl">
        <h3 className="text-base sm:text-lg font-semibold tracking-tight text-foreground leading-tight">
          {step.title}
        </h3>
        {step.analysis ? (
          <p className="text-xs text-muted-foreground italic">
            {step.analysis}
          </p>
        ) : null}
        <p className="text-sm font-medium text-foreground flex items-start gap-2">
          <ArrowRight
            className="h-4 w-4 mt-0.5 shrink-0 text-primary"
            aria-hidden
          />
          <span>{step.instruction}</span>
        </p>
        {step.why ? (
          <p className="text-xs text-muted-foreground">{step.why}</p>
        ) : null}
      </div>

      <div className="relative mt-3">
        <Button
          size="sm"
          onClick={() => navigate(step.ctaRoute)}
          className="font-semibold"
        >
          {step.ctaLabel}
        </Button>
      </div>
    </section>
  );
}
