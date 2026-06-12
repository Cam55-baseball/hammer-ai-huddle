import { Card } from "@/components/ui/card";
import { Camera } from "lucide-react";

interface Props {
  module: string | undefined;
}

/**
 * Pure presentation card that tells the athlete how to capture the video so
 * the report-card metrics extractor can actually SEE the required landmarks.
 * Lineage note: this is a hint surface only — it never authors organism truth.
 */
export function CameraAngleHelper({ module }: Props) {
  const m = (module ?? "").toLowerCase();
  const tips =
    m === "pitching"
      ? {
          title: "Best camera angle for pitching",
          lines: [
            "Side-on (open side of the mound), full body in frame head to toe.",
            "Start recording BEFORE leg lift, stop AFTER release and finish.",
            "Steady tripod or phone propped — no panning, no zoom.",
            "Athlete fills ~70% of vertical frame so plant foot & front hip are both visible.",
          ],
        }
      : m === "hitting"
        ? {
            title: "Best camera angle for hitting",
            lines: [
              "Open-side or catcher-cam, full body in frame head to toe.",
              "Capture from load through finish — include pitcher's knee lift & release if possible.",
              "Steady tripod or phone propped — no panning.",
              "Bat and hands must stay in frame through contact.",
            ],
          }
        : m === "throwing"
          ? {
              title: "Best camera angle for throwing",
              lines: [
                "Side-on, full body in frame head to toe.",
                "Start before the gather, stop after release and finish.",
                "Steady tripod — no panning, no zoom.",
                "Glove side must stay in frame the entire delivery.",
              ],
            }
          : null;

  if (!tips) return null;

  return (
    <Card className="border-primary/20 bg-primary/5 p-3 sm:p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/10 p-2">
          <Camera className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-black uppercase tracking-wider">{tips.title}</h4>
          <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
            {tips.lines.map((l) => (
              <li key={l} className="leading-relaxed">
                • {l}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
