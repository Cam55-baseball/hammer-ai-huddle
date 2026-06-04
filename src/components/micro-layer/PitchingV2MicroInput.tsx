/**
 * PIE V2 — Advanced Mechanics capture panel (baseball only).
 *
 * Optional, collapsible. Mounts inside the existing pitching micro layer
 * surface. Every field offers a "Not measured" affordance that marks
 * missingness explicitly — values are never imputed.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { PieV2RepInput } from "@/lib/pieV2/types";
import { useSportConfig } from "@/hooks/useSportConfig";

type PieV2Fields = Partial<
  Pick<
    PieV2RepInput,
    | "energy_angle_deg"
    | "eyes_on_target"
    | "shoulders_closed_to_footstrike"
    | "leg_lift_to_footstrike_sec"
    | "stride_pct_body_height"
    | "head_vertical_drop_pct"
    | "hips_fired_toward_target"
    | "glove_inside_frame"
    | "head_offset_from_belly_line_deg"
    | "shoulder_horizontal_offset_deg"
    | "rear_foot_drag_foot_lengths"
    | "rear_foot_drag_direction_clean"
    | "release_extension_ft"
    | "arm_slot_deg"
    | "athlete_reported_pain"
  >
>;

interface Props {
  value: PieV2Fields;
  onChange: (next: PieV2Fields) => void;
}

function NumRow({
  label, hint, value, step = "0.1", onChange,
}: { label: string; hint?: string; value?: number; step?: string; onChange: (v: number | undefined) => void }) {
  return (
    <div>
      <Label className="text-xs">{label} {hint && <span className="text-muted-foreground">· {hint}</span>}</Label>
      <Input
        type="number"
        step={step}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        placeholder="Not measured"
        className="h-8 text-xs"
      />
    </div>
  );
}

function BoolRow({
  label, value, onChange,
}: { label: string; value?: boolean; onChange: (v: boolean | undefined) => void }) {
  const isSet = value !== undefined;
  return (
    <div className="flex items-center justify-between py-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <Switch
          checked={!!value}
          onCheckedChange={(v) => onChange(v)}
          disabled={!isSet && false}
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-[10px] px-1"
          onClick={() => onChange(isSet ? undefined : false)}
        >
          {isSet ? "Clear" : "—"}
        </Button>
      </div>
    </div>
  );
}

export function PitchingV2MicroInput({ value, onChange }: Props) {
  const { sport } = useSportConfig();
  const [open, setOpen] = useState(false);
  if (sport !== "baseball") return null;
  const update = <K extends keyof PieV2Fields>(k: K, v: PieV2Fields[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <Card className="border-dashed">
      <CardHeader
        className="py-2 px-3 cursor-pointer select-none"
        onClick={() => setOpen((o) => !o)}
      >
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Advanced Mechanics (PIE V2)</span>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </CardTitle>
      </CardHeader>
      {open && (
        <CardContent className="space-y-3 px-3 pb-3">
          <p className="text-[10px] text-muted-foreground">
            Optional · Every field defaults to <em>not measured</em>. Values are never imputed.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <NumRow label="Energy Angle (°)" hint="target 25" value={value.energy_angle_deg} onChange={(v) => update("energy_angle_deg", v)} />
            <NumRow label="Tempo (s)" hint="≤1.05" step="0.01" value={value.leg_lift_to_footstrike_sec} onChange={(v) => update("leg_lift_to_footstrike_sec", v)} />
            <NumRow label="Stride (% BH)" hint="≥100" value={value.stride_pct_body_height} onChange={(v) => update("stride_pct_body_height", v)} />
            <NumRow label="Head drop (%)" hint="≤2" value={value.head_vertical_drop_pct} onChange={(v) => update("head_vertical_drop_pct", v)} />
            <NumRow label="Head offset @ release (°)" hint="≤15" value={value.head_offset_from_belly_line_deg} onChange={(v) => update("head_offset_from_belly_line_deg", v)} />
            <NumRow label="Shoulder level (°)" hint="≤10" value={value.shoulder_horizontal_offset_deg} onChange={(v) => update("shoulder_horizontal_offset_deg", v)} />
            <NumRow label="Drag length (foot lengths)" hint="~2" value={value.rear_foot_drag_foot_lengths} onChange={(v) => update("rear_foot_drag_foot_lengths", v)} />
            <NumRow label="Release extension (ft)" hint="tracked-only" value={value.release_extension_ft} onChange={(v) => update("release_extension_ft", v)} />
            <NumRow label="Arm slot (°)" hint="tracked-only" value={value.arm_slot_deg} onChange={(v) => update("arm_slot_deg", v)} />
          </div>

          <div className="space-y-1 pt-2 border-t">
            <BoolRow label="Eyes on target at peak lift" value={value.eyes_on_target} onChange={(v) => update("eyes_on_target", v)} />
            <BoolRow label="Shoulders closed to foot strike" value={value.shoulders_closed_to_footstrike} onChange={(v) => update("shoulders_closed_to_footstrike", v)} />
            <BoolRow label="Hips fired toward target" value={value.hips_fired_toward_target} onChange={(v) => update("hips_fired_toward_target", v)} />
            <BoolRow label="Glove inside shoulder frame" value={value.glove_inside_frame} onChange={(v) => update("glove_inside_frame", v)} />
            <BoolRow label="Rear-foot drag direction clean (toward target)" value={value.rear_foot_drag_direction_clean} onChange={(v) => update("rear_foot_drag_direction_clean", v)} />
            <BoolRow label="Athlete reported pain (RR-6 observational)" value={value.athlete_reported_pain} onChange={(v) => update("athlete_reported_pain", v)} />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
