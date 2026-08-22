/**
 * RR-6 — "Coming back" card.
 *
 * Shows the athlete their own injury arc: what they reported, how the plan
 * adapted, the graded steps they logged, and who authorized full return.
 * It never says "you are ready" — only a parent or clinician can close an arc.
 */
import { useState } from "react";
import { format } from "date-fns";
import { HeartPulse, ShieldCheck, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { STAGE_COPY, type InjuryArc } from "@/lib/hammer/injury/continuity";
import {
  useInjuryContinuity,
  useLogRecoveryCheckpoint,
} from "@/hooks/useInjuryContinuity";
import type {
  InjuryCheckpointType,
  InjuryParticipationStatus,
} from "@/lib/runtime/relational/injurySchemas";

const CHECKPOINTS: { value: InjuryCheckpointType; label: string }[] = [
  { value: "mobility", label: "Mobility / range work" },
  { value: "strength", label: "Strength work" },
  { value: "conditioning", label: "Conditioning / running" },
  { value: "throwing", label: "Throwing" },
  { value: "general", label: "General session" },
];

const STATUSES: { value: InjuryParticipationStatus; label: string }[] = [
  { value: "inactive", label: "Couldn't do it" },
  { value: "limited", label: "Did some, still limited" },
  { value: "modified", label: "Did it modified" },
  { value: "full", label: "Did it with no limits" },
];

function ArcRow({ arc, userId }: { arc: InjuryArc; userId: string }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<InjuryCheckpointType>("general");
  const [status, setStatus] = useState<InjuryParticipationStatus>("modified");
  const log = useLogRecoveryCheckpoint();
  const copy = STAGE_COPY[arc.stage];

  const submit = () => {
    log.mutate(
      {
        userId,
        bodyRegion: arc.body_region,
        checkpointType: type,
        participationStatus: status,
        originEventId: arc.origin_event_id,
      },
      {
        onSuccess: () => toast.success("Step logged."),
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : "Could not log that step."),
      },
    );
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 p-3 text-left">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold capitalize">{arc.body_region}</span>
            <Badge variant={arc.human_authorized ? "secondary" : "outline"}>
              {copy.label}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{copy.help}</p>
        </div>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")}
        />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <CardContent className="space-y-3 pt-0">
          <ol className="space-y-1 border-l pl-3 text-xs text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Reported</span> ·{" "}
              {format(new Date(arc.opened_at), "MMM d")} · {arc.severity_band}
            </li>
            {arc.checkpoints.map((c) => (
              <li key={c.event_id}>
                <span className="font-medium text-foreground">
                  {CHECKPOINTS.find((x) => x.value === c.checkpoint_type)?.label ??
                    c.checkpoint_type}
                </span>{" "}
                · {format(new Date(c.occurred_at), "MMM d")} ·{" "}
                {STATUSES.find((s) => s.value === c.participation_status)?.label ??
                  c.participation_status}
              </li>
            ))}
            {arc.human_authorized && arc.authorized_at && (
              <li className="text-foreground">
                <ShieldCheck className="mr-1 inline h-3 w-3" />
                Return authorized by {arc.authorized_by_role ?? "an adult"} ·{" "}
                {format(new Date(arc.authorized_at), "MMM d")}
              </li>
            )}
          </ol>

          {!arc.human_authorized && (
            <div className="space-y-2 rounded-md bg-muted/40 p-3">
              <p className="text-xs font-medium">Log a step</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Select value={type} onValueChange={(v) => setType(v as InjuryCheckpointType)}>
                  <SelectTrigger className="sm:w-1/2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHECKPOINTS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as InjuryParticipationStatus)}
                >
                  <SelectTrigger className="sm:w-1/2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                className="w-full"
                onClick={submit}
                disabled={log.isPending}
              >
                {log.isPending ? "Saving…" : "Log step"}
              </Button>
              <p className="text-[11px] leading-snug text-muted-foreground">
                Hammer never clears you to return. When you're ready, a parent or
                clinician records the authorization.
              </p>
            </div>
          )}
        </CardContent>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function InjuryContinuityCard({ userId }: { userId: string | null }) {
  const { data: arcs, isLoading } = useInjuryContinuity(userId);
  if (!userId || isLoading || !arcs || arcs.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <HeartPulse className="h-4 w-4 text-destructive" />
          Coming back
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {arcs.map((arc) => (
          <ArcRow key={arc.origin_event_id} arc={arc} userId={userId} />
        ))}
      </CardContent>
    </Card>
  );
}
