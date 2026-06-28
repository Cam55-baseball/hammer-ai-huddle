/**
 * ReportInjuryDialog — single canonical UI for athlete-declared injury.
 *
 * Used by HammerDailyPlan (A), TellHammerDialog (B), AthleteOnboarding (D).
 * Constitutional path: emits relational.injury.reported (RR-6) via reportInjury().
 *
 * Design intent: minimum clutter, clear labels above every input,
 * text-box-first so athletes know exactly where to write what.
 */
import { useEffect, useState } from "react";
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
import { useOptionalAuth } from "@/hooks/useAuth";
import {
  REPORT_INJURY_REGIONS,
  reportInjury,
  type ReportInjuryRegionKey,
  type ReportInjurySeverity,
} from "@/lib/hammer/injury/reportInjury";
import { readDraftSlot, writeDraftSlot, clearDraftSlot } from "@/lib/onboarding/draftStore";
import { LogOut } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillRegion?: ReportInjuryRegionKey | null;
  prefillNote?: string;
  onReported?: (eventId: string) => void;
}

const SEVERITY_OPTIONS: Array<{
  value: ReportInjurySeverity;
  label: string;
  help: string;
}> = [
  { value: "niggle", label: "Niggle", help: "I feel it. Training as usual." },
  { value: "sore", label: "Sore", help: "Modify some work today." },
  { value: "limiting", label: "Limiting", help: "Cuts what I can do." },
  { value: "cannot_train", label: "Can't train", help: "Skip affected work." },
];

export function ReportInjuryDialog({
  open,
  onOpenChange,
  prefillRegion = null,
  prefillNote = "",
  onReported,
}: Props) {
  const { user } = useOptionalAuth();
  const qc = useQueryClient();
  const [region, setRegion] = useState<ReportInjuryRegionKey | null>(prefillRegion);
  const [severity, setSeverity] = useState<ReportInjurySeverity | null>(null);
  const [note, setNote] = useState(prefillNote);
  const [busy, setBusy] = useState(false);

  // Reset on open; hydrate from draft if present so user resumes mid-intake.
  useEffect(() => {
    if (open) {
      setRegion(prefillRegion);
      setNote(prefillNote);
      setSeverity(null);
      setBusy(false);
      if (user?.id) {
        readDraftSlot<{ region: ReportInjuryRegionKey | null; severity: ReportInjurySeverity | null; note: string }>(
          user.id,
          "injury-intake",
        ).then((draft) => {
          if (!draft) return;
          if (!prefillRegion && draft.region) setRegion(draft.region);
          if (draft.severity) setSeverity(draft.severity);
          if (!prefillNote && draft.note) setNote(draft.note);
        });
      }
    }
  }, [open, prefillRegion, prefillNote, user?.id]);

  // Autosave draft whenever any field changes while dialog is open.
  useEffect(() => {
    if (!open || !user?.id) return;
    writeDraftSlot(user.id, "injury-intake", { region, severity, note });
  }, [open, user?.id, region, severity, note]);

  const canSubmit = !!user && !!region && !!severity && !busy;

  async function submit() {
    if (!canSubmit || !user || !region || !severity) return;
    setBusy(true);
    try {
      const { eventId } = await reportInjury({
        userId: user.id,
        region,
        severity,
        note: note.trim() || undefined,
        queryClient: qc,
      });
      toast.success("Got it — Hammer is planning around this.");
      if (user?.id) clearDraftSlot(user.id, "injury-intake");
      onReported?.(eventId);
      onOpenChange(false);
    } catch (e) {
      console.error("[ReportInjuryDialog] submit failed", e);
      toast.error(e instanceof Error ? e.message : "Couldn't save the report");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Report an injury</DialogTitle>
          <DialogDescription className="text-xs">
            Your words gate what Hammer asks of you today. We never diagnose.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* 1 — Where */}
          <section className="space-y-2">
            <Label className="text-xs font-medium">1 · Where does it hurt?</Label>
            <div className="flex flex-wrap gap-1.5">
              {REPORT_INJURY_REGIONS.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setRegion(r.key)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                    region === r.key
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-border text-muted-foreground hover:border-foreground/40"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </section>

          {/* 2 — How limiting */}
          <section className="space-y-2">
            <Label className="text-xs font-medium">
              2 · How much is it limiting you?
            </Label>
            <div className="grid grid-cols-2 gap-1.5">
              {SEVERITY_OPTIONS.map((s) => {
                const active = severity === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSeverity(s.value)}
                    className={`flex flex-col items-start gap-0.5 rounded-md border p-2 text-left transition ${
                      active
                        ? "border-primary bg-primary/10"
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
          </section>

          {/* 3 — Free text */}
          <section className="space-y-2">
            <Label htmlFor="injury-note" className="text-xs font-medium">
              3 · Describe it in your own words{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="injury-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="When it started, what makes it worse, left/right side, anything else…"
              className="text-xs"
            />
          </section>

          <p className="text-[10px] text-muted-foreground">
            Only you, a parent, or a clinician can clear an injury (RR-6).
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={submit} disabled={!canSubmit}>
              {busy ? "Saving…" : "Report it"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
