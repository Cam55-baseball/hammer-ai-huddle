import { CheckCircle2, Camera, Loader2, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { PreflightVerdict } from "@/lib/biomech/pose/clipPreflight";

/** One-second clip check shown as soon as a clip is chosen. Never blocks analysis. */
export function ClipPreflightCard({ verdict, checking }: { verdict: PreflightVerdict | null; checking: boolean }) {
  if (checking) {
    return (
      <Card className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking your clip…
      </Card>
    );
  }
  if (!verdict) return null;
  if (verdict.issues.length === 0) {
    return (
      <Card className="flex items-center gap-2 border-primary/40 p-4 text-sm" data-testid="clip-preflight-ok">
        <CheckCircle2 className="h-4 w-4 text-primary" /> Good clip — the player is clear and fills the frame.
      </Card>
    );
  }
  return (
    <Card className="space-y-3 border-warning/50 p-4" data-testid="clip-preflight-issues">
      <p className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="h-4 w-4 text-warning" />
        {verdict.willRead ? "Your clip will work, with one note" : "Your report card probably won't read from this clip"}
      </p>
      <ul className="space-y-2">
        {verdict.issues.map((i) => (
          <li key={i.kind} className="space-y-0.5">
            <p className="text-sm font-medium">{i.title}</p>
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <Camera className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {i.fix}
            </p>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">You can still analyse it — your coaching and drills will be made either way.</p>
    </Card>
  );
}
