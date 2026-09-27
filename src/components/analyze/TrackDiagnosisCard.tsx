import { AlertTriangle, Camera } from "lucide-react";
import { Card } from "@/components/ui/card";
import { UNDETERMINED_MESSAGE, type TrackDiagnosis } from "@/lib/biomech/pose/trackDiagnosis";

/** Plain-language reason the athlete track broke, dominant cause first. */
export function TrackDiagnosisCard({ diagnosis }: { diagnosis: TrackDiagnosis }) {
  if (diagnosis.status === "clean") return null;
  const msgs = diagnosis.status === "undetermined" ? [UNDETERMINED_MESSAGE] : diagnosis.messages;
  return (
    <Card className="border-warning/50 p-4 sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-warning" />
        <h3 className="text-lg font-semibold">
          {diagnosis.track_reliable === false
            ? "We couldn't follow the athlete through this clip"
            : "Something about the filming limited this analysis"}
        </h3>
      </div>
      <ol className="space-y-3">
        {msgs.map((m, i) => (
          <li key={m.title} className="space-y-1">
            <p className="font-medium">
              {msgs.length > 1 ? `${i + 1}. ` : ""}
              {m.title}
            </p>
            <p className="text-sm text-muted-foreground">{m.detail}</p>
            <p className="flex items-start gap-2 text-sm">
              <Camera className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{m.fix}</span>
            </p>
          </li>
        ))}
      </ol>
    </Card>
  );
}

/** Shown when the file's frame rate couldn't be read. The clip is still analysed. */
export function FpsUnknownCard() {
  return (
    <Card className="border-warning/50 p-4 sm:p-6">
      <h3 className="mb-2 text-lg font-semibold">We couldn't read this clip's frame rate</h3>
      <p className="text-sm text-muted-foreground">
        Your clip was still analysed. Body-position feedback works without a frame rate; anything
        timed frame by frame is shown as not measured rather than guessing a rate.
      </p>
      <p className="mt-2 text-sm">
        Upload the original .mp4 or .mov straight from your camera roll — those files record their
        frame rate.
      </p>
    </Card>
  );
}
