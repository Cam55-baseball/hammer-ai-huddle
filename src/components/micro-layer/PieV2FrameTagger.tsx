/**
 * PIE V2 — video frame tagger.
 *
 * Annotates a video frame range with a single PIE V2 signal observation.
 * Pure presentation + emit. Lineage anchored via parent_video_event_id so
 * the canonical event ledger preserves derivation provenance per Megaphase
 * 76–90 event fabric doctrine.
 *
 * Subordinate to RR-5/6/8/9 + replay legality.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PIE_V2_SIGNALS } from "@/data/baseball/pieV2Signals";
import { scorePieV2Rep } from "@/lib/pieV2/scoring";
import { emitPieV2RepScore } from "@/lib/pieV2/emit";
import {
  PIE_V2_SCORED_SIGNALS,
  PIE_V2_TRACKED_ONLY_SIGNALS,
  type PieV2RepInput,
  type PieV2SignalId,
} from "@/lib/pieV2/types";

interface Props {
  athleteId: string;
  sessionId: string;
  videoId: string;
  parentVideoEventId?: string;
}

export function PieV2FrameTagger({ athleteId, sessionId, videoId, parentVideoEventId }: Props) {
  const [signalId, setSignalId] = useState<PieV2SignalId>("energy_angle");
  const [frameStart, setFrameStart] = useState("");
  const [frameEnd, setFrameEnd] = useState("");
  const [raw, setRaw] = useState<Partial<PieV2RepInput>>({});
  const [submitting, setSubmitting] = useState(false);

  const def = PIE_V2_SIGNALS[signalId];

  const submit = async () => {
    const fs = Number(frameStart);
    const fe = Number(frameEnd);
    if (!Number.isFinite(fs) || !Number.isFinite(fe) || fe < fs) {
      toast.error("Provide a valid frame range");
      return;
    }
    setSubmitting(true);
    try {
      const rep: PieV2RepInput = {
        rep_id: `${sessionId}-${videoId}-${signalId}-${fs}-${fe}`,
        session_id: sessionId,
        athlete_id: athleteId,
        occurred_at: new Date().toISOString(),
        provenance: "video_derived",
        video_id: videoId,
        video_frame_range: [fs, fe],
        ...raw,
      };
      const score = scorePieV2Rep(rep, signalId);
      await emitPieV2RepScore(rep, score, {
        parent_video_event_id: parentVideoEventId,
        actor_role: "coach",
      });
      toast.success(`Tagged ${def.label}`);
      setRaw({});
      setFrameStart("");
      setFrameEnd("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span>PIE V2 frame tagger</span>
          <Badge variant="outline">video {videoId.slice(0, 8)}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Signal</Label>
            <Select value={signalId} onValueChange={(v) => setSignalId(v as PieV2SignalId)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[...PIE_V2_SCORED_SIGNALS, ...PIE_V2_TRACKED_ONLY_SIGNALS].map((id) => (
                  <SelectItem key={id} value={id}>{PIE_V2_SIGNALS[id].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Frame start</Label>
              <Input value={frameStart} onChange={(e) => setFrameStart(e.target.value)} inputMode="numeric" />
            </div>
            <div>
              <Label className="text-xs">Frame end</Label>
              <Input value={frameEnd} onChange={(e) => setFrameEnd(e.target.value)} inputMode="numeric" />
            </div>
          </div>
        </div>

        <SignalRawInput signalId={signalId} value={raw} onChange={setRaw} />

        <div className="text-[11px] text-muted-foreground">
          {def.description}
        </div>

        <Button onClick={submit} disabled={submitting} className="w-full" size="sm">
          {submitting ? "Emitting…" : "Tag frame range"}
        </Button>
      </CardContent>
    </Card>
  );
}

function SignalRawInput({
  signalId,
  value,
  onChange,
}: {
  signalId: PieV2SignalId;
  value: Partial<PieV2RepInput>;
  onChange: (next: Partial<PieV2RepInput>) => void;
}) {
  const set = <K extends keyof PieV2RepInput>(k: K, v: PieV2RepInput[K]) =>
    onChange({ ...value, [k]: v });

  const numeric = (k: keyof PieV2RepInput, label: string) => (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        value={(value[k] as number | undefined)?.toString() ?? ""}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          set(k, (Number.isFinite(n) ? n : undefined) as PieV2RepInput[typeof k]);
        }}
        inputMode="decimal"
      />
    </div>
  );

  const bool = (k: keyof PieV2RepInput, label: string) => (
    <div className="flex items-center justify-between rounded border px-2 py-1 text-xs">
      <span>{label}</span>
      <Select
        value={value[k] === true ? "true" : value[k] === false ? "false" : ""}
        onValueChange={(v) => set(k, (v === "true") as PieV2RepInput[typeof k])}
      >
        <SelectTrigger className="h-7 w-24"><SelectValue placeholder="—" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="true">yes</SelectItem>
          <SelectItem value="false">no</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  switch (signalId) {
    case "energy_angle": return numeric("energy_angle_deg", "Energy angle (°)");
    case "visual_stability": return bool("eyes_on_target", "Eyes on target");
    case "separation": return bool("shoulders_closed_to_footstrike", "Shoulders closed to footstrike");
    case "tempo": return numeric("leg_lift_to_footstrike_sec", "Leg lift → footstrike (sec)");
    case "stride": return numeric("stride_pct_body_height", "Stride (% body height)");
    case "head_stability": return numeric("head_vertical_drop_pct", "Head vertical drop (%)");
    case "hip_alignment": return bool("hips_fired_toward_target", "Hips fired toward target");
    case "front_side": return bool("glove_inside_frame", "Glove inside frame");
    case "head_alignment": return numeric("head_offset_from_belly_line_deg", "Head offset (°)");
    case "shoulder_level": return numeric("shoulder_horizontal_offset_deg", "Shoulder offset (°)");
    case "rear_foot_drag": return (
      <div className="grid grid-cols-2 gap-2">
        {numeric("rear_foot_drag_foot_lengths", "Drag (foot-lengths)")}
        {bool("rear_foot_drag_direction_clean", "Direction clean")}
      </div>
    );
    case "extension_consistency": return numeric("release_extension_ft", "Release extension (ft)");
    case "arm_slot_consistency": return numeric("arm_slot_deg", "Arm slot (°)");
  }
}
