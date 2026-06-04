import { DashboardLayout } from "@/components/DashboardLayout";
import { RuntimeCard } from "@/components/runtime/RuntimeCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAthleteCommandRows } from "@/hooks/command/useAthleteCommandRows";
import {
  LIFE_CONTEXT_CHECKIN,
  ONBOARDING_VOICE,
  type LifeContextCheckinOptionId,
} from "@/lib/relational/copy";
import { emitRuntimeEvent } from "@/lib/runtime/emitRuntimeEvent";
import { emitOnboardingBootstrap } from "@/lib/runtime/relational/onboardingBootstrap";
import { emitLifeContextDisclosure } from "@/lib/runtime/relational/lifeContextEmitters";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const STEPS = ONBOARDING_VOICE.steps;
const LIFE_CONTEXT_STEP_ID = "life_context_checkin" as const;

export default function OnboardingFlow() {
  const { user } = useAuth();
  const { data: rows } = useAthleteCommandRows({ days: 60, limit: 200 });

  // P0-OB-3 — derive isMinor from the athlete's profile DOB so RR-6 / Phase 31
  // safeguarding actually activates for youth athletes. Defaults to TRUE
  // (protection-first) while DOB is unknown or loading — never fail open.
  const { data: profileDob } = useQuery({
    queryKey: ["profile-dob", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("date_of_birth")
        .eq("id", user!.id)
        .maybeSingle();
      return (data as { date_of_birth: string | null } | null)?.date_of_birth ?? null;
    },
  });
  const isMinor = (() => {
    if (!profileDob) return true; // protection-first default
    const dob = new Date(profileDob);
    if (Number.isNaN(dob.getTime())) return true;
    const ageMs = Date.now() - dob.getTime();
    const ageYears = ageMs / (365.25 * 24 * 3600 * 1000);
    return ageYears < 18;
  })();

  const completed = useMemo(() => {
    if (!rows) return new Set<string>();
    return new Set(
      rows
        .filter((r) => r.topic_id === "onboarding.step_completed")
        .map((r) => (r.payload as any)?.step as string)
        .filter(Boolean),
    );
  }, [rows]);
  const [busy, setBusy] = useState(false);
  const [selection, setSelection] = useState<LifeContextCheckinOptionId | null>(
    null,
  );
  const nextIdx = STEPS.findIndex((s) => !completed.has(s.id));
  const cur = nextIdx === -1 ? STEPS[STEPS.length - 1] : STEPS[nextIdx];
  const done = nextIdx === -1;
  const isLifeContextStep = !done && cur.id === LIFE_CONTEXT_STEP_ID;

  // Phase A §4 — Relational onboarding bootstrap. Idempotent at the emit
  // layer (deterministic idempotency_key); the in-process guard just avoids
  // re-running the network round-trip per page mount.
  const bootstrappedRef = useRef(false);
  useEffect(() => {
    if (!user || bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    emitOnboardingBootstrap(user).catch((e) => {
      // Constitutional: failures degrade visibly but never block onboarding.
      console.warn("[relational] onboarding bootstrap deferred", e);
    });
  }, [user]);

  async function markStepComplete(stepId: string) {
    if (!user) return;
    await emitRuntimeEvent({
      athleteId: user.id,
      actorId: user.id,
      actorRole: "athlete",
      topic: "onboarding.step_completed" as any,
      payload: { step: stepId },
    });
  }

  async function complete() {
    if (!user || done) return;
    setBusy(true);
    try {
      await markStepComplete(cur.id);
      toast.success("Saved");
    } catch {
      toast.error("Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function submitLifeContextCheckin() {
    if (!user || !selection) return;
    setBusy(true);
    try {
      // RR-8: selecting "nothing" emits nothing. Skipping emits nothing.
      // Either path still advances onboarding without penalty.
      if (selection !== "nothing") {
        const occurredAt = new Date().toISOString();
        await emitLifeContextDisclosure(
          {
            athleteId: user.id,
            actorId: user.id,
            actorRole: "athlete",
            occurredAt,
          },
          "general_pressure",
          {
            visibility_scope: "self",
            authority: "self",
            confidence: null,
            missingness: { fields: [], reason: "not_observed" },
            lineage_parent_ids: [],
            window_start: occurredAt,
            window_end: occurredAt,
            intensity_band: "moderate",
            topic_tag: selection,
          } as Parameters<typeof emitLifeContextDisclosure>[2],
          { safeguardingLockdown: false, isMinor },
        );
      }
      await markStepComplete(LIFE_CONTEXT_STEP_ID);
      setSelection(null);
      toast.success("Saved");
    } catch {
      toast.error("Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function skipLifeContextCheckin() {
    if (!user) return;
    setBusy(true);
    try {
      await markStepComplete(LIFE_CONTEXT_STEP_ID);
      setSelection(null);
    } catch {
      toast.error("Could not save");
    } finally {
      setBusy(false);
    }
  }

  const stepNumber = Math.min(nextIdx + 1, STEPS.length);

  return (
    <DashboardLayout>
      <main className="mx-auto max-w-xl space-y-5 p-4">
        <RuntimeCard
          eyebrow={`${ONBOARDING_VOICE.eyebrow} · ${stepNumber} of ${STEPS.length}`}
          title={cur.title}
          tone="elevated"
        >
          <p className="mb-5 text-sm text-muted-foreground">
            {done ? ONBOARDING_VOICE.done : cur.body}
          </p>
          {isLifeContextStep ? (
            <div className="space-y-4">
              <div
                role="radiogroup"
                aria-label={cur.title}
                className="flex flex-wrap gap-2"
              >
                {LIFE_CONTEXT_CHECKIN.options.map((opt) => {
                  const active = selection === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setSelection(opt.id)}
                      disabled={busy}
                      className={
                        "min-h-11 rounded-full border px-4 py-2 text-sm transition-colors " +
                        (active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:bg-muted")
                      }
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {LIFE_CONTEXT_CHECKIN.helper}
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={submitLifeContextCheckin}
                  disabled={busy || !selection}
                  size="lg"
                  className="min-h-11 flex-1"
                >
                  {LIFE_CONTEXT_CHECKIN.confirm}
                </Button>
                <Button
                  onClick={skipLifeContextCheckin}
                  disabled={busy}
                  size="lg"
                  variant="ghost"
                  className="min-h-11"
                >
                  {LIFE_CONTEXT_CHECKIN.skip}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={complete}
              disabled={busy || done}
              size="lg"
              className="w-full min-h-11"
            >
              {done ? "All set" : ONBOARDING_VOICE.continue}
            </Button>
          )}
        </RuntimeCard>
      </main>
    </DashboardLayout>
  );
}
