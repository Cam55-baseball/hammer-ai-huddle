import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAthleteCommandRows } from "@/hooks/command/useAthleteCommandRows";
import { useAthleteOnboardingState } from "@/hooks/command/useAthleteOnboardingState";
import { NotificationBell } from "@/components/command/NotificationBell";
import { CommandCenterSection } from "@/components/command/CommandCenterSection";
import { RecentEventsPreview } from "@/components/command/cards/RecentEventsPreview";

/**
 * Athlete Command Center deep-link route. Renders the same canonical
 * CommandCenterSection used inside /today (so spacing, TrustFooter, chip
 * styling and state semantics stay identical), plus the Recent activity
 * tail. Reads exclusively from the canonical ASB ledger via the shared
 * react-query cache key — no double network call.
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
        <div className="flex items-center justify-end pt-4">
          <NotificationBell />
        </div>

        <CommandCenterSection defaultSignalsOpen />

        <section className="mt-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recent activity
          </h2>
          <RecentEventsPreview rows={rows} loading={isLoading} />
        </section>
      </div>
    </DashboardLayout>
  );
}
