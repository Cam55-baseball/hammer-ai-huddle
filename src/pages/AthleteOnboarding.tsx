import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useAthleteOnboardingState } from "@/hooks/command/useAthleteOnboardingState";
import { useAthleteEvents } from "@/hooks/useAthleteEvents";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AthleteOnboardingShell } from "@/components/onboarding/AthleteOnboardingShell";
import { NotificationsPreferencesPanel } from "@/components/notifications/NotificationsPreferencesPanel";
import { EngineVersionBadge } from "@/components/asb/EngineVersionBadge";
import { ENGINE_VERSION } from "@/lib/asb/engineVersion";
import { ArrowRight, ExternalLink } from "lucide-react";
import type { DayType } from "@/utils/tdeeCalculations";

const STEPS = ["Welcome", "Profile", "Schedule today", "Confirm", "Notifications", "Done"];

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
  const { user, loading: authLoading, isAuthStable } = useAuth();
  const { hasFirstEvent, loading: stateLoading } = useAthleteOnboardingState();
  const { createEvent } = useAthleteEvents();

  const [step, setStep] = useState(0);
  const [dayType, setDayType] = useState<DayType>("training");
  const [emitting, setEmitting] = useState(false);
  const [emittedEventId, setEmittedEventId] = useState<string | null>(null);
  const [emitError, setEmitError] = useState<{ topic: string; code?: string; message?: string } | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthStable && !user) navigate("/auth", { replace: true });
  }, [authLoading, isAuthStable, user, navigate]);

  // If the athlete already emitted ≥1 canonical event, skip onboarding entirely.
  useEffect(() => {
    if (!stateLoading && hasFirstEvent && step < 5) navigate("/command", { replace: true });
  }, [stateLoading, hasFirstEvent, navigate, step]);

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

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

  return (
    <AthleteOnboardingShell stepIndex={step} steps={STEPS}>
      {step === 0 && (
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

      {step === 1 && (
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

      {step === 2 && (
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

      {step === 3 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Event recorded</h2>
          <p className="text-sm text-muted-foreground">
            Your first canonical event was appended to the ledger. Everything
            downstream — Command Center, Timeline, Replay — now has real signal
            to draw from.
          </p>
          <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono">athlete.schedule.day_type</span>
              <EngineVersionBadge engineVersion={ENGINE_VERSION} />
            </div>
            {emittedEventId && (
              <div className="mt-2 font-mono break-all text-muted-foreground">
                event_id: {emittedEventId}
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

      {step === 4 && (
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

      {step === 5 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">You're set up.</h2>
          <p className="text-sm text-muted-foreground">
            Come back daily to keep your organism visible. The more canonical
            events you generate, the more your Command Center fills in — always
            with confidence and missingness visible.
          </p>
          <div className="flex justify-end">
            <Button onClick={() => navigate("/command")}>
              Open Command Center <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      )}
    </AthleteOnboardingShell>
  );
}
