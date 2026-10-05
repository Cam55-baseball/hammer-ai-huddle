import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useSeasonStatus } from "@/hooks/useSeasonStatus";
import { readHpiLifestyle } from "@/lib/hpi/lifestyleStore";
import { computeHpiSignal } from "@/lib/hpi/hpiSignal";
import { BreathPrimer } from "./BreathPrimer";
import { useOpenedOnceToday } from "@/hooks/useOpenedOnceToday";
import { useState } from "react";
import { useVaultQuizzesForDate } from '@/hooks/useVaultQuizzesForDate';
import { useHammerState } from '@/hooks/useHammerState';
import { useHIESnapshot } from '@/hooks/useHIESnapshot';
import { useReadinessState } from '@/hooks/useReadinessState';
import { useTexVisionS2Priority } from '@/components/hammer/TexVisionS2Priority';
import type { PrescribedBlock } from '@/lib/hammer/prescription/dailyPlan';

/**
 * Performance context card — Neijing-inspired overlay.
 * Interpretive-only; never authors organism truth. Starts closed and glows
 * with a soft primary-tinted pulse until the athlete opens it once today.
 * Today's Wisdom now lives in its own card above this one.
 */
export function HumanPerformanceCard({ planBlocks = [] }: { planBlocks?: ReadonlyArray<PrescribedBlock> }) {
  const { resolvedPhase, phaseProfile } = useSeasonStatus();
  const lifestyle = useMemo(() => readHpiLifestyle(), []);
  const signal = useMemo(
    () => computeHpiSignal(resolvedPhase, lifestyle),
    [resolvedPhase, lifestyle],
  );
  const [open, setOpen] = useState(false);
  const checkins = useVaultQuizzesForDate();
  const hammer = useHammerState();
  const hie = useHIESnapshot();
  const readiness = useReadinessState();
  const vision = useTexVisionS2Priority();
  const morning = checkins.quizzes.find(q => q.quiz_type === 'morning');
  const fresh = (iso?: string | null) => !!iso && Date.now() - new Date(iso).getTime() < 48 * 3600_000;
  const workload = hammer.snapshot && fresh(hammer.snapshot.computed_at) ? hammer.snapshot : null;
  const analysis = hie.snapshot && fresh(hie.snapshot.computed_at) ? hie.snapshot : null;
  const evidence = [
    morning ? `Morning check-in · ${morning.entry_date}` : 'Morning check-in · not recorded today',
    workload ? `Workload and recovery · ${new Date(workload.computed_at).toLocaleDateString()} · ${workload.overall_state}` : 'Workload and recovery · no recent signal',
    analysis ? `Analysis findings · ${new Date(analysis.computed_at).toLocaleDateString()} · ${analysis.primary_limiter ?? 'no specific limiter identified'}` : 'Analysis findings · no recent signal',
    vision.hasAccess ? vision.baseline ? `Vision baseline · ${vision.baseline.test_date}` : 'Vision baseline · not recorded' : 'Vision baseline · not available on this plan',
    readiness.hasSignal ? `Canonical readiness · ${readiness.state}` : 'Canonical readiness · insufficient fresh evidence',
    lifestyle ? `Lifestyle questionnaire · ${new Date(lifestyle.savedAt).toLocaleDateString()}` : 'Lifestyle questionnaire · not recorded',
  ];
  // Read an actual decision from the canonical plan, never attribute it to a
  // particular signal merely because both happened to be present today.
  const adjusted = planBlocks.find(b => b.status === 'suppressed' || b.status === 'off-day');
  const { shouldGlow, markOpened } = useOpenedOnceToday("hpi");

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) markOpened();
  };

  return (
    <Card
      className={`border-border/60 transition-shadow ${
        shouldGlow ? "ring-2 ring-primary/50 animate-hammer-today-glow" : ""
      }`}
    >
      <Collapsible open={open} onOpenChange={handleOpenChange}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full text-left"
            aria-expanded={open}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="h-4 w-4 text-primary" />
                    Performance context

                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {phaseProfile.label} · {morning || workload || analysis ? "Recent signals available" : lifestyle ? "Questionnaire and season only" : "Season only · inputs missing"}
                  </p>
                </div>
                <ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3 pt-0">
            <p className="text-sm text-foreground/90">{lifestyle ? signal.narrative : `Season context: ${phaseProfile.label}. A lifestyle questionnaire is needed for a personal interpretation.`}</p>
            <p className="text-xs font-medium">Season and questionnaire provide context, not a live readiness score.</p>
            <ul className="space-y-1 text-xs text-muted-foreground" aria-label="Dated performance evidence">
              {evidence.map(line => <li key={line}>{line}</li>)}
            </ul>
            <p className="text-xs text-foreground/90">{adjusted
              ? `Plan decision · ${adjusted.title}: ${adjusted.why}`
              : 'Plan decision · no held or off-day block to explain from the current plan.'}</p>
            <p className="text-xs text-muted-foreground">Hammer's plan and recovery limits decide what changes today. These signals explain context; they do not add work or diagnose a condition.</p>
            <p className="text-xs text-muted-foreground">
              Today starts here. Use this breath primer before warm-up, at-bats, or pitches. The recovery card at the end of the day has its own down-regulation breath — this one is for activation.
            </p>
            <BreathPrimer primer={signal.breathPrimer} scheduleLabel="Now — pre-activity primer" />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
