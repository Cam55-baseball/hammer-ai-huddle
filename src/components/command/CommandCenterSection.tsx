import { useAthleteCommandRows } from "@/hooks/command/useAthleteCommandRows";
import { TodayOverviewHeader } from "@/components/command/TodayOverviewHeader";
import { EscalationBanner } from "@/components/command/EscalationBanner";
import { ReadinessCard } from "@/components/command/cards/ReadinessCard";
import { FatigueCard } from "@/components/command/cards/FatigueCard";
import { WorkloadCard } from "@/components/command/cards/WorkloadCard";
import { RecoveryCard } from "@/components/command/cards/RecoveryCard";
import { BehavioralRegulationCard } from "@/components/command/cards/BehavioralRegulationCard";
import { SchedulingLoadCard } from "@/components/command/cards/SchedulingLoadCard";
import { TrendShiftsCard } from "@/components/command/cards/TrendShiftsCard";
import { EscalationFlagsCard } from "@/components/command/cards/EscalationFlagsCard";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface Props {
  compact?: boolean;
  /** When true, the Habits / Schedule / Trends collapsible opens by default. */
  defaultSignalsOpen?: boolean;
}

/**
 * Pure Command Center surface (no auth/layout wrappers).
 * Mounts inside Today (/today) as the primary organism view and inside
 * /command as the deep-link surface. Reads only canonical ASB events.
 */
export function CommandCenterSection({ compact = false, defaultSignalsOpen = false }: Props) {
  const { data: rows, isLoading } = useAthleteCommandRows({ days: 30, limit: 500 });
  const [showSignals, setShowSignals] = useState(defaultSignalsOpen);

  return (
    <section aria-label="Organism command center" className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <TodayOverviewHeader rows={rows} />
      </div>
      <EscalationBanner />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ReadinessCard rows={rows} loading={isLoading} />
        <FatigueCard rows={rows} loading={isLoading} />
        <WorkloadCard rows={rows} loading={isLoading} />
        <RecoveryCard rows={rows} loading={isLoading} />
      </div>

      {!compact && (
        <Collapsible open={showSignals} onOpenChange={setShowSignals}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full min-h-11 justify-between">
              <span className="text-sm font-medium">
                {showSignals ? "Hide" : "Show"} habits, schedule & trends
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform motion-reduce:transition-none ${showSignals ? "rotate-180" : ""}`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <BehavioralRegulationCard rows={rows} loading={isLoading} />
              <SchedulingLoadCard rows={rows} loading={isLoading} />
              <TrendShiftsCard rows={rows} loading={isLoading} />
              <EscalationFlagsCard rows={rows} loading={isLoading} />
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </section>
  );
}
