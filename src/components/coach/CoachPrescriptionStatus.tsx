/**
 * CoachPrescriptionStatus — the coach's view of sent prescriptions:
 * whether each player used it instead, added it alongside, saved it, or
 * declined (owner request Oct 24). Read-only; never authors training.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList } from "lucide-react";
import { useSentCoachPrescriptions, type CoachRxStatus } from "@/hooks/useCoachPrescriptions";

const STATUS_LABEL: Record<CoachRxStatus, string> = {
  pending: "Waiting for player",
  used_instead: "Used instead of their card",
  added_alongside: "Added alongside",
  saved_for_later: "Saved for later",
  declined: "Declined",
};

export function CoachPrescriptionStatus() {
  const { data, isLoading } = useSentCoachPrescriptions();
  if (isLoading || !data || data.length === 0) return null;

  return (
    <Card data-coach-rx-status>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="h-5 w-5" />
          Sent workouts — player choices
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.slice(0, 20).map((rx) => (
          <div key={rx.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium">{rx.title}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {rx.category} · {new Date(`${rx.plan_date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </p>
            </div>
            <Badge variant={rx.status === "used_instead" ? "default" : "secondary"} className="shrink-0 text-xs">
              {STATUS_LABEL[rx.status]}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
