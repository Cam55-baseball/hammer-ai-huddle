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
import { useEffect, useState } from "react";

interface Props {
  compact?: boolean;
  /** When true, the Habits / Schedule / Trends collapsible opens by default. */
  defaultSignalsOpen?: boolean;
}

const OPEN_KEY = "command.center.open";

/**
 * Pure Command Center surface (no auth/layout wrappers).
 * Mounts inside Today (/today) as the primary organism view and inside
 * /command as the deep-link surface. Reads only canonical ASB events.
 */
export function CommandCenterSection({ compact = false, defaultSignalsOpen = false }: Props) {
  const { data: rows, isLoading } = useAthleteCommandRows({ days: 30, limit: 500 });
  const [showSignals, setShowSignals] = useState(defaultSignalsOpen);
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const v = window.localStorage.getItem(OPEN_KEY);
    return v === null ? true : v === "1";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(OPEN_KEY, open ? "1" : "0");
  }, [open]);

  return (
    <section aria-label="Organism command center" className="space-y-4">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? "Collapse Command Center" : "Expand Command Center"}
            className="flex w-full items-start justify-between gap-2 text-left rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="min-w-0 flex-1">
              <TodayOverviewHeader rows={rows} />
            </div>
            <ChevronDown
              className={`mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
          <div className="space-y-4 pt-4">
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
                      {showSignals ? "Hide details" : "Show more details"}
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
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}

