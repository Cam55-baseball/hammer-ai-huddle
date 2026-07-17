import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Save, RotateCcw, Star, StarOff, Undo2, Redo2,
  Copy, Trash2, FlipHorizontal, Eye, EyeOff, MoveHorizontal, MoveVertical,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAlignmentPresets, fallbackAlignment, DEFAULT_RANGE_RADII,
  type FieldSport, type AlignmentPositions, type AlignmentRanges,
} from "@/hooks/useDefensiveAlignment";
import { ROLE_LABELS, type IqActorRole } from "@/lib/iq/types";
import { ASSIGNMENT_COLOR } from "@/lib/iq/types";

const DEFENDER_ROLES: IqActorRole[] = ["P","C","1B","2B","3B","SS","LF","CF","RF"];
const INFIELD: IqActorRole[] = ["P","C","1B","2B","3B","SS"];
const OUTFIELD: IqActorRole[] = ["LF","CF","RF"];

function clamp(v: number, lo = 2, hi = 98) {
  return Math.max(lo, Math.min(hi, Math.round(v * 10) / 10));
}
function snap(v: number, step: number) {
  return Math.round(v / step) * step;
}

type Positions = AlignmentPositions;
type Ranges = AlignmentRanges;
interface State { positions: Positions; ranges: Ranges }

export default function IqAlignmentsEditor() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [sport, setSport] = useState<FieldSport>("baseball");
  const presetsQ = useAlignmentPresets(sport);
  const presets = presetsQ.data ?? [];
  const [presetKey, setPresetKey] = useState<string>("standard");

  // Editing state with undo/redo history.
  const [state, setState] = useState<State>({
    positions: fallbackAlignment(sport),
    ranges: { ...DEFAULT_RANGE_RADII },
  });
  const [savedState, setSavedState] = useState<State>(state);
  const historyRef = useRef<State[]>([]);
  const futureRef = useRef<State[]>([]);
  const [historyTick, setHistoryTick] = useState(0);

  // UI toggles
  const [snapStep, setSnapStep] = useState<number>(1);
  const [showRanges, setShowRanges] = useState(true);
  const [showCompare, setShowCompare] = useState(false);
  const [selected, setSelected] = useState<Set<IqActorRole>>(new Set());
  const [dragging, setDragging] = useState<IqActorRole | null>(null);
  const [groupDrag, setGroupDrag] = useState<{ role: IqActorRole; startPx: number; startPy: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const currentPreset = useMemo(
    () => presets.find((p) => p.preset_key === presetKey) ?? null,
    [presets, presetKey],
  );

  // Load preset when sport/preset changes.
  useEffect(() => {
    if (presets.length === 0) return;
    const p = presets.find((x) => x.preset_key === presetKey) ?? presets[0];
    if (!p) return;
    if (p.preset_key !== presetKey) setPresetKey(p.preset_key);
    const next: State = {
      positions: { ...fallbackAlignment(sport), ...p.positions },
      ranges: { ...DEFAULT_RANGE_RADII, ...(p.range_radii ?? {}) },
    };
    setState(next);
    setSavedState(next);
    historyRef.current = [];
    futureRef.current = [];
    setHistoryTick((t) => t + 1);
    setSelected(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sport, presetKey, presets.length]);

  const dirty = useMemo(
    () => JSON.stringify(state) !== JSON.stringify(savedState),
    [state, savedState],
  );

  const pushHistory = useCallback((prev: State) => {
    historyRef.current.push(prev);
    if (historyRef.current.length > 50) historyRef.current.shift();
    futureRef.current = [];
    setHistoryTick((t) => t + 1);
  }, []);

  const applyState = useCallback((next: State) => {
    setState((prev) => {
      pushHistory(prev);
      return next;
    });
  }, [pushHistory]);

  const undo = () => {
    const prev = historyRef.current.pop();
    if (!prev) return;
    futureRef.current.push(state);
    setState(prev);
    setHistoryTick((t) => t + 1);
  };
  const redo = () => {
    const next = futureRef.current.pop();
    if (!next) return;
    historyRef.current.push(state);
    setState(next);
    setHistoryTick((t) => t + 1);
  };

  // Selection helpers
  const toggleSelect = (role: IqActorRole, additive: boolean) => {
    setSelected((prev) => {
      const next = new Set(additive ? prev : []);
      if (next.has(role)) next.delete(role); else next.add(role);
      return next;
    });
  };
  const selectGroup = (roles: IqActorRole[]) => setSelected(new Set(roles));
  const clearSelection = () => setSelected(new Set());

  // Coordinate math
  const eventToPct = (e: React.PointerEvent) => {
    const rect = wrapRef.current!.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return { x, y };
  };

  // Single-role drag
  const onPuckPointerDown = (e: React.PointerEvent, role: IqActorRole) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    if (selected.has(role) && selected.size > 1) {
      const { x, y } = eventToPct(e);
      setGroupDrag({ role, startPx: x, startPy: y });
      pushHistory(state);
    } else {
      setDragging(role);
      pushHistory(state);
      toggleSelect(role, false);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!wrapRef.current) return;
    const { x, y } = eventToPct(e);
    const step = snapStep;
    if (groupDrag) {
      const dx = x - groupDrag.startPx;
      const dy = y - groupDrag.startPy;
      setState((prev) => {
        const next: Positions = { ...prev.positions };
        for (const r of selected) {
          const p = prev.positions[r];
          if (!p) continue;
          next[r] = { x: clamp(snap(p.x + dx, step)), y: clamp(snap(p.y + dy, step)) };
        }
        return { ...prev, positions: next };
      });
      setGroupDrag({ ...groupDrag, startPx: x, startPy: y });
    } else if (dragging) {
      setState((prev) => ({
        ...prev,
        positions: { ...prev.positions, [dragging]: { x: clamp(snap(x, step)), y: clamp(snap(y, step)) } },
      }));
    }
  };

  const stopDrag = () => { setDragging(null); setGroupDrag(null); };

  // Group nudge
  const nudgeRoles = (roles: IqActorRole[], dx: number, dy: number) => {
    applyState({
      ...state,
      positions: roles.reduce<Positions>((acc, r) => {
        const p = state.positions[r];
        if (!p) return acc;
        acc[r] = { x: clamp(p.x + dx), y: clamp(p.y + dy) };
        return acc;
      }, { ...state.positions }),
    });
  };

  // Keyboard nudge on selection
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (selected.size === 0) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const step = e.shiftKey ? 5 : 1;
      const map: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step],
      };
      const d = map[e.key];
      if (!d) return;
      e.preventDefault();
      nudgeRoles(Array.from(selected), d[0], d[1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, state]);

  // Mirror L↔R (flip x around 50)
  const mirrorLR = () => {
    applyState({
      ...state,
      positions: DEFENDER_ROLES.reduce<Positions>((acc, r) => {
        const p = state.positions[r];
        if (!p) return acc;
        acc[r] = { x: clamp(100 - p.x), y: p.y };
        return acc;
      }, {}),
    });
  };

  // Persistence
  const handleSave = async () => {
    if (!currentPreset) return;
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("iq_defensive_alignments" as any)
        .update({
          positions: state.positions,
          range_radii: state.ranges,
          updated_by: userData.user?.id ?? null,
        })
        .eq("id", currentPreset.id);
      if (error) throw error;
      toast({ title: "Alignment saved", description: `${sport} · ${currentPreset.label}` });
      setSavedState(state);
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
      await supabase.from("iq_defensive_alignments" as any).update({ is_default: false })
        .eq("sport", sport).eq("is_default", true);
      const { error } = await supabase.from("iq_defensive_alignments" as any)
        .update({ is_default: true }).eq("id", currentPreset.id);
      if (error) throw error;
      toast({ title: "Sport default set", description: currentPreset.label });
      await qc.invalidateQueries({ queryKey: ["iq-alignments", sport] });
    } catch (e: any) {
      toast({ title: "Couldn't set default", description: e?.message ?? "Try again", variant: "destructive" });
    }
  };

  const handleDuplicate = async () => {
    if (!currentPreset) return;
    const label = window.prompt("Name the new preset:", `${currentPreset.label} copy`);
    if (!label) return;
    const key = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);
    if (!key) return;
    try {
      const { data, error } = await supabase.from("iq_defensive_alignments" as any).insert({
        sport, preset_key: key, label,
        positions: state.positions, range_radii: state.ranges, is_default: false,
      }).select().single();
      if (error) throw error;
      toast({ title: "Preset duplicated", description: label });
      await qc.invalidateQueries({ queryKey: ["iq-alignments", sport] });
      setPresetKey((data as any).preset_key);
    } catch (e: any) {
      toast({ title: "Duplicate failed", description: e?.message ?? "Try again", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!currentPreset) return;
    if (currentPreset.preset_key === "standard") {
      toast({ title: "Cannot delete Standard", variant: "destructive" });
      return;
    }
    if (!window.confirm(`Delete preset "${currentPreset.label}"? This cannot be undone.`)) return;
    try {
      const { error } = await supabase.from("iq_defensive_alignments" as any)
        .delete().eq("id", currentPreset.id);
      if (error) throw error;
      toast({ title: "Preset deleted" });
      await qc.invalidateQueries({ queryKey: ["iq-alignments", sport] });
      setPresetKey("standard");
    } catch (e: any) {
      toast({ title: "Delete failed", description: e?.message ?? "Try again", variant: "destructive" });
    }
  };

  const handleRevert = () => applyState(savedState);
  const handleResetSeed = () => applyState({
    positions: fallbackAlignment(sport),
    ranges: { ...DEFAULT_RANGE_RADII },
  });

  // Coverage estimate — Monte Carlo of fair-territory points inside range disks.
  const coverage = useMemo(() => {
    let inside = 0, covered = 0;
    const N = 40; // 40x40 grid samples over the field polygon
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const x = (i + 0.5) * (100 / N);
        const y = (j + 0.5) * (100 / N);
        // Fair territory ~= inside the wedge from home (50,100) opening to y=0.
        // Approximate: y <= 100 - |x-50| (45° foul lines) and y >= 5 (outfield fence).
        if (y > 100 - Math.abs(x - 50) || y < 5) continue;
        inside++;
        for (const r of DEFENDER_ROLES) {
          const p = state.positions[r]; if (!p) continue;
          const rad = state.ranges[r] ?? DEFAULT_RANGE_RADII[r] ?? 10;
          const dx = p.x - x, dy = p.y - y;
          if (dx * dx + dy * dy <= rad * rad) { covered++; break; }
        }
      }
    }
    return inside === 0 ? 0 : Math.round((covered / inside) * 100);
  }, [state]);

  const isSelected = (r: IqActorRole) => selected.has(r);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 space-y-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        <div>
          <h1 className="text-2xl font-bold">Defensive alignments</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Drag defenders on the field, or tap to select and use group controls to shift the whole
            infield or outfield in one move. Range disks show coverage — watch the gaps.
          </p>
        </div>

        {/* Sport + preset + preset actions */}
        <Card className="p-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
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
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={handleSave} disabled={!dirty || saving}>
              <Save className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Save"}
            </Button>
            <Button size="sm" variant="outline" onClick={handleRevert} disabled={!dirty}>
              <RotateCcw className="h-4 w-4 mr-1" /> Revert
            </Button>
            <Button size="sm" variant="outline" onClick={undo} disabled={historyRef.current.length === 0}>
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={redo} disabled={futureRef.current.length === 0}>
              <Redo2 className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleSetDefault} disabled={currentPreset?.is_default}>
              {currentPreset?.is_default ? <Star className="h-4 w-4 mr-1 fill-current" /> : <StarOff className="h-4 w-4 mr-1" />}
              {currentPreset?.is_default ? "Default" : "Set default"}
            </Button>
            <Button size="sm" variant="outline" onClick={handleDuplicate}>
              <Copy className="h-4 w-4 mr-1" /> Duplicate
            </Button>
            <Button size="sm" variant="outline" onClick={handleDelete}
              disabled={!currentPreset || currentPreset.preset_key === "standard"}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
            {dirty && <Badge variant="secondary">Unsaved</Badge>}
            <Badge variant="outline" className="ml-auto">Coverage {coverage}%</Badge>
          </div>
        </Card>

        {/* Toggles */}
        <Card className="p-3 flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <Switch checked={showRanges} onCheckedChange={setShowRanges} />
            <Eye className="h-4 w-4" /> Range disks
          </label>
          <label className="flex items-center gap-2">
            <Switch checked={showCompare} onCheckedChange={setShowCompare} />
            {showCompare ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />} Compare vs saved
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Snap</span>
            <Select value={String(snapStep)} onValueChange={(v) => setSnapStep(Number(v))}>
              <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0.5">0.5%</SelectItem>
                <SelectItem value="1">1%</SelectItem>
                <SelectItem value="2">2%</SelectItem>
                <SelectItem value="5">5%</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" variant="ghost" onClick={mirrorLR}>
            <FlipHorizontal className="h-4 w-4 mr-1" /> Mirror L↔R
          </Button>
        </Card>

        {/* The field */}
        <div
          ref={wrapRef}
          className="relative touch-none select-none w-full aspect-square rounded-2xl overflow-hidden border"
          style={{ background: "radial-gradient(ellipse at 50% 100%, hsl(var(--iq-field)) 0%, hsl(var(--iq-field) / 0.7) 70%)" }}
          onPointerMove={onPointerMove}
          onPointerUp={stopDrag}
          onPointerLeave={stopDrag}
          onPointerDown={(e) => { if (e.target === e.currentTarget) clearSelection(); }}
        >
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
            <path d="M 5 50 A 45 45 0 0 1 95 50 L 50 100 Z"
              fill="hsl(var(--iq-field) / 0.5)" stroke="hsl(var(--iq-chalk) / 0.15)" strokeWidth="0.3" />
            <polygon points="50,40 76,70 50,96 24,70"
              fill="hsl(var(--iq-field) / 0.9)" stroke="hsl(var(--iq-chalk) / 0.55)" strokeWidth="0.4" />
            {[{x:50,y:40},{x:76,y:70},{x:50,y:96},{x:24,y:70}].map((b,i)=>(
              <rect key={i} x={b.x-1.6} y={b.y-1.6} width="3.2" height="3.2"
                fill="hsl(var(--iq-chalk))" transform={`rotate(45 ${b.x} ${b.y})`} />
            ))}
            <circle cx="50" cy="70" r="3.5" fill="none" stroke="hsl(var(--iq-chalk) / 0.5)" strokeWidth="0.3" />

            {/* Range disks */}
            {showRanges && DEFENDER_ROLES.map((r) => {
              const p = state.positions[r]; if (!p) return null;
              const rad = state.ranges[r] ?? DEFAULT_RANGE_RADII[r] ?? 10;
              return (
                <circle key={`rng-${r}`} cx={p.x} cy={p.y} r={rad}
                  fill={ASSIGNMENT_COLOR[OUTFIELD.includes(r) ? "read" : "bag"]}
                  fillOpacity={0.14}
                  stroke="hsl(var(--iq-chalk) / 0.3)" strokeWidth="0.15"
                  style={{ mixBlendMode: "screen" as any }} />
              );
            })}

            {/* Saved-state ghosts */}
            {showCompare && DEFENDER_ROLES.map((r) => {
              const p = savedState.positions[r]; if (!p) return null;
              return (
                <circle key={`ghost-${r}`} cx={p.x} cy={p.y} r="1.6"
                  fill="none" stroke="hsl(var(--iq-chalk) / 0.7)" strokeWidth="0.25" strokeDasharray="0.6 0.6" />
              );
            })}
          </svg>

          {/* Draggable pucks */}
          {DEFENDER_ROLES.map((r) => {
            const p = state.positions[r]; if (!p) return null;
            const sel = isSelected(r);
            return (
              <button
                key={r}
                type="button"
                aria-label={`Drag ${ROLE_LABELS[r]}`}
                onPointerDown={(e) => onPuckPointerDown(e, r)}
                onClick={(e) => { e.stopPropagation(); toggleSelect(r, e.shiftKey || e.metaKey || e.ctrlKey); }}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full font-bold shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing"
                style={{
                  left: `${p.x}%`, top: `${p.y}%`,
                  width: "clamp(34px, 6.5vw, 46px)",
                  height: "clamp(34px, 6.5vw, 46px)",
                  background: sel ? "hsl(var(--primary))" : "hsl(var(--iq-bag))",
                  color: "hsl(var(--iq-field))",
                  border: sel ? "3px solid hsl(var(--primary-foreground))" : "2px solid hsl(var(--iq-chalk) / 0.9)",
                  fontSize: "clamp(11px, 2.5vw, 14px)",
                  touchAction: "none",
                }}
              >
                {r}
              </button>
            );
          })}

          {/* Live coord readout for dragging puck */}
          {dragging && state.positions[dragging] && (
            <div className="absolute top-2 left-2 rounded bg-background/90 border px-2 py-1 text-xs font-mono">
              {dragging}: x={state.positions[dragging]!.x.toFixed(1)} y={state.positions[dragging]!.y.toFixed(1)}
            </div>
          )}
        </div>

        {/* Selection / group controls */}
        <Card className="p-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Select</span>
            <Button size="sm" variant={selected.size === DEFENDER_ROLES.length ? "default" : "outline"}
              onClick={() => selectGroup(DEFENDER_ROLES)}>All</Button>
            <Button size="sm" variant="outline" onClick={() => selectGroup(INFIELD)}>Infield</Button>
            <Button size="sm" variant="outline" onClick={() => selectGroup(OUTFIELD)}>Outfield</Button>
            <Button size="sm" variant="ghost" onClick={clearSelection}>Clear</Button>
            {selected.size > 0 && (
              <Badge variant="secondary">
                {Array.from(selected).join(", ")}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded border p-2 space-y-1">
              <div className="text-xs font-semibold flex items-center gap-1">
                <MoveHorizontal className="h-3 w-3" /> Slide sideways
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="flex-1"
                  onClick={() => nudgeRoles(selected.size ? Array.from(selected) : DEFENDER_ROLES, -3, 0)}>
                  ← 3
                </Button>
                <Button size="sm" variant="outline" className="flex-1"
                  onClick={() => nudgeRoles(selected.size ? Array.from(selected) : DEFENDER_ROLES, -1, 0)}>
                  ← 1
                </Button>
                <Button size="sm" variant="outline" className="flex-1"
                  onClick={() => nudgeRoles(selected.size ? Array.from(selected) : DEFENDER_ROLES, 1, 0)}>
                  1 →
                </Button>
                <Button size="sm" variant="outline" className="flex-1"
                  onClick={() => nudgeRoles(selected.size ? Array.from(selected) : DEFENDER_ROLES, 3, 0)}>
                  3 →
                </Button>
              </div>
            </div>
            <div className="rounded border p-2 space-y-1">
              <div className="text-xs font-semibold flex items-center gap-1">
                <MoveVertical className="h-3 w-3" /> Deeper / shallower
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="flex-1"
                  onClick={() => nudgeRoles(selected.size ? Array.from(selected) : DEFENDER_ROLES, 0, -3)}
                  title="Deeper">Deep 3</Button>
                <Button size="sm" variant="outline" className="flex-1"
                  onClick={() => nudgeRoles(selected.size ? Array.from(selected) : DEFENDER_ROLES, 0, -1)}
                  title="Slightly deeper">Deep 1</Button>
                <Button size="sm" variant="outline" className="flex-1"
                  onClick={() => nudgeRoles(selected.size ? Array.from(selected) : DEFENDER_ROLES, 0, 1)}
                  title="Slightly in">In 1</Button>
                <Button size="sm" variant="outline" className="flex-1"
                  onClick={() => nudgeRoles(selected.size ? Array.from(selected) : DEFENDER_ROLES, 0, 3)}
                  title="Way in">In 3</Button>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Tip: hold Shift while clicking a defender to add to selection. Arrow keys nudge selected pucks (Shift = 5%).
          </p>
        </Card>

        {/* Per-role fine tune + range */}
        <Card className="p-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Fine-tune — position & range
          </div>
          <div className="space-y-2">
            {DEFENDER_ROLES.map((r) => {
              const p = state.positions[r] ?? { x: 50, y: 50 };
              const rad = state.ranges[r] ?? DEFAULT_RANGE_RADII[r] ?? 10;
              return (
                <div key={r} className="grid grid-cols-[3rem_1fr_1fr_2fr] items-center gap-2 rounded border bg-card px-2 py-1.5 text-xs">
                  <button
                    className={`font-bold text-left ${isSelected(r) ? "text-primary" : ""}`}
                    onClick={() => toggleSelect(r, true)}
                    title={ROLE_LABELS[r]}
                  >{r}</button>
                  <label className="flex items-center gap-1">
                    <span className="text-muted-foreground">x</span>
                    <Input type="number" min={2} max={98} step={0.5} value={p.x}
                      onChange={(e) => applyState({ ...state, positions: { ...state.positions, [r]: { x: clamp(Number(e.target.value)), y: p.y } } })}
                      className="h-7 px-1" />
                  </label>
                  <label className="flex items-center gap-1">
                    <span className="text-muted-foreground">y</span>
                    <Input type="number" min={2} max={98} step={0.5} value={p.y}
                      onChange={(e) => applyState({ ...state, positions: { ...state.positions, [r]: { x: p.x, y: clamp(Number(e.target.value)) } } })}
                      className="h-7 px-1" />
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-10">range {rad}</span>
                    <Slider value={[rad]} min={2} max={30} step={0.5}
                      onValueChange={(v) => applyState({ ...state, ranges: { ...state.ranges, [r]: v[0] } })} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 pt-3">
            <Button size="sm" variant="ghost" onClick={handleResetSeed}>Reset to seed</Button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Home plate is y=100 (bottom). Center-field wall is y=0 (top). First-base side is x&gt;50.
          </p>
        </Card>
      </div>
    </DashboardLayout>
  );
}
