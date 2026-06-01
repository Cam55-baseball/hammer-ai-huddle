import { DashboardLayout } from "@/components/DashboardLayout";
import { RuntimeCard } from "@/components/runtime/RuntimeCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAthleteCommandRows } from "@/hooks/command/useAthleteCommandRows";
import { ONBOARDING_VOICE } from "@/lib/relational/copy";
import { emitRuntimeEvent } from "@/lib/runtime/emitRuntimeEvent";
import { emitOnboardingBootstrap } from "@/lib/runtime/relational/onboardingBootstrap";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const STEPS = ONBOARDING_VOICE.steps;

export default function OnboardingFlow() {
  const { user } = useAuth();
  const { data: rows } = useAthleteCommandRows({ days: 60, limit: 200 });
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
  const nextIdx = STEPS.findIndex((s) => !completed.has(s.id));
  const cur = nextIdx === -1 ? STEPS[STEPS.length - 1] : STEPS[nextIdx];
  const done = nextIdx === -1;

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

  async function complete() {
    if (!user || done) return;
    setBusy(true);
    try {
      await emitRuntimeEvent({
        athleteId: user.id,
        actorId: user.id,
        actorRole: "athlete",
        topic: "onboarding.step_completed" as any,
        payload: { step: cur.id },
      });
      toast.success("Saved");
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
          <Button
            onClick={complete}
            disabled={busy || done}
            size="lg"
            className="w-full min-h-11"
          >
            {done ? "All set" : ONBOARDING_VOICE.continue}
          </Button>
        </RuntimeCard>
      </main>
    </DashboardLayout>
  );
}
