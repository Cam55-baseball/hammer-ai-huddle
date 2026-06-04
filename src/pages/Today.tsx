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
import { ClipboardList, MessageSquare } from "lucide-react";
import { emitRuntimeEvent } from "@/lib/runtime/emitRuntimeEvent";
import { toast } from "sonner";
import { CommandCenterSection } from "@/components/command/CommandCenterSection";
import { CommunicationAI } from "@/components/dashboard/CommunicationAI";
import { topicLabel } from "@/lib/asb/topicLabels";
import { TodayGuidanceSlots } from "@/components/today/TodayGuidanceSlots";
import { HammerSetbackGuidance } from "@/components/runtime/HammerSetbackGuidance";
import type { SetbackStateKind } from "@/lib/runtime/setback/types";

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
      <div className="mx-auto w-full max-w-5xl space-y-6 p-4">
        {/* Fused organism summary: pulse + command center read as one block */}
        <div className="space-y-3">
          <PulseStrip rx={rx} />
          <CommunicationAI />
          <CommandCenterSection />
        </div>

        {/* Today's plan */}
        <TodayGuidanceSlots
          latestPrescriptionEventId={todaysRenderEvent?.event_id ?? rx.sourceEventIds[0] ?? null}
          hasSignal={(rows?.length ?? 0) > 0}
        />
        <PrescriptionCard
          rx={rx}
          prescriptionEventId={todaysRenderEvent?.event_id ?? rx.sourceEventIds[0] ?? null}
          onRequestChange={() => setOverrideOpen(true)}
        />

        {/* Compact link tiles */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Button asChild variant="outline" className="h-auto min-h-16 justify-between px-4 py-3">
            <Link to="/digest" className="flex flex-col items-start gap-0.5">
              <span className="text-xs text-muted-foreground">Your week</span>
              <span className="text-sm font-medium">Weekly recap</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto min-h-16 justify-between px-4 py-3">
            <Link to="/forecast" className="flex flex-col items-start gap-0.5">
              <span className="text-xs text-muted-foreground">What's next</span>
              <span className="text-sm font-medium">What's likely</span>
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={logFeeling}
            className="h-auto min-h-16 flex-col items-start justify-between gap-0.5 px-4 py-3"
          >
            <span className="flex w-full items-center justify-between text-xs text-muted-foreground">
              Quick action <MessageSquare className="h-3 w-3" />
            </span>
            <span className="text-sm font-medium">Log how I feel</span>
          </Button>
        </div>

        {/* Recent activity */}
        <RuntimeCard
          eyebrow="History"
          title="Recent activity"
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
        Nothing yet. Start a session or log a check-in.
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
          <span className="min-w-0 flex-1 truncate" title={r.topic_id}>
            {topicLabel(r.topic_id)}
          </span>
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
