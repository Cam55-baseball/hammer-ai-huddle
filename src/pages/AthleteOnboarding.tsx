import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useAthleteOnboardingState } from "@/hooks/command/useAthleteOnboardingState";
import { useAthleteEvents } from "@/hooks/useAthleteEvents";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AthleteOnboardingShell } from "@/components/onboarding/AthleteOnboardingShell";
import { HammerOnboardingPresence } from "@/components/onboarding/HammerOnboardingPresence";
import type { OnboardingStateKind } from "@/lib/runtime/onboarding/types";
import { NotificationsPreferencesPanel } from "@/components/notifications/NotificationsPreferencesPanel";
import { EngineVersionBadge } from "@/components/asb/EngineVersionBadge";
import { ENGINE_VERSION } from "@/lib/asb/engineVersion";
import { topicLabel, shortenEventId } from "@/lib/asb/topicLabels";
import { emitOnboardingBootstrap } from "@/lib/runtime/relational/onboardingBootstrap";
import { ArrowRight, ExternalLink } from "lucide-react";
import type { DayType } from "@/utils/tdeeCalculations";
import { InjuryIntakeStep } from "@/components/onboarding/steps/InjuryIntakeStep";
import { CategoryGoalsStep } from "@/components/onboarding/steps/CategoryGoalsStep";
import { ReviewAnswersStep, type ReviewEditKey } from "@/components/onboarding/steps/ReviewAnswersStep";
import { writeDraftSlot, readDraftSlot } from "@/lib/onboarding/draftStore";


const STEPS = [
  "Welcome",
  "Profile",
  "Rank goals",
  "Schedule today",
  "Confirm",
  "Health check",
  "Notifications",
  "Review",
  "Done",
];
const STEP_WELCOME = 0;
const STEP_PROFILE = 1;
const STEP_GOALS = 2;
const STEP_SCHEDULE = 3;
const STEP_CONFIRM = 4;
const STEP_INJURY = 5;
const STEP_NOTIFICATIONS = 6;
const STEP_REVIEW = 7;
const STEP_DONE = 8;

/** Deep-link edit keys → owning step index. */
const EDIT_TARGETS: Record<ReviewEditKey, number> = {
  profile: STEP_PROFILE,
  goals: STEP_GOALS,
  schedule: STEP_SCHEDULE,
  injury: STEP_INJURY,
  notifications: STEP_NOTIFICATIONS,
};

const DAY_TYPE_OPTIONS: { value: DayType; label: string; help: string }[] = [
  { value: "training", label: "Training", help: "Structured practice / drills" },
  { value: "game", label: "Game", help: "Competitive in-game day" },
  { value: "rest", label: "Rest", help: "Active recovery / no load" },
  { value: "travel", label: "Travel", help: "On the move; minimal load" },
];

/**
 * Athlete first-run flow. Walks the user from login to an actually-populated
 * /command — by emitting exactly one real canonical event via the existing
 * `useAthleteEvents.createEvent` producer.
 *
 * No fabricated events. No schema rewrites. No replay-authoring.
 */
export default function AthleteOnboarding() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading, isAuthStable } = useAuth();
  const { hasScheduleEvent, hasCompletedOnboarding, loading: stateLoading } = useAthleteOnboardingState();
  const { createEvent } = useAthleteEvents();

  const [step, setStep] = useState(0);
  /** When set, the next save returns to STEP_REVIEW instead of advancing linearly. */
  const [editReturnTo, setEditReturnTo] = useState<number | null>(null);
  const [dayType, setDayType] = useState<DayType>("training");
  const [emitting, setEmitting] = useState(false);
  const [emittedEventId, setEmittedEventId] = useState<string | null>(null);
  const [emitError, setEmitError] = useState<{ topic: string; code?: string; message?: string } | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthStable && !user) navigate("/auth", { replace: true });
  }, [authLoading, isAuthStable, user, navigate]);

  // Canonical relational onboarding bootstrap. Reads DOB from
  // profiles.date_of_birth (canonical source). Idempotent at the emit
  // layer; the in-process ref just prevents per-mount network round-trips.
  const bootstrappedRef = useRef(false);
  useEffect(() => {
    if (!user || bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("date_of_birth")
          .eq("id", user.id)
          .maybeSingle();
        const profileDob =
          (data as { date_of_birth: string | null } | null)?.date_of_birth ?? null;
        await emitOnboardingBootstrap(user, { profileDob });
      } catch (e) {
        // Constitutional: bootstrap failures degrade visibly but never block onboarding.
        console.warn("[relational] onboarding bootstrap deferred", e);
      }
    })();
  }, [user]);

  // Deep-link routing: ?step=review jumps to the review summary; ?edit=<key>
  // jumps directly to that step and marks it as an edit (save returns to review).
  const urlRoutedRef = useRef(false);
  useEffect(() => {
    if (urlRoutedRef.current) return;
    const editKey = searchParams.get("edit") as ReviewEditKey | null;
    const stepParam = searchParams.get("step");
    const resume = searchParams.get("resume");
    if (editKey && editKey in EDIT_TARGETS) {
      urlRoutedRef.current = true;
      setStep(EDIT_TARGETS[editKey]);
      setEditReturnTo(STEP_REVIEW);
    } else if (stepParam === "review") {
      urlRoutedRef.current = true;
      setStep(STEP_REVIEW);
    } else if (resume === "1" && user?.id) {
      urlRoutedRef.current = true;
      (async () => {
        try {
          const draft = await readDraftSlot<{ stepIndex?: number; dayType?: DayType }>(
            user.id,
            "onboarding-step",
          );
          if (draft) {
            if (typeof draft.stepIndex === "number") {
              setStep(Math.min(Math.max(draft.stepIndex, 0), STEPS.length - 1));
            }
            if (draft.dayType) setDayType(draft.dayType);
          }
        } catch {
          /* resume is best-effort */
        }
      })();
    }
  }, [searchParams, user?.id]);

  // Skip the flow only when the athlete already finished it AND we're not
  // explicitly reviewing/editing. This lets completed users come back via
  // /onboarding/athlete?step=review or ?edit=<key> to update answers.
  useEffect(() => {
    const isReviewing =
      searchParams.has("edit") ||
      searchParams.get("step") === "review" ||
      step >= STEP_REVIEW;
    if (!stateLoading && hasCompletedOnboarding && !isReviewing && step < STEP_NOTIFICATIONS) {
      navigate("/command", { replace: true });
    }
  }, [stateLoading, hasCompletedOnboarding, navigate, step, searchParams]);


  /** Advance, OR if we're in edit-mode, jump back to Review and clear the flag. */
  const goNext = () => {
    if (editReturnTo !== null) {
      const target = editReturnTo;
      setEditReturnTo(null);
      setSearchParams({ step: "review" }, { replace: true });
      setStep(target);
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const goBack = () => {
    if (editReturnTo !== null) {
      const target = editReturnTo;
      setEditReturnTo(null);
      setSearchParams({ step: "review" }, { replace: true });
      setStep(target);
      return;
    }
    setStep((s) => Math.max(s - 1, 0));
  };

  /** Review → Edit jump. Adds a return marker so save bounces back here. */
  const handleEditFromReview = useCallback(
    (key: ReviewEditKey) => {
      setEditReturnTo(STEP_REVIEW);
      setSearchParams({ edit: key }, { replace: true });
      setStep(EDIT_TARGETS[key]);
    },
    [setSearchParams],
  );

  const handleEmitSchedule = async () => {
    if (!user?.id) return;
    setEmitting(true);
    setEmitError(null);
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const result = await createEvent({ eventDate: today, eventType: dayType });

      // Canonical-emit failure: block advancement, render inline error, allow retry.
      const asbErr = (result as (typeof result & { _asbError?: { code?: string; message?: string } }) | null)
        ?._asbError;
      if (asbErr) {
        setEmitError({ topic: "athlete.schedule.day_type", code: asbErr.code, message: asbErr.message });
        return;
      }

      // Re-read latest canonical event for this athlete (deterministic, no fabrication).
      const { data } = await supabase
        .from("asb_events")
        .select("event_id, topic_id, occurred_at")
        .eq("athlete_id", user.id)
        .eq("topic_id", "athlete.schedule.day_type")
        .order("occurred_at", { ascending: false })
        .order("event_id", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.event_id) {
        setEmittedEventId(data.event_id);
        goNext();
      } else {
        setEmitError({
          topic: "athlete.schedule.day_type",
          message: "Canonical event not visible in ledger after emit.",
        });
      }
    } finally {
      setEmitting(false);
    }
  };

  const onboardingState: OnboardingStateKind = emittedEventId
    ? "first-completed-action"
    : hasScheduleEvent
      ? "first-completed-action"
      : step === 0
        ? "first-login"
        : "incomplete-onboarding";

  return (
    <AthleteOnboardingShell
      stepIndex={step}
      steps={STEPS}
      onSaveAndExit={() => {
        if (user?.id) writeDraftSlot(user.id, "onboarding-step", { stepIndex: step, dayType });
      }}
    >
      <HammerOnboardingPresence
        state={onboardingState}
        lineageHandle={emittedEventId ? `ledger:evt:${emittedEventId}` : undefined}
      />
      {step === STEP_WELCOME && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Your organism is the source of truth.</h2>
          <p className="text-sm text-muted-foreground">
            Every readiness, fatigue, and recovery signal you'll see is derived from
            real canonical events you generate — never fabricated scores. Each card
            links straight back to its source event so you can audit it.
          </p>
          <p className="text-sm text-muted-foreground">
            This setup takes about a minute. We'll log one schedule event so your
            Command Center isn't empty when you arrive.
          </p>
          <div className="flex justify-end">
            <Button onClick={goNext}>
              Begin <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {step === STEP_PROFILE && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Confirm your profile</h2>
          <p className="text-sm text-muted-foreground">
            You can refine details later in <span className="font-medium">Profile</span>.
            Nothing here is required to start emitting canonical events.
          </p>
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
            Signed in as <span className="font-mono text-xs">{user?.email ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={goBack}>
              Back
            </Button>
            <Button onClick={goNext}>
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {step === STEP_GOALS && (
        <CategoryGoalsStep onContinue={goNext} onBack={goBack} />
      )}

      {step === STEP_SCHEDULE && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">What kind of day is today?</h2>
          <p className="text-sm text-muted-foreground">
            This emits one canonical event (<span className="font-mono text-xs">
            athlete.schedule.day_type</span>) which unlocks your scheduling load
            and workload cards.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {DAY_TYPE_OPTIONS.map((opt) => {
              const active = dayType === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setDayType(opt.value)}
                  className={`flex flex-col items-start gap-1 rounded-md border p-3 text-left transition ${
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-foreground/30"
                  }`}
                  style={{ minHeight: 64 }}
                >
                  <span className="text-sm font-medium">{opt.label}</span>
                  <span className="text-xs text-muted-foreground">{opt.help}</span>
                </button>
              );
            })}
          </div>
          {emitError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs">
              <div className="font-medium text-destructive">Canonical event not appended.</div>
              <div className="mt-1 font-mono break-all text-muted-foreground">topic: {emitError.topic}</div>
              {emitError.code && (
                <div className="font-mono break-all text-muted-foreground">code: {emitError.code}</div>
              )}
              {emitError.message && (
                <div className="font-mono break-all text-muted-foreground">{emitError.message}</div>
              )}
              <div className="mt-2 text-muted-foreground">
                Nothing advanced. Replay integrity preserved. You can retry below.
              </div>
            </div>
          )}
          <div className="flex justify-between">
            <Button variant="ghost" onClick={goBack}>
              Back
            </Button>
            <Button onClick={handleEmitSchedule} disabled={emitting}>
              {emitting ? "Emitting…" : emitError ? "Try again" : "Emit canonical event"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {step === STEP_CONFIRM && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Event recorded</h2>
          <p className="text-sm text-muted-foreground">
            Your first canonical event was appended to the ledger. Everything
            downstream — Command Center, Timeline, Replay — now has real signal
            to draw from.
          </p>
          <div className="rounded-md border border-border bg-muted/30 p-3 text-xs space-y-3">
            <div>
              <div className="text-sm font-medium text-foreground">
                {topicLabel("athlete.schedule.day_type")}
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                athlete.schedule.day_type
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Recorded by</span>
              <EngineVersionBadge engineVersion={ENGINE_VERSION} />
            </div>
            {emittedEventId && (
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Event reference</div>
                <div
                  className="mt-0.5 font-mono text-foreground"
                  title={emittedEventId}
                >
                  {shortenEventId(emittedEventId)}
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            {emittedEventId && (
              <Button asChild variant="outline" size="sm">
                <a href={`/replay/${emittedEventId}`} target="_blank" rel="noreferrer">
                  Open in replay <ExternalLink className="ml-1.5 h-3 w-3" />
                </a>
              </Button>
            )}
            <Button onClick={goNext}>
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {step === STEP_INJURY && (
        <InjuryIntakeStep onContinue={goNext} onBack={goBack} />
      )}

      {step === STEP_NOTIFICATIONS && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Notification preferences (optional)</h2>
          <p className="text-sm text-muted-foreground">
            Escalations always appear in the header bell. You can also opt into
            email and push, where each delivery links back to the source event.
          </p>
          <NotificationsPreferencesPanel />
          <div className="flex justify-between">
            <Button variant="ghost" onClick={goBack}>
              Back
            </Button>
            <Button onClick={goNext}>
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {step === STEP_REVIEW && (
        <ReviewAnswersStep
          onEdit={handleEditFromReview}
          onFinish={() => setStep(STEP_DONE)}
        />
      )}

      {step === STEP_DONE && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">You're set up.</h2>
          <p className="text-sm text-muted-foreground">
            Come back daily to keep your organism visible. The more canonical
            events you generate, the more your Command Center fills in — always
            with confidence and missingness visible.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setStep(STEP_REVIEW)}>
              Review answers
            </Button>
            <Button onClick={() => navigate("/command")}>
              Open Command Center <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      )}
    </AthleteOnboardingShell>
  );
}
