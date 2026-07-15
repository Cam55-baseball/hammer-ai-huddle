import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, RotateCcw, Star, StarOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAlignmentPresets, fallbackAlignment, type FieldSport, type AlignmentPositions } from "@/hooks/useDefensiveAlignment";
import { IqDiamond } from "@/components/iq/IqDiamond";
import { DEFENSIVE_ROLES, ROLE_LABELS, type IqActor, type IqActorRole } from "@/lib/iq/types";

const DEFENDER_ROLES: IqActorRole[] = ["P","C","1B","2B","3B","SS","LF","CF","RF"];

// Fake actors used purely to render the diamond in the editor.
function buildActors(positions: AlignmentPositions): IqActor[] {
  return DEFENDER_ROLES.filter((r) => positions[r]).map((r) => ({
    id: r,
    situation_id: "editor",
    role: r,
    assignment: "idle",
    primary_path: [],
    secondary_read: "",
    communication_call: "",
    coaching_note: "",
    common_mistake: "",
    elite_cue: "",
  }));
}

function clamp01to100(v: number) {
  return Math.max(2, Math.min(98, Math.round(v * 10) / 10));
}

export default function IqAlignmentsEditor() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [sport, setSport] = useState<FieldSport>("baseball");
  const presetsQ = useAlignmentPresets(sport);
  const [presetKey, setPresetKey] = useState<string>("standard");
  const [positions, setPositions] = useState<AlignmentPositions>(() => fallbackAlignment(sport));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState<IqActorRole | null>(null);
  const svgWrapRef = useRef<HTMLDivElement | null>(null);

  const presets = presetsQ.data ?? [];
  const currentPreset = useMemo(
    () => presets.find((p) => p.preset_key === presetKey) ?? null,
    [presets, presetKey],
  );

  // Sync editor state when sport / preset changes.
  useEffect(() => {
    if (presets.length === 0) return;
    const p = presets.find((x) => x.preset_key === presetKey) ?? presets[0];
    if (p) {
      setPresetKey(p.preset_key);
      setPositions({ ...fallbackAlignment(sport), ...p.positions });
      setDirty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sport, presets.length]);

  useEffect(() => {
    const p = presets.find((x) => x.preset_key === presetKey);
    if (p) {
      setPositions({ ...fallbackAlignment(sport), ...p.positions });
      setDirty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetKey]);

  const setRole = (role: IqActorRole, x: number, y: number) => {
    setPositions((prev) => ({ ...prev, [role]: { x: clamp01to100(x), y: clamp01to100(y) } }));
    setDirty(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !svgWrapRef.current) return;
    const rect = svgWrapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setRole(dragging, x, y);
  };

  const stopDrag = () => setDragging(null);

  const handleSave = async () => {
    if (!currentPreset) return;
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("iq_defensive_alignments" as any)
        .update({ positions, updated_by: userData.user?.id ?? null })
        .eq("id", currentPreset.id);
      if (error) throw error;
      toast({ title: "Alignment saved", description: `${sport} · ${currentPreset.label}` });
      setDirty(false);
      await qc.invalidateQueries({ queryKey: ["iq-alignments", sport] });
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message ?? "Try again", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async () => {
    if (!currentPreset) return;
    try {
      // Clear existing default for this sport, then set this one.
      const { error: e1 } = await supabase
        .from("iq_defensive_alignments" as any)
        .update({ is_default: false })
        .eq("sport", sport)
        .eq("is_default", true);
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("iq_defensive_alignments" as any)
        .update({ is_default: true })
        .eq("id", currentPreset.id);
      if (e2) throw e2;
      toast({ title: "Set as sport default", description: currentPreset.label });
      await qc.invalidateQueries({ queryKey: ["iq-alignments", sport] });
    } catch (e: any) {
      toast({ title: "Couldn't set default", description: e?.message ?? "Try again", variant: "destructive" });
    }
  };

  const handleReset = () => {
    if (currentPreset) {
      setPositions({ ...fallbackAlignment(sport), ...currentPreset.positions });
      setDirty(false);
    }
  };

  const actors = buildActors(positions);

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-0 py-4 space-y-5">
        <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        <div>
          <h1 className="text-2xl font-bold">Defensive alignments</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Drag any defender to their real starting spot. Every Game IQ scenario animates from these positions.
          </p>
        </div>

        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Sport</Label>
              <Select value={sport} onValueChange={(v) => setSport(v as FieldSport)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baseball">Baseball</SelectItem>
                  <SelectItem value="softball">Softball</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Preset</Label>
              <Select value={presetKey} onValueChange={setPresetKey}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {presets.map((p) => (
                    <SelectItem key={p.preset_key} value={p.preset_key}>
                      {p.label}{p.is_default ? " ★" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {currentPreset && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" onClick={handleSave} disabled={!dirty || saving}>
                <Save className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Save preset"}
              </Button>
              <Button size="sm" variant="outline" onClick={handleReset} disabled={!dirty}>
                <RotateCcw className="h-4 w-4 mr-1" /> Revert
              </Button>
              <Button size="sm" variant="outline" onClick={handleSetDefault} disabled={currentPreset.is_default}>
                {currentPreset.is_default ? <Star className="h-4 w-4 mr-1 fill-current" /> : <StarOff className="h-4 w-4 mr-1" />}
                {currentPreset.is_default ? "Sport default" : "Set as default"}
              </Button>
              {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
            </div>
          )}
        </Card>

        {/* Interactive diamond */}
        <div
          ref={svgWrapRef}
          className="relative touch-none select-none"
          onPointerMove={onPointerMove}
          onPointerUp={stopDrag}
          onPointerLeave={stopDrag}
        >
          <IqDiamond actors={actors} mode="teach" defensivePositions={positions} />
          {/* Invisible drag handles overlaid on each defender */}
          {DEFENDER_ROLES.map((r) => {
            const p = positions[r];
            if (!p) return null;
            return (
              <button
                key={r}
                type="button"
                aria-label={`Drag ${ROLE_LABELS[r]}`}
                onPointerDown={(e) => { e.preventDefault(); setDragging(r); }}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full cursor-grab active:cursor-grabbing"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  width: "clamp(30px, 6vw, 44px)",
                  height: "clamp(30px, 6vw, 44px)",
                  background: dragging === r ? "hsl(var(--primary) / 0.25)" : "transparent",
                  border: dragging === r ? "2px dashed hsl(var(--primary))" : "2px dashed transparent",
                }}
              />
            );
          })}
        </div>

        {/* Numeric fine-tune grid */}
        <Card className="p-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Fine-tune (0–100 grid)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {DEFENDER_ROLES.map((r) => {
              const p = positions[r] ?? { x: 50, y: 50 };
              return (
                <div key={r} className="flex items-center gap-1 rounded-md border bg-card px-2 py-1.5">
                  <span className="font-bold w-8">{r}</span>
                  <span className="text-muted-foreground">x</span>
                  <input
                    type="number" min={2} max={98} step={0.5} value={p.x}
                    onChange={(e) => setRole(r, Number(e.target.value), p.y)}
                    className="w-14 bg-background border rounded px-1 py-0.5"
                  />
                  <span className="text-muted-foreground">y</span>
                  <input
                    type="number" min={2} max={98} step={0.5} value={p.y}
                    onChange={(e) => setRole(r, p.x, Number(e.target.value))}
                    className="w-14 bg-background border rounded px-1 py-0.5"
                  />
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Home plate is y=100 (bottom). Center field wall is y=0 (top). First-base side is x&gt;50, third-base side is x&lt;50.
          </p>
        </Card>
      </div>
    </DashboardLayout>
  );
}
