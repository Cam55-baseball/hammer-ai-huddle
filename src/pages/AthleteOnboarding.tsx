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
import { writeDraftSlot, readDraftSlot, clearDraftSlot } from "@/lib/onboarding/draftStore";
import { ThrowingHandSelector, type ThrowingHandValue } from "@/components/splits/ThrowingHandSelector";


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
  const [throwingHand, setThrowingHand] = useState<ThrowingHandValue | undefined>(undefined);
  const [savingProfile, setSavingProfile] = useState(false);
  const [emitting, setEmitting] = useState(false);
  const [emittedEventId, setEmittedEventId] = useState<string | null>(null);
  const [emitError, setEmitError] = useState<{ topic: string; code?: string; message?: string } | null>(null);
  const [resumedFromStep, setResumedFromStep] = useState<number | null>(null);

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
  // ?redo=1 forces a full restart. Otherwise, auto-resume from any saved draft
  // slot (Save & exit continuity). Completed users see a "welcome back" panel
  // on step 0 instead of being silently redirected to /command.
  const urlRoutedRef = useRef(false);
  const redoRequested = searchParams.get("redo") === "1";
  useEffect(() => {
    if (urlRoutedRef.current || !user?.id) return;
    const editKey = searchParams.get("edit") as ReviewEditKey | null;
    const stepParam = searchParams.get("step");
    const startOver = searchParams.get("startOver") === "1" || redoRequested;
    if (editKey && editKey in EDIT_TARGETS) {
      urlRoutedRef.current = true;
      setStep(EDIT_TARGETS[editKey]);
      setEditReturnTo(STEP_REVIEW);
      return;
    }
    if (stepParam === "review") {
      urlRoutedRef.current = true;
      setStep(STEP_REVIEW);
      return;
    }
    urlRoutedRef.current = true;
    (async () => {
      try {
        if (startOver) {
          clearDraftSlot(user.id, "onboarding-step");
          clearDraftSlot(user.id, "profile-answers");
          setThrowingHand(undefined);
          return;
        }
        // Hydrate saved profile answers regardless of step.
        const profileDraft = await readDraftSlot<{ throwingHand?: ThrowingHandValue }>(
          user.id,
          "profile-answers",
        );
        if (profileDraft?.throwingHand) setThrowingHand(profileDraft.throwingHand);
        if (!profileDraft?.throwingHand) {
          const { data } = await supabase
            .from("profiles")
            .select("throwing_hand")
            .eq("id", user.id)
            .maybeSingle();
          const th = (data as { throwing_hand?: string | null } | null)?.throwing_hand;
          if (th === "L" || th === "R") setThrowingHand(th);
          else if (th === "B" || th === "S") setThrowingHand("S");
        }
        const draft = await readDraftSlot<{ stepIndex?: number; dayType?: DayType }>(
          user.id,
          "onboarding-step",
        );
        if (draft) {
          if (draft.dayType) setDayType(draft.dayType);
          if (typeof draft.stepIndex === "number" && draft.stepIndex > 0) {
            const target = Math.min(Math.max(draft.stepIndex, 0), STEPS.length - 1);
            setStep(target);
            setResumedFromStep(target);
          }
        }
      } catch {
        /* resume is best-effort */
      }
    })();
  }, [searchParams, user?.id, redoRequested]);

  // Continuously persist step + dayType so refresh/close never loses progress.
  useEffect(() => {
    if (!user?.id || !urlRoutedRef.current) return;
    if (step === STEP_DONE) return;
    writeDraftSlot(user.id, "onboarding-step", { stepIndex: step, dayType });
  }, [user?.id, step, dayType]);

  /** Completed users landing on step 0 without a deep-link see the welcome-back panel. */
  const showWelcomeBack =
    !stateLoading &&
    hasCompletedOnboarding &&
    step === STEP_WELCOME &&
    !redoRequested &&
    !searchParams.has("edit") &&
    searchParams.get("step") !== "review";




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

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setSavingProfile(true);
    try {
      if (throwingHand) {
        const { error } = await supabase
          .from("profiles")
          .update({ throwing_hand: throwingHand === "S" ? "B" : throwingHand })
          .eq("id", user.id);
        if (error) throw error;
        // Mirror ambidextrous flag into athlete_mpi_settings when "Both" chosen.
        if (throwingHand === "S") {
          await supabase
            .from("athlete_mpi_settings")
            .upsert(
              {
                user_id: user.id,
                is_ambidextrous_thrower: true,
                primary_throwing_hand: "S",
              } as never,
              { onConflict: "user_id" },
            );
        }
        writeDraftSlot(user.id, "profile-answers", { throwingHand });
      }
      goNext();
    } catch (e) {
      console.warn("[onboarding] profile save failed", e);
      // Non-blocking — still allow forward navigation so users are never stuck.
      goNext();
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <AthleteOnboardingShell
      stepIndex={step}
      steps={STEPS}
      onBack={step > 0 && step < STEP_DONE ? goBack : undefined}
      onJumpToStep={(i) => setStep(i)}
      onSaveAndExit={() => {
        if (user?.id) writeDraftSlot(user.id, "onboarding-step", { stepIndex: step, dayType });
      }}
    >
      <HammerOnboardingPresence
        state={onboardingState}
        lineageHandle={emittedEventId ? `ledger:evt:${emittedEventId}` : undefined}
      />

      {resumedFromStep !== null && step !== STEP_DONE && (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
          <span className="text-muted-foreground">
            Resuming from <span className="font-medium text-foreground">{STEPS[resumedFromStep]}</span>.
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs"
            onClick={() => {
              if (user?.id) clearDraftSlot(user.id, "onboarding-step");
              setResumedFromStep(null);
              setStep(0);
            }}
          >
            Start over
          </Button>
        </div>
      )}

      {step === STEP_WELCOME && showWelcomeBack && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Welcome back.</h2>
          <p className="text-sm text-muted-foreground">
            You've already completed onboarding. Pick up where you want:
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            <Button variant="outline" onClick={() => setStep(STEP_REVIEW)}>
              Review answers
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (user?.id) {
                  clearDraftSlot(user.id, "onboarding-step");
                  clearDraftSlot(user.id, "profile-answers");
                }
                setThrowingHand(undefined);
                setResumedFromStep(null);
                setSearchParams({ redo: "1" }, { replace: true });
                setStep(STEP_WELCOME);
                // Force the welcome-back panel off by flipping redoRequested via URL.
              }}
            >
              Redo onboarding
            </Button>
            <Button onClick={() => navigate("/command")}>
              Go to Command Center <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            "Redo onboarding" clears your saved draft and starts at Welcome. Your
            existing profile data stays intact until you save new answers.
          </p>
        </section>
      )}

      {step === STEP_WELCOME && !showWelcomeBack && (
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
            A couple quick questions so Hammer can personalize your plan. You can
            edit any of these later from <span className="font-medium">Profile</span>.
          </p>
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
            Signed in as <span className="font-mono text-xs">{user?.email ?? "—"}</span>
          </div>

          <div className="rounded-md border border-border bg-card/40 p-3">
            <ThrowingHandSelector
              value={throwingHand}
              onValueChange={(v) => {
                setThrowingHand(v);
                if (user?.id) writeDraftSlot(user.id, "profile-answers", { throwingHand: v });
              }}
              label="Which hand do you throw with?"
            />
            <p className="mt-2 text-[11px] text-muted-foreground">
              Pick <span className="font-medium">Both</span> if you throw ambidextrously — we'll
              track sides separately so drills stay relevant to each arm.
            </p>
          </div>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={goBack}>
              Back
            </Button>
            <Button onClick={handleSaveProfile} disabled={savingProfile}>
              {savingProfile ? "Saving…" : "Continue"}
              <ArrowRight className="ml-2 h-4 w-4" />
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
          onFinish={() => {
            if (user?.id) clearDraftSlot(user.id, "onboarding-step");
            setStep(STEP_DONE);
          }}
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
