import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useAthleteCommandRows } from "@/hooks/command/useAthleteCommandRows";
import { buildDailyPrescription } from "@/lib/runtime/prescription";
import { latestByTopicPrefix } from "@/lib/command/projections";
import { PulseStrip } from "@/components/runtime/PulseStrip";
import { PrescriptionCard } from "@/components/runtime/PrescriptionCard";
import { OverrideSheet } from "@/components/runtime/OverrideSheet";
import { RuntimeCard } from "@/components/runtime/RuntimeCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, MessageSquare, ArrowRight } from "lucide-react";
import { emitRuntimeEvent } from "@/lib/runtime/emitRuntimeEvent";
import { toast } from "sonner";
import { CommandCenterSection } from "@/components/command/CommandCenterSection";

export default function Today() {
  const { user, loading, isAuthStable } = useAuth();
  const navigate = useNavigate();
  const { data: rows, isLoading } = useAthleteCommandRows({ days: 30, limit: 500 });
  const [overrideOpen, setOverrideOpen] = useState(false);

  useEffect(() => {
    if (!loading && isAuthStable && !user) navigate("/auth", { replace: true });
  }, [loading, isAuthStable, user, navigate]);

  const rx = useMemo(() => buildDailyPrescription(rows), [rows]);
  const todaysRenderEvent = useMemo(
    () => latestByTopicPrefix(rows, "prescription.daily.rendered"),
    [rows],
  );

  async function logFeeling() {
    if (!user) return;
    try {
      await emitRuntimeEvent({
        athleteId: user.id,
        actorId: user.id,
        actorRole: "athlete",
        topic: "runtime.feedback.captured",
        payload: { kind: "check_in", at: new Date().toISOString() },
      });
      toast.success("Check-in logged");
    } catch {
      toast.error("Could not log");
    }
  }

  if (isLoading || !user) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-3xl space-y-4 p-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-3xl space-y-6 p-4">
        <header className="flex items-baseline justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Today
            </div>
            <h1 className="text-2xl font-bold leading-tight">
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </h1>
          </div>
        </header>

        <PulseStrip rx={rx} />

        {/* 2. Command Center — primary organism view */}
        <CommandCenterSection />

        {/* 3. Today's prescription */}
        <PrescriptionCard
          rx={rx}
          prescriptionEventId={todaysRenderEvent?.event_id ?? rx.sourceEventIds[0] ?? null}
          onRequestChange={() => setOverrideOpen(true)}
        />

        {/* 4. Weekly digest preview */}
        <RuntimeCard
          eyebrow="Your week"
          title="Weekly organism digest"
          trailing={<ArrowRight className="h-4 w-4 text-muted-foreground" />}
        >
          <p className="mb-3 text-sm text-muted-foreground">
            A simple story of how your body did this week.
          </p>
          <Button asChild variant="outline" className="w-full min-h-11">
            <Link to="/digest">Open weekly digest</Link>
          </Button>
        </RuntimeCard>

        {/* 5. Bounded forecast preview */}
        <RuntimeCard
          eyebrow="What's next"
          title="What's likely if patterns continue"
          trailing={<ArrowRight className="h-4 w-4 text-muted-foreground" />}
        >
          <p className="mb-3 text-sm text-muted-foreground">
            A calm look at the next few days and weeks.
          </p>
          <Button asChild variant="outline" className="w-full min-h-11">
            <Link to="/forecast">Open forecast</Link>
          </Button>
        </RuntimeCard>

        {/* 6. Recovery / education / history */}
        <RuntimeCard
          eyebrow="Action"
          title="Log how I feel"
          trailing={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
        >
          <p className="mb-3 text-sm text-muted-foreground">
            Quick check-in. Becomes a canonical event you and your coach can both replay.
          </p>
          <Button variant="outline" onClick={logFeeling} className="w-full min-h-11">
            Log check-in
          </Button>
        </RuntimeCard>

        <RuntimeCard
          eyebrow="History"
          title="Recent prescriptions & overrides"
          trailing={<ClipboardList className="h-4 w-4 text-muted-foreground" />}
        >
          <RecentList rows={rows ?? []} />
        </RuntimeCard>

        <OverrideSheet
          open={overrideOpen}
          onOpenChange={setOverrideOpen}
          topic="prescription.override.requested"
          prescriptionEventId={todaysRenderEvent?.event_id ?? null}
        />
      </div>
    </DashboardLayout>
  );
}

function RecentList({ rows }: { rows: Array<{ event_id: string; topic_id: string; occurred_at: string }> }) {
  const filtered = rows
    .filter(
      (r) =>
        r.topic_id.startsWith("session.") ||
        r.topic_id.startsWith("prescription.") ||
        r.topic_id.startsWith("runtime."),
    )
    .slice(0, 6);
  if (!filtered.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No runtime events yet. Start a session or log a check-in.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {filtered.map((r) => (
        <li
          key={r.event_id}
          className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2 text-sm"
        >
          <span className="truncate font-mono text-xs">{r.topic_id}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {new Date(r.occurred_at).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        </li>
      ))}
    </ul>
  );
}
