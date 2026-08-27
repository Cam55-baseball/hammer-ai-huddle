/**
 * PitchingFilmingGuide — a short pre-recording checklist shown before a user
 * films or uploads for pitching analysis (baseball & softball).
 *
 * Grounded in a real failure seen on actual user footage: softball pitching
 * returned 13/13 missing tiles because of three filming gaps. Each item below
 * directly prevents one of those gaps so the analysis can actually measure.
 */
import { Card } from "@/components/ui/card";
import { Ruler, Maximize2, Clapperboard } from "lucide-react";

const ITEMS = [
  {
    icon: Ruler,
    title: "Keep rubber & home plate both in frame",
    body: "Without both visible at once, the system can't establish a reference line — and most tiles can't measure.",
  },
  {
    icon: Maximize2,
    title: "Capture a standing reference first",
    body: "Before the pitch, film the athlete standing at full height next to a visible reference. Without it, stride length can't be measured.",
  },
  {
    icon: Clapperboard,
    title: "Frame wide & stay continuous",
    body: "Keep the whole athlete in frame, wind-up through release. Tiles need to locate specific phase moments and fail if the camera cuts away or crops too tight.",
  },
] as const;

export function PitchingFilmingGuide() {
  return (
    <Card className="border-amber-500/30 bg-amber-500/5 p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
          Before you film — 3 things to get right
        </span>
      </div>
      <ul className="space-y-2">
        {ITEMS.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex items-start gap-2.5">
            <div className="mt-0.5 shrink-0 rounded-md bg-amber-500/15 p-1.5">
              <Icon className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold leading-tight">{title}</div>
              <p className="text-[12px] leading-snug text-muted-foreground">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
