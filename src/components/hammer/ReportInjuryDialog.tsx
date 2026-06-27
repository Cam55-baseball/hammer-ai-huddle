/**
 * ReportInjuryDialog — single canonical UI for athlete-declared injury.
 *
 * Used by HammerDailyPlan (A) and TellHammerDialog (B). The onboarding
 * step (D) reuses the same body via the embedded form.
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  REPORT_INJURY_REGIONS,
  reportInjury,
  type ReportInjuryRegionKey,
  type ReportInjurySeverity,
} from "@/lib/hammer/injury/reportInjury";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional prefilled region (e.g. from TellHammer phrase detection). */
  prefillRegion?: ReportInjuryRegionKey | null;
  /** Optional prefilled note (free-text context). */
  prefillNote?: string;
  /** Called after a successful report. */
  onReported?: (eventId: string) => void;
}

const SEVERITIES: Array<{ value: ReportInjurySeverity; label: string; help: string }> = [
  { value: "niggle", label: "Niggle", help: "I notice it but training as usual" },
  { value: "sore", label: "Sore", help: "Modify some work today" },
  { value: "limiting", label: "Limiting", help: "Cuts into what I can do" },
  { value: "cannot_train", label: "Can't train", help: "Skip the affected work entirely" },
];

const SIDES: Array<{ value: "left" | "right" | "bilateral" | "na"; label: string }> = [
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "bilateral", label: "Both" },
  { value: "na", label: "N/A" },
];

export function ReportInjuryDialog({
  open,
  onOpenChange,
  prefillRegion = null,
  prefillNote = "",
  onReported,
}: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [region, setRegion] = useState<ReportInjuryRegionKey | null>(prefillRegion);
  const [severity, setSeverity] = useState<ReportInjurySeverity>("sore");
  const [side, setSide] = useState<"left" | "right" | "bilateral" | "na">("na");
  const [note, setNote] = useState(prefillNote);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!user || !region || busy) return;
    setBusy(true);
    try {
      const { eventId } = await reportInjury({
        userId: user.id,
        region,
        severity,
        side,
        note: note.trim() || undefined,
        queryClient: qc,
      });
      toast.success("Reported — your plan will adapt to protect this.", {
        description: "Hammer will route around this until you mark it cleared.",
      });
      onReported?.(eventId);
      onOpenChange(false);
      setNote("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save the report");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report an injury or pain</DialogTitle>
          <DialogDescription>
            What you say outranks anything we infer. We never diagnose — your
            words gate what Hammer asks of you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs">Body region</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {REPORT_INJURY_REGIONS.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setRegion(r.key)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                    region === r.key
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:border-foreground/40"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">How limiting is it?</Label>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              {SEVERITIES.map((s) => {
                const active = severity === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSeverity(s.value)}
                    className={`flex flex-col items-start gap-0.5 rounded-md border p-2 text-left transition ${
                      active
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-foreground/30"
                    }`}
                  >
                    <span className="text-xs font-medium">{s.label}</span>
                    <span className="text-[10px] leading-tight text-muted-foreground">
                      {s.help}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label className="text-xs">Side</Label>
            <div className="mt-1.5 flex gap-1.5">
              {SIDES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSide(s.value)}
                  className={`rounded-md border px-3 py-1 text-[11px] transition ${
                    side === s.value
                      ? "border-primary bg-primary/10"
                      : "border-border text-muted-foreground hover:border-foreground/40"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Anything else? (optional)</Label>
            <Textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Started yesterday after long-toss; tight not sharp."
              className="mt-1 text-xs"
            />
          </div>

          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-[11px] text-amber-900 dark:text-amber-200">
            We never authorize return-to-play. Only you, your parent, or your
            clinician can clear an injury (RR-6).
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button size="sm" onClick={submit} disabled={busy || !region}>
              {busy ? "Saving…" : "Report it"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
