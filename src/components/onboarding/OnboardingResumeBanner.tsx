/**
 * OnboardingResumeBanner — slim, dismissible nudge displayed at the top
 * of every dashboard surface when an athlete hasn't finished setup.
 *
 * Dismissal is session-scoped (sessionStorage) so a user who explicitly
 * closes it isn't bullied again on the same visit; on next session the
 * gentle reminder returns until they actually finish. Constitutional:
 * never auto-completes the flow, never fabricates progress.
 */
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { X, ArrowRight } from "lucide-react";
import { useAthleteOnboardingState } from "@/hooks/command/useAthleteOnboardingState";

const SS_KEY = "onboarding-resume-banner-dismissed";

export function OnboardingResumeBanner() {
  const location = useLocation();
  const { hasCompletedOnboarding, hasScheduleEvent, loading } = useAthleteOnboardingState();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(SS_KEY) === "1");
    } catch {
      /* sessionStorage unavailable */
    }
  }, []);

  // Don't render while on the onboarding flow itself, while loading, when complete, or when dismissed.
  if (loading || hasCompletedOnboarding || dismissed) return null;
  if (location.pathname.startsWith("/onboarding")) return null;

  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs">
      <div className="min-w-0">
        <span className="font-medium text-amber-900 dark:text-amber-200">
          Finish your setup
        </span>
        <span className="ml-2 text-muted-foreground">
          {hasScheduleEvent
            ? "Notifications + health check left — under a minute."
            : "We never auto-fill on your behalf. Takes under a minute."}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <Link
          to="/onboarding/athlete"
          className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-amber-900 hover:bg-amber-500/20 dark:text-amber-100"
        >
          Resume <ArrowRight className="h-3 w-3" />
        </Link>
        <button
          aria-label="Dismiss"
          onClick={() => {
            try {
              sessionStorage.setItem(SS_KEY, "1");
            } catch {
              /* ignore */
            }
            setDismissed(true);
          }}
          className="rounded p-1 text-muted-foreground hover:bg-foreground/5"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
