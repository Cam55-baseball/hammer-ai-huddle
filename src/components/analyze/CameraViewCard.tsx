import { Camera } from "lucide-react";
import { Card } from "@/components/ui/card";
import { checkCameraRequirement, TILE_CAMERA_REQUIREMENTS, type CameraViewResult } from "@/lib/biomech/camera/cameraView";

const LABELS: Record<string, string> = {
  energy_angle_deg: "Energy angle", lift_thrust: "Lift & thrust", head_vertical_movement_pct: "Head movement",
  premature_shoulder_open_deg: "Early shoulder opening", tempo: "Tempo",
  head_path_through_stride: "Head path through the stride", back_hip_socket_hold: "Back hip hold",
  hip_load: "Hip load", hand_load: "Hand load", stride_direction: "Stride direction", heel_plant: "Heel plant",
  hands_outside_shoulders_at_landing: "Hands outside shoulders at landing", shoulder_plane_steadiness: "Shoulder plane steadiness",
  finish_balance: "Finish balance", back_knee_flex_maintained: "Back knee flex", post_landing_hip_drift: "Hip drift after landing",
  hands_stay_up_at_plant: "Hands up at plant", lead_elbow_bend_increasing: "Lead elbow bend",
  head_vertical_movement_post_landing: "Head movement after landing",
};
const PITCHING = new Set(["energy_angle_deg", "lift_thrust", "head_vertical_movement_pct", "premature_shoulder_open_deg", "tempo"]);

/** Which measurements this clip's camera position can and cannot produce. Shown before the result. */
export function CameraViewCard({ result, module }: { result: CameraViewResult; module: string }) {
  const pitching = module === "pitching" || module === "throwing";
  const STAFF_ONLY = new Set(["head_path_through_stride", "back_hip_socket_hold"]);
  const tiles = Object.keys(TILE_CAMERA_REQUIREMENTS).filter((t) => !STAFF_ONLY.has(t)).filter((t) => (pitching ? PITCHING.has(t) : !PITCHING.has(t) || t === "tempo"));
  const cannot = tiles.map((t) => ({ t, g: checkCameraRequirement(t, result.view) })).filter((x) => !x.g.ok);
  const viewText = result.view === "side_on" ? "side-on" : result.view === "on_line" ? "on the pitcher-to-plate line" : null;
  return (
    <Card className="p-4 sm:p-6">
      <div className="mb-2 flex items-center gap-2">
        <Camera className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">
          {viewText ? `This clip was filmed ${viewText}` : "We couldn't tell where the camera was"}
        </h3>
      </div>
      {!viewText && (
        <p className="text-sm text-muted-foreground">
          All measurements will still run. If a result looks off, film side-on (90° to the pitcher-to-plate line) or straight down that line.
        </p>
      )}
      {viewText && cannot.length === 0 && <p className="text-sm text-muted-foreground">Every measurement can be read from this angle.</p>}
      {viewText && cannot.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">These can't be read from this angle:</p>
          <ul className="space-y-2">
            {cannot.map(({ t, g }) => (
              <li key={t} className="text-sm"><span className="font-medium">{LABELS[t] ?? t}.</span> {g.message}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
