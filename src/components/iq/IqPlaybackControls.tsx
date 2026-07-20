import { Play, Pause, RotateCcw, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface Props {
  playing: boolean;
  progress: number;              // 0..1
  speed: number;                 // 0.5 | 1 | 2
  onTogglePlay: () => void;
  onScrub: (t: number) => void;
  onSetSpeed: (s: number) => void;
  onRestart: () => void;
}

const SPEEDS = [0.5, 1, 2];

export function IqPlaybackControls({
  playing, progress, speed, onTogglePlay, onScrub, onSetSpeed, onRestart,
}: Props) {
  return (
    <div className="rounded-lg border bg-card/60 p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Button size="icon" variant="default" onClick={onTogglePlay} aria-label={playing ? "Pause" : "Play"}>
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button size="icon" variant="ghost" onClick={onRestart} aria-label="Restart">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <div className="flex-1 px-1">
          <Slider
            value={[Math.round(progress * 1000)]}
            min={0} max={1000} step={1}
            onValueChange={(v) => onScrub((v[0] ?? 0) / 1000)}
          />
        </div>
        <div className="inline-flex items-center gap-1 border rounded-full px-1 py-0.5">
          <Gauge className="h-3.5 w-3.5 text-muted-foreground ml-1" />
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSetSpeed(s)}
              className={
                "text-[10px] px-2 py-0.5 rounded-full transition-colors " +
                (speed === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")
              }
            >
              {s}×
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
