import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAthleteCommandRows } from "@/hooks/command/useAthleteCommandRows";
import { useAthleteOnboardingState } from "@/hooks/command/useAthleteOnboardingState";
import { TodayOverviewHeader } from "@/components/command/TodayOverviewHeader";
import { EscalationBanner } from "@/components/command/EscalationBanner";
import { NotificationBell } from "@/components/command/NotificationBell";
import { ReadinessCard } from "@/components/command/cards/ReadinessCard";
import { FatigueCard } from "@/components/command/cards/FatigueCard";
import { WorkloadCard } from "@/components/command/cards/WorkloadCard";
import { RecoveryCard } from "@/components/command/cards/RecoveryCard";
import { BehavioralRegulationCard } from "@/components/command/cards/BehavioralRegulationCard";
import { SchedulingLoadCard } from "@/components/command/cards/SchedulingLoadCard";
import { TrendShiftsCard } from "@/components/command/cards/TrendShiftsCard";
import { EscalationFlagsCard } from "@/components/command/cards/EscalationFlagsCard";
import { RecentEventsPreview } from "@/components/command/cards/RecentEventsPreview";

/**
 * Athlete Command Center.
 *
 * Reads exclusively from the canonical ASB ledger (asb_events). No writes,
 * no smoothing, no imputation. Every card surfaces confidence + missingness
 * and links to /replay/:eventId for one-click lineage drilldown.
 */
export default function AthleteCommand() {
  const { user, loading: authLoading, isAuthStable } = useAuth();
  const navigate = useNavigate();
  const { data: rows, isLoading } = useAthleteCommandRows({ days: 30, limit: 500 });
  const { hasFirstEvent, loading: onboardingLoading } = useAthleteOnboardingState();

  useEffect(() => {
    if (!authLoading && isAuthStable && !user) navigate("/auth", { replace: true });
  }, [authLoading, isAuthStable, user, navigate]);

  useEffect(() => {
    if (!authLoading && isAuthStable && user && !onboardingLoading && !hasFirstEvent) {
      navigate("/onboarding/athlete", { replace: true });
    }
  }, [authLoading, isAuthStable, user, onboardingLoading, hasFirstEvent, navigate]);

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-5xl px-4 pb-12 sm:px-6">
        <div className="flex items-center justify-between gap-2 pt-4">
          <TodayOverviewHeader rows={rows} />
          <NotificationBell />
        </div>
        <EscalationBanner />

        <Section title="Today">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ReadinessCard rows={rows} loading={isLoading} />
            <FatigueCard rows={rows} loading={isLoading} />
            <WorkloadCard rows={rows} loading={isLoading} />
            <RecoveryCard rows={rows} loading={isLoading} />
          </div>
        </Section>

        <Section title="Behavior & schedule">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <BehavioralRegulationCard rows={rows} loading={isLoading} />
            <SchedulingLoadCard rows={rows} loading={isLoading} />
          </div>
        </Section>

        <Section title="Signals">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TrendShiftsCard rows={rows} loading={isLoading} />
            <EscalationFlagsCard rows={rows} loading={isLoading} />
          </div>
        </Section>

        <Section title="Recent activity">
          <RecentEventsPreview rows={rows} loading={isLoading} />
        </Section>
      </div>
    </DashboardLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}
