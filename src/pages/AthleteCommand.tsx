import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAthleteCommandRows } from "@/hooks/command/useAthleteCommandRows";
import { useAthleteOnboardingState } from "@/hooks/command/useAthleteOnboardingState";
import { NotificationBell } from "@/components/command/NotificationBell";
import { CommandCenterSection } from "@/components/command/CommandCenterSection";
import { RecentEventsPreview } from "@/components/command/cards/RecentEventsPreview";
// UhrcAthleteSection removed — Hammer Report Card now lives inside each video analysis result.
import { HammerOnboardingChat } from "@/components/hammer/HammerOnboardingChat";
import { HammerDailyPlan } from "@/components/hammer/HammerDailyPlan";
import { HammerChat } from "@/components/hammer/HammerChat";

/**
 * Athlete Command Center deep-link route. Canonical Coach Hammer surface.
 *
 * Mount order (Sprint: Coach Hammer Completion & Runtime Ratification §B):
 *   1. HammerOnboardingChat      — self-hides when zero knowledge gaps remain
 *   2. UhrcAthleteSection        — UHRC report card
 *   3. CommandCenterSection      — organism readiness/fatigue/workload grid
 *   4. HammerDailyPlan           — 9-modality daily prescription
 *   5. HammerChat                — unified Ask-Coach surface
 *   6. RecentEventsPreview       — replay tail
 *
 * All Hammer surfaces consume the single authority hooks
 * (`useHammerNextStep`, `useHammerAthleteContext`,
 * `useHammerOnboardingDirector`, `useHammerChat`) — no parallel arbitration.
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
      <div className="mx-auto w-full max-w-5xl px-4 pb-12 sm:px-6 space-y-4">
        <div className="flex items-center justify-end pt-4">
          <NotificationBell />
        </div>

        <HammerOnboardingChat />

        <div className="mt-4">
          <UhrcAthleteSection />
        </div>

        <CommandCenterSection defaultSignalsOpen />

        <HammerDailyPlan />

        <HammerChat />

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
