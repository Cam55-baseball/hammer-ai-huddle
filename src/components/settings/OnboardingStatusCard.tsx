/**
 * OnboardingStatusCard — Profile-anchored resume / review surface.
 *
 * Strategically placed in Profile so an athlete who abandoned setup
 * (or wants to revisit it) always has one obvious door. Renders three
 * states deterministically from `useAthleteOnboardingState`:
 *
 *  - Loading        → neutral placeholder, no CTA
 *  - Incomplete     → "Finish setup" primary CTA → /onboarding/athlete
 *  - Complete       → "Review setup" secondary CTA + injury report link
 */
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, HeartPulse } from "lucide-react";
import { useState } from "react";
import { useAthleteOnboardingState } from "@/hooks/command/useAthleteOnboardingState";
import { ReportInjuryDialog } from "@/components/hammer/ReportInjuryDialog";

export function OnboardingStatusCard() {
  const {
    hasScheduleEvent,
    hasNotificationsPref,
    hasCategoryGoals,
    hasCompletedOnboarding,
    loading,
  } = useAthleteOnboardingState();
  const [injuryOpen, setInjuryOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {hasCompletedOnboarding ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Setup complete
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-amber-600" />
              Finish your setup
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!loading && (
          <div className="flex flex-wrap gap-1.5">
            <Badge variant={hasScheduleEvent ? "default" : "outline"}>
              {hasScheduleEvent ? "✓" : "•"} Today scheduled
            </Badge>
            <Badge variant={hasCategoryGoals ? "default" : "outline"}>
              {hasCategoryGoals ? "✓" : "•"} Ranked goals
            </Badge>
            <Badge variant={hasNotificationsPref ? "default" : "outline"}>
              {hasNotificationsPref ? "✓" : "•"} Notifications
            </Badge>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {hasCompletedOnboarding
            ? "You can update your preferences any time, or log an injury so Hammer plans around it."
            : "We never auto-emit on your behalf. Finishing setup unlocks Command Center signal."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant={hasCompletedOnboarding ? "outline" : "default"}>
            <Link to="/onboarding/athlete">
              {hasCompletedOnboarding ? "Review setup" : "Finish setup"}
            </Link>
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setInjuryOpen(true)}>
            <HeartPulse className="mr-1.5 h-3.5 w-3.5" />
            Report injury
          </Button>
        </div>
      </CardContent>
      <ReportInjuryDialog open={injuryOpen} onOpenChange={setInjuryOpen} />
    </Card>
  );
}
