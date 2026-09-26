/**
 * TEMPORARY — see src/lib/biomech/fpsProbeReadout.ts for removal steps.
 * Shows how the last clip's frame rate was established.
 */
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { clearFpsProbe, subscribeFpsProbe, type FpsProbeReport } from "@/lib/biomech/fpsProbeReadout";

export function FpsProbeReadout() {
  const [r, setR] = useState<FpsProbeReport | null>(null);
  useEffect(() => subscribeFpsProbe(setR), []);
  if (!r) return null;
  const { probe: p, decision } = r;
  const enc = p.fps_encoded;
  const pb = p.fps_playback;
  return (
    <div
      className="fixed left-2 right-2 z-[2147483647] rounded-md border border-border bg-card p-3 text-xs text-card-foreground shadow-lg"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 8px)" }}
      role="status"
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="font-semibold">Frame-rate check (temporary)</span>
        <button type="button" aria-label="Close frame-rate check" onClick={clearFpsProbe}>
          <X className="h-4 w-4" />
        </button>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono">
        <dt>Encoded (file)</dt>
        <dd>
          {enc.status === "ok"
            ? `${enc.fps} fps (avg ${enc.fps_avg}, ${enc.frame_count} frames, ${enc.layout}${enc.variable_frame_rate ? ", variable" : ""})`
            : `unavailable — ${enc.reason}`}
        </dd>
        <dt>Playback</dt>
        <dd>{pb.status === "ok" ? `${pb.fps} fps` : `unavailable — ${pb.reason}`}</dd>
        <dt>Frames captured</dt>
        <dd>{pb.frames_captured}</dd>
        <dt>Autoplay blocked</dt>
        <dd>{pb.autoplay_blocked ? "yes" : "no"}</dd>
        <dt>Playback ÷ file</dt>
        <dd>{p.fps_playback_ratio ?? "—"}</dd>
        <dt>Source used</dt>
        <dd>{p.fps_source === "container" ? "encoded (file)" : "none — fps unknown"}</dd>
        <dt>Decision</dt>
        <dd>{decision}</dd>
        <dt>Duration</dt>
        <dd>{p.duration_sec.toFixed(3)} s ({p.duration_source})</dd>
      </dl>
    </div>
  );
}
