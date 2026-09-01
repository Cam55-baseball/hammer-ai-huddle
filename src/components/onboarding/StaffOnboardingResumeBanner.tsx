/**
 * StaffOnboardingResumeBanner — the scout/coach counterpart to
 * OnboardingResumeBanner. Nudges staff to finish their own role-specific
 * first-run setup (never the athlete flow).
 *
 * Dismissal is session-scoped; completion is derived, never fabricated.
 */
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { X, ArrowRight } from "lucide-react";
import { useStaffOnboardingState } from "@/hooks/onboarding/useStaffOnboardingState";

const SS_KEY = "staff-onboarding-resume-banner-dismissed";

export function StaffOnboardingResumeBanner() {
  const location = useLocation();
  const { role, onboardingPath, hasCompletedOnboarding, hasContextRow, loading } =
    useStaffOnboardingState();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(SS_KEY) === "1");
    } catch {
      /* sessionStorage unavailable */
    }
  }, []);

  if (loading || !role || !onboardingPath || hasCompletedOnboarding || dismissed) return null;
  if (location.pathname.startsWith("/onboarding")) return null;

  const label = role === "scout" ? "scout" : "coach";

  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-md border border-sky-500/30 bg-sky-500/5 px-3 py-2 text-xs">
      <div className="min-w-0">
        <span className="font-medium text-sky-900 dark:text-sky-200">
          Finish your {label} setup
        </span>
        <span className="ml-2 text-muted-foreground">
          {hasContextRow
            ? "A few details left so your queue and alerts are accurate."
            : "Tell us who you work for and what you evaluate — under a minute."}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <Link
          to={onboardingPath}
          className="inline-flex items-center gap-1 rounded-md border border-sky-500/40 bg-sky-500/10 px-2 py-1 text-sky-900 hover:bg-sky-500/20 dark:text-sky-100"
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
