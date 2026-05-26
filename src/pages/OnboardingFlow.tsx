import { DashboardLayout } from "@/components/DashboardLayout";
import { RuntimeCard } from "@/components/runtime/RuntimeCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAthleteCommandRows } from "@/hooks/command/useAthleteCommandRows";
import { onboardingCopy } from "@/lib/copy/onboarding";
import { emitRuntimeEvent } from "@/lib/runtime/emitRuntimeEvent";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const STEPS = [
  { id: "welcome", title: "Welcome", body: "We unlock surfaces as you log signal." },
  { id: "checkin", title: "Your first check-in", body: "Log readiness, fatigue, recovery — any one." },
  { id: "scope", title: "Privacy & sharing", body: "You control what coaches see." },
  { id: "ready", title: "You're ready", body: "Today's session unlocks now." },
];

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

  return (
    <DashboardLayout>
      <main className="mx-auto max-w-2xl space-y-4 p-4">
        <RuntimeCard
          eyebrow={onboardingCopy.step(Math.min(nextIdx + 1, STEPS.length), STEPS.length)}
          title={cur.title}
          tone="elevated"
        >
          <p className="mb-4 text-sm text-muted-foreground">{cur.body}</p>
          <Button onClick={complete} disabled={busy || done} size="lg">
            {done ? "All set" : "Continue"}
          </Button>
        </RuntimeCard>
      </main>
    </DashboardLayout>
  );
}
