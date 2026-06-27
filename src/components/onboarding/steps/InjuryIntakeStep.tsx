/**
 * InjuryIntakeStep — onboarding step (D). New athletes can't miss it.
 *
 * "I'm healthy" is a first-class option that emits NOTHING — explicit
 * missingness preserved per Phase 151 doctrine.
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { ArrowRight, ShieldCheck } from "lucide-react";
import {
  REPORT_INJURY_REGIONS,
  reportInjury,
  type ReportInjuryRegionKey,
  type ReportInjurySeverity,
} from "@/lib/hammer/injury/reportInjury";

interface Props {
  onContinue: () => void;
  onBack: () => void;
}

export function InjuryIntakeStep({ onContinue, onBack }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [mode, setMode] = useState<"choose" | "healthy" | "report">("choose");
  const [region, setRegion] = useState<ReportInjuryRegionKey | null>(null);
  const [severity, setSeverity] = useState<ReportInjurySeverity>("sore");
  const [busy, setBusy] = useState(false);

  async function submitReport() {
    if (!user || !region || busy) return;
    setBusy(true);
    try {
      await reportInjury({ userId: user.id, region, severity, queryClient: qc });
      toast.success("Logged. Your plan starts protected.");
      onContinue();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Anything hurt right now?</h2>
      <p className="text-sm text-muted-foreground">
        We never diagnose. What you say here gates what Hammer asks of you on
        day one — and you can change it any time.
      </p>

      {mode === "choose" && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            onClick={() => setMode("healthy")}
            className="flex items-start gap-2 rounded-md border border-border p-3 text-left transition hover:border-foreground/30"
          >
            <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
            <div>
              <div className="text-sm font-medium">I'm healthy</div>
              <div className="text-xs text-muted-foreground">Nothing limiting today</div>
            </div>
          </button>
          <button
            onClick={() => setMode("report")}
            className="rounded-md border border-border p-3 text-left transition hover:border-foreground/30"
          >
            <div className="text-sm font-medium">Something hurts</div>
            <div className="text-xs text-muted-foreground">Tell us so we plan around it</div>
          </button>
        </div>
      )}

      {mode === "healthy" && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
          Got it. No injury event logged — your missingness is preserved (we
          never fabricate health state).
        </div>
      )}

      {mode === "report" && (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Region</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {REPORT_INJURY_REGIONS.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setRegion(r.key)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                    region === r.key
                      ? "border-primary bg-primary/10"
                      : "border-border text-muted-foreground hover:border-foreground/40"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs">How limiting?</Label>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              {(["niggle", "sore", "limiting", "cannot_train"] as ReportInjurySeverity[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setSeverity(v)}
                  className={`rounded-md border p-2 text-xs capitalize ${
                    severity === v ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  {v.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between gap-2">
        <Button variant="ghost" onClick={onBack} disabled={busy}>
          Back
        </Button>
        {mode === "choose" && (
          <Button variant="outline" onClick={onContinue}>
            Skip <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
        {mode === "healthy" && (
          <Button onClick={onContinue}>
            Continue <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
        {mode === "report" && (
          <Button onClick={submitReport} disabled={busy || !region}>
            {busy ? "Saving…" : "Save & continue"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </section>
  );
}
