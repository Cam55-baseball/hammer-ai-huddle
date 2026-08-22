/**
 * OnboardingQuickAccess — above-the-fold CTA inside Settings/Profile.
 *
 * A single, unmissable button that jumps straight into the athlete
 * onboarding flow. Mirrors the two-state logic of OnboardingStatusCard
 * (incomplete → "Finish setup" / complete → "Review answers") but stays
 * compact so it can sit right under the page title.
 *
 * No writes. Derives state from the existing read-only hooks.
 */
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { useAthleteOnboardingState } from "@/hooks/command/useAthleteOnboardingState";
import { useOnboardingAnswerStatus } from "@/hooks/onboarding/useOnboardingAnswerStatus";

export function OnboardingQuickAccess() {
  const { hasCompletedOnboarding, loading } = useAthleteOnboardingState();
  const answers = useOnboardingAnswerStatus();

  if (loading) {
    return null;
  }

  if (hasCompletedOnboarding) {
    return (
      <div className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span className="font-medium">Setup complete</span>
          {!answers.loading && answers.totalAnswerable > 0 && (
            <span className="text-muted-foreground">
              · {answers.answeredCount}/{answers.totalAnswerable} answered
            </span>
          )}
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/onboarding/athlete?step=review">
            Review & edit answers
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-4 animate-hammer-today-glow">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold text-sm">Finish your athlete setup</p>
            {!answers.loading && (
              <p className="text-xs text-muted-foreground mt-0.5">
                <span className="font-medium text-foreground">
                  {answers.answeredCount} of {answers.totalAnswerable}
                </span>{" "}
                setup questions answered — open steps are outlined in the menu.
              </p>
            )}
          </div>
        </div>
        <Button asChild size="sm" className="w-full sm:w-auto">
          <Link to="/onboarding/athlete?resume=1">
            Finish setup
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
