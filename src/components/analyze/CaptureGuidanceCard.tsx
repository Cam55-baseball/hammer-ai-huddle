import { Camera, Check, Gauge, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { CaptureGuidance } from "@/lib/biomech/captureGuidance";

/** Shown before analysis when the file's frame rate limits what can be measured. Never blocks. */
export function CaptureGuidanceCard({
  guidance,
  onContinue,
  onCancel,
}: {
  guidance: CaptureGuidance;
  onContinue: () => void;
  onCancel: () => void;
}) {
  const rate = guidance.fps == null ? null : Math.round(guidance.fps * 100) / 100;
  return (
    <Card className="border-warning/50 p-4 sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        <Gauge className="h-5 w-5 text-warning" />
        <h3 className="text-lg font-semibold">
          {rate == null
            ? "We couldn't read this clip's frame rate"
            : `This clip was filmed at ${rate} frames per second`}
        </h3>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">
        Some measurements need at least 60 frames per second to catch fast moments like the foot plant.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-sm font-medium">Will work</p>
          <ul className="space-y-1 text-sm">
            {guidance.possible.map((m) => (
              <li key={m} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{m}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1 text-sm font-medium">Won't be possible</p>
          <ul className="space-y-1 text-sm">
            {guidance.notPossible.map((m) => (
              <li key={m} className="flex gap-2"><X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />{m}</li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-4 flex items-start gap-2 text-sm">
        <Camera className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>{guidance.fix}</span>
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button onClick={onContinue}>Continue — mechanics feedback only</Button>
        <Button variant="outline" onClick={onCancel}>Cancel and re-film</Button>
      </div>
    </Card>
  );
}
