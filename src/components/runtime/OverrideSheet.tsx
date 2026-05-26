import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { emitRuntimeEvent, type RuntimeTopic } from "@/lib/runtime/emitRuntimeEvent";
import { toast } from "sonner";

const REASONS = [
  { value: "travel", label: "Travel / disruption" },
  { value: "illness", label: "Illness / symptoms" },
  { value: "injury", label: "Injury / soreness" },
  { value: "schedule", label: "Schedule conflict" },
  { value: "coach_directive", label: "Coach directive" },
  { value: "other", label: "Other" },
] as const;

const SEVERITY = [
  { value: "low", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "High" },
] as const;

/**
 * Shared override/deviation sheet. Routes through emitRuntimeEvent so every
 * action lands as an append-only canonical event with full lineage refs back
 * to the prescription or session it originated from.
 */
export function OverrideSheet({
  open,
  onOpenChange,
  topic,
  prescriptionEventId,
  sessionEventId,
  actorRole = "athlete",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  topic: RuntimeTopic;
  prescriptionEventId?: string | null;
  sessionEventId?: string | null;
  actorRole?: "athlete" | "coach";
}) {
  const { user } = useAuth();
  const [reason, setReason] = useState<string>("travel");
  const [severity, setSeverity] = useState<string>("moderate");
  const [note, setNote] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!user) return;
    setSubmitting(true);
    try {
      const lineage = [prescriptionEventId, sessionEventId].filter(
        (x): x is string => !!x,
      );
      await emitRuntimeEvent({
        athleteId: user.id,
        actorId: user.id,
        actorRole,
        topic,
        payload: { reason, severity, note: note.trim() || null },
        causalityRefs: lineage,
        lineageRefs: lineage,
      });
      toast.success("Logged — lineage preserved");
      onOpenChange(false);
      setNote("");
    } catch (e) {
      toast.error("Could not log — try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>
            {topic === "prescription.override.requested"
              ? "Request a change"
              : topic === "session.deviation.logged"
                ? "Log a deviation"
                : "Acknowledge override"}
          </SheetTitle>
          <SheetDescription>
            This becomes a canonical event. Nothing is hidden; the coach sees
            the same lineage you do.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Severity</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEVERITY.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything coach or future-you should know"
              rows={3}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full"
            size="lg"
          >
            {submitting ? "Logging…" : "Log to ledger"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
