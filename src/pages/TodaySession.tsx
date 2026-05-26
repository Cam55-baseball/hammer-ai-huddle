import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useAthleteCommandRows } from "@/hooks/command/useAthleteCommandRows";
import { buildDailyPrescription, type PrescriptionBlock } from "@/lib/runtime/prescription";
import { RuntimeCard } from "@/components/runtime/RuntimeCard";
import { StateBadge } from "@/components/runtime/StateBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { emitRuntimeEvent } from "@/lib/runtime/emitRuntimeEvent";
import { OverrideSheet } from "@/components/runtime/OverrideSheet";
import { toast } from "sonner";
import { Check, SkipForward, Replace, Pencil } from "lucide-react";

type BlockStatus = "pending" | "in_progress" | "completed" | "skipped" | "modified" | "substituted";

/**
 * Linear session execution — one block at a time, mobile-first.
 * Every transition emits an append-only canonical event cited back to the
 * prescription. Post-session capture emits session.response.captured.
 */
export default function TodaySession() {
  const { id: prescriptionEventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: rows, isLoading } = useAthleteCommandRows({ days: 7, limit: 200 });
  const rx = useMemo(() => buildDailyPrescription(rows), [rows]);

  const [sessionEventId, setSessionEventId] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<BlockStatus[]>(() =>
    rx.blocks.map(() => "pending"),
  );
  const [activeIdx, setActiveIdx] = useState(0);
  const [rpe, setRpe] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (rx.blocks.length && statuses.length !== rx.blocks.length) {
      setStatuses(rx.blocks.map(() => "pending"));
    }
  }, [rx.blocks.length, statuses.length]);

  async function startSessionIfNeeded(): Promise<string | null> {
    if (sessionEventId || !user) return sessionEventId;
    const id = await emitRuntimeEvent({
      athleteId: user.id,
      actorId: user.id,
      actorRole: "athlete",
      topic: "session.started",
      payload: { kind: rx.kind, block_count: rx.blocks.length },
      causalityRefs: prescriptionEventId ? [prescriptionEventId] : [],
      lineageRefs: prescriptionEventId ? [prescriptionEventId] : [],
    });
    setSessionEventId(id);
    return id;
  }

  async function transition(idx: number, topic: Parameters<typeof emitRuntimeEvent>[0]["topic"], extra: Record<string, unknown> = {}) {
    if (!user) return;
    const sid = await startSessionIfNeeded();
    const block = rx.blocks[idx];
    await emitRuntimeEvent({
      athleteId: user.id,
      actorId: user.id,
      actorRole: "athlete",
      topic,
      payload: { block_id: block.id, block_name: block.name, ...extra },
      causalityRefs: [sid, prescriptionEventId].filter((x): x is string => !!x),
      lineageRefs: [sid, prescriptionEventId].filter((x): x is string => !!x),
    });
  }

  function markStatus(idx: number, s: BlockStatus, advance = true) {
    setStatuses((prev) => {
      const next = [...prev];
      next[idx] = s;
      return next;
    });
    if (advance && idx + 1 < rx.blocks.length) setActiveIdx(idx + 1);
    if (advance && idx + 1 >= rx.blocks.length) setCompleted(true);
  }

  async function onBegin(idx: number) {
    markStatus(idx, "in_progress", false);
    await transition(idx, "session.block.started");
  }
  async function onComplete(idx: number) {
    markStatus(idx, "completed");
    await transition(idx, "session.block.completed");
  }
  async function onSkip(idx: number) {
    markStatus(idx, "skipped");
    await transition(idx, "session.block.skipped");
    toast.message("Block skipped — logged");
  }
  async function onModify(idx: number) {
    markStatus(idx, "modified");
    await transition(idx, "session.block.modified", { note: "athlete-modified" });
    toast.message("Modification logged");
  }
  async function onSubstitute(idx: number) {
    markStatus(idx, "substituted");
    await transition(idx, "session.block.substituted", { note: "athlete-substituted" });
    toast.message("Substitution logged");
  }

  async function capturePostSession() {
    if (!user) return;
    const sid = await startSessionIfNeeded();
    await emitRuntimeEvent({
      athleteId: user.id,
      actorId: user.id,
      actorRole: "athlete",
      topic: "session.response.captured",
      payload: {
        rpe,
        note: note.trim() || null,
        completed_blocks: statuses.filter((s) => s === "completed").length,
        total_blocks: rx.blocks.length,
      },
      causalityRefs: [sid, prescriptionEventId].filter((x): x is string => !!x),
      lineageRefs: [sid, prescriptionEventId].filter((x): x is string => !!x),
    });
    toast.success("Session logged");
    navigate("/today");
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-xl space-y-3 p-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!rx.blocks.length) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-xl p-4">
          <RuntimeCard title="No active session" eyebrow="Session">
            <p className="text-sm text-muted-foreground">
              Today's prescription has no blocks. Return to /today to log a
              check-in or wait for organism signal.
            </p>
            <Button onClick={() => navigate("/today")} className="mt-4 w-full">
              Back to Today
            </Button>
          </RuntimeCard>
        </div>
      </DashboardLayout>
    );
  }

  if (completed) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-xl space-y-4 p-4">
          <RuntimeCard
            eyebrow="Session complete"
            title="How did that feel?"
            trailing={<StateBadge state="calm" label="Done" />}
          >
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>RPE (1–5)</Label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Button
                      key={n}
                      variant={rpe === n ? "default" : "outline"}
                      size="lg"
                      className="flex-1"
                      onClick={() => setRpe(n)}
                    >
                      {n}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Note (optional)</Label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Anything to remember"
                />
              </div>
              <Button onClick={capturePostSession} size="lg" className="w-full">
                Save to ledger
              </Button>
            </div>
          </RuntimeCard>
        </div>
      </DashboardLayout>
    );
  }

  const active: PrescriptionBlock = rx.blocks[activeIdx];
  const activeStatus = statuses[activeIdx];

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-xl space-y-4 p-4">
        <header className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Session · {rx.kind}
            </div>
            <h1 className="text-xl font-bold leading-tight">{rx.headline}</h1>
          </div>
          <StateBadge state={rx.state} />
        </header>

        <div className="flex gap-1.5">
          {rx.blocks.map((_, i) => (
            <div
              key={i}
              className={
                "h-1.5 flex-1 rounded-full " +
                (statuses[i] === "completed"
                  ? "bg-state-calm"
                  : statuses[i] === "skipped" || statuses[i] === "substituted"
                    ? "bg-state-watch"
                    : i === activeIdx
                      ? "bg-foreground"
                      : "bg-border")
              }
            />
          ))}
        </div>

        <RuntimeCard
          tone="elevated"
          eyebrow={`Block ${activeIdx + 1} of ${rx.blocks.length} · ${active.cnsDemand} CNS`}
          title={active.name}
        >
          <p className="mb-1 text-sm text-muted-foreground">{active.intent}</p>
          <p className="mb-4 text-base text-foreground">{active.detail}</p>

          {activeStatus === "pending" ? (
            <Button
              onClick={() => onBegin(activeIdx)}
              size="lg"
              className="w-full"
            >
              Begin
            </Button>
          ) : (
            <div className="space-y-2">
              <Button
                onClick={() => onComplete(activeIdx)}
                size="lg"
                className="w-full"
              >
                <Check className="mr-2 h-4 w-4" />
                Complete
              </Button>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" onClick={() => onModify(activeIdx)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  Modify
                </Button>
                <Button variant="outline" onClick={() => onSubstitute(activeIdx)}>
                  <Replace className="mr-1 h-3.5 w-3.5" />
                  Sub
                </Button>
                <Button variant="outline" onClick={() => onSkip(activeIdx)}>
                  <SkipForward className="mr-1 h-3.5 w-3.5" />
                  Skip
                </Button>
              </div>
            </div>
          )}
        </RuntimeCard>

        <div className="flex gap-2">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => setOverrideOpen(true)}
          >
            Log deviation
          </Button>
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => navigate("/today")}
          >
            Pause
          </Button>
        </div>

        <OverrideSheet
          open={overrideOpen}
          onOpenChange={setOverrideOpen}
          topic="session.deviation.logged"
          prescriptionEventId={prescriptionEventId ?? null}
          sessionEventId={sessionEventId}
        />
      </div>
    </DashboardLayout>
  );
}
