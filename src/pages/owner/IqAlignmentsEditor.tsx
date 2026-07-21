/**
 * Iq Alignments Editor V3 — coach-language, step-based editor.
 *
 * - Handedness tabs: edits anchors_vs_rhh / anchors_vs_lhh independently.
 * - Draggable defenders on the realistic IqField.
 * - Numeric step panel per selected defender (from / toward / steps / depth / range).
 * - Mirror-to-opposite-hand flips lateral direction.
 * - Autosave anchors + legacy positions_vs_<hand> for backward compatibility.
 */
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Save, RotateCcw, Star, StarOff, Copy, Trash2,
  FlipHorizontal, Eye, ShieldCheck,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAlignmentPresets, DEFAULT_RANGE_RADII,
  type FieldSport, type AlignmentPositions, type AlignmentRanges,
} from "@/hooks/useDefensiveAlignment";
import { ROLE_LABELS, type IqActorRole } from "@/lib/iq/types";
import {
  anchorsToPositions, describeAnchor, mirrorAnchor,
  type DefensiveAnchors, type Handedness, type StepAnchor,
} from "@/lib/iq/fieldModel";
import { IqField } from "@/components/iq/IqField";
import { seedPresets } from "@/lib/iq/alignmentPresets";
import { findOffFieldDefenders, estimateCoverage } from "@/lib/iq/alignmentResolver";

const DEFENDER_ROLES: IqActorRole[] = ["P","C","1B","2B","3B","SS","LF","CF","RF"];
const OUTFIELD = new Set<IqActorRole>(["LF","CF","RF"]);
const CORNERS = new Set<IqActorRole>(["1B","3B"]);
const MIDDLE = new Set<IqActorRole>(["2B","SS"]);

interface EditState {
  anchorsR: DefensiveAnchors;
  anchorsL: DefensiveAnchors;
  ranges: AlignmentRanges;
}

function defaultAnchorFor(role: IqActorRole): StepAnchor {
  if (role === "P") return { kind: "mound" };
  if (role === "C") return { kind: "plate" };
  if (role === "1B") return { kind: "corner_bag", bag: "1B", towardSecond: 5, backFromBag: 5 };
  if (role === "3B") return { kind: "corner_bag", bag: "3B", towardSecond: 7, backFromBag: 7 };
  if (role === "2B") return { kind: "middle_bag", fromBag: "2B", towardBag: "1B", feetFromFromBag: 45, backSteps: 3 };
  if (role === "SS") return { kind: "middle_bag", fromBag: "2B", towardBag: "3B", feetFromFromBag: 45, backSteps: 3 };
  if (role === "LF") return { kind: "outfield", lateralStepsRightOfSecond: -22, depthStepsFromHome: 95 };
  if (role === "CF") return { kind: "outfield", lateralStepsRightOfSecond: 3,   depthStepsFromHome: 100 };
  if (role === "RF") return { kind: "outfield", lateralStepsRightOfSecond: 25,  depthStepsFromHome: 95 };
  return { kind: "mound" };
}

function ensureAnchors(source: DefensiveAnchors | null | undefined): DefensiveAnchors {
  const out: DefensiveAnchors = { ...(source ?? {}) } as DefensiveAnchors;
  for (const r of DEFENDER_ROLES) {
    if (!(out as any)[r]) (out as any)[r] = defaultAnchorFor(r);
  }
  return out;
}

const CORNER_BAG_TARGETS = ["2B"] as const;
const MIDDLE_BAG_OPTIONS = ["1B","2B","3B"] as const;

export default function IqAlignmentsEditor() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [sport, setSport] = useState<FieldSport>("baseball");
  const [hand, setHand] = useState<Handedness>("R");
  const presetsQ = useAlignmentPresets(sport);
  const presets = presetsQ.data ?? [];
  const [presetKey, setPresetKey] = useState<string>("standard");

  const [state, setState] = useState<EditState>({
    anchorsR: ensureAnchors(null),
    anchorsL: ensureAnchors(null),
    ranges: { ...DEFAULT_RANGE_RADII },
  });
  const [savedState, setSavedState] = useState<EditState>(state);
  const [selected, setSelected] = useState<Set<IqActorRole>>(new Set());
  const [dragging, setDragging] = useState<IqActorRole | null>(null);
  const [saving, setSaving] = useState(false);
  const [showRanges, setShowRanges] = useState(true);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const currentPreset = useMemo(
    () => presets.find((p) => p.preset_key === presetKey) ?? null,
    [presets, presetKey],
  );

  // Load preset from DB → editor state
  useEffect(() => {
    if (presets.length === 0) return;
    const p = presets.find((x) => x.preset_key === presetKey) ?? presets[0];
    if (!p) return;
    if (p.preset_key !== presetKey) setPresetKey(p.preset_key);
    const next: EditState = {
      anchorsR: ensureAnchors(p.anchors_vs_rhh as any),
      anchorsL: ensureAnchors(p.anchors_vs_lhh as any),
      ranges: { ...DEFAULT_RANGE_RADII, ...(p.range_radii ?? {}) },
    };
    setState(next);
    setSavedState(next);
    setSelected(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sport, presetKey, presets.length]);

  const dirty = useMemo(
    () => JSON.stringify(state) !== JSON.stringify(savedState),
    [state, savedState],
  );

  const currentAnchors = hand === "R" ? state.anchorsR : state.anchorsL;
  const setCurrentAnchors = useCallback((updater: (a: DefensiveAnchors) => DefensiveAnchors) => {
    setState((s) => hand === "R"
      ? { ...s, anchorsR: updater(s.anchorsR) }
      : { ...s, anchorsL: updater(s.anchorsL) });
  }, [hand]);

  const positions = useMemo(
    () => anchorsToPositions(sport, currentAnchors, hand),
    [sport, currentAnchors, hand],
  );

  // Coverage + off-field detection
  const coverage = useMemo(
    () => estimateCoverage(positions as any, state.ranges as any),
    [positions, state.ranges],
  );
  const offField = useMemo(() => findOffFieldDefenders(positions as any), [positions]);

  // -------- selection helpers --------
  const toggleSelect = (role: IqActorRole, additive: boolean) => {
    setSelected((prev) => {
      const next = new Set(additive ? prev : []);
      if (next.has(role)) next.delete(role); else next.add(role);
      return next;
    });
  };
  const clearSelection = () => setSelected(new Set());

  // -------- drag → adjust anchor by steps --------
  // Convert a drag delta (grid units) into anchor field mutations.
  const nudgeAnchor = (role: IqActorRole, dxSteps: number, dySteps: number) => {
    setCurrentAnchors((a) => {
      const cur = (a as any)[role] as StepAnchor;
      if (!cur) return a;
      const next: StepAnchor = { ...cur } as any;
      if (cur.kind === "corner_bag") {
        (next as any).towardSecond = Math.round(cur.towardSecond + dxSteps * (cur.bag === "1B" ? -1 : 1));
        (next as any).backFromBag = Math.round(cur.backFromBag - dySteps);
      } else if (cur.kind === "middle_bag") {
        (next as any).feetFromFromBag = Math.max(0, Math.round(cur.feetFromFromBag + dxSteps * 2.5));
        (next as any).backSteps = Math.round(cur.backSteps - dySteps);
      } else if (cur.kind === "outfield") {
        (next as any).lateralStepsRightOfSecond = Math.round(cur.lateralStepsRightOfSecond + dxSteps * (hand === "R" ? 1 : -1));
        (next as any).depthStepsFromHome = Math.max(0, Math.round(cur.depthStepsFromHome - dySteps));
      }
      return { ...a, [role]: next };
    });
  };

  const eventToPct = (e: React.PointerEvent) => {
    const rect = wrapRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  const dragStart = useRef<{ role: IqActorRole; px: number; py: number } | null>(null);
  const onPuckPointerDown = (e: React.PointerEvent, role: IqActorRole) => {
    e.preventDefault(); e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const { x, y } = eventToPct(e);
    dragStart.current = { role, px: x, py: y };
    setDragging(role);
    toggleSelect(role, e.shiftKey || e.metaKey || e.ctrlKey);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const { x, y } = eventToPct(e);
    const dx = x - dragStart.current.px;
    const dy = y - dragStart.current.py;
    // 1 grid unit ≈ 1 step for baseball baseline; visual fidelity matters more than exact steps here.
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
    nudgeAnchor(dragStart.current.role, dx, dy);
    dragStart.current.px = x; dragStart.current.py = y;
  };
  const stopDrag = () => { dragStart.current = null; setDragging(null); };

  // -------- Mirror to opposite hand --------
  const mirrorToOpposite = () => {
    setState((s) => {
      const src = hand === "R" ? s.anchorsR : s.anchorsL;
      const mirrored: DefensiveAnchors = {};
      (Object.keys(src) as (keyof DefensiveAnchors)[]).forEach((k) => {
        const a = src[k]; if (!a) return;
        (mirrored as any)[k] = mirrorAnchor(a);
      });
      return hand === "R" ? { ...s, anchorsL: mirrored } : { ...s, anchorsR: mirrored };
    });
    toast({ title: "Mirrored", description: `Copied ${hand === "R" ? "RHH → LHH" : "LHH → RHH"} with lateral flip` });
  };

  // -------- Reset --------
  const resetHandToSeed = () => {
    const seeds = seedPresets(sport);
    const seed = seeds.find((s) => s.preset_key === presetKey) ?? seeds[0];
    if (!seed) return;
    setState((s) => hand === "R"
      ? { ...s, anchorsR: ensureAnchors(seed.anchors_vs_rhh) }
      : { ...s, anchorsL: ensureAnchors(seed.anchors_vs_lhh) });
  };

  // -------- Save --------
  const handleSave = async () => {
    if (!currentPreset) return;
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      // Also compute legacy positions_vs_<hand> for viewers that don't know anchors.
      const posR = anchorsToPositions(sport, state.anchorsR, "R");
      const posL = anchorsToPositions(sport, state.anchorsL, "L");
      const { error } = await supabase
        .from("iq_defensive_alignments" as any)
        .update({
          anchors_vs_rhh: state.anchorsR,
          anchors_vs_lhh: state.anchorsL,
          positions_vs_rhh: posR,
          positions_vs_lhh: posL,
          positions: posR,           // legacy default
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
      toast({ title: "Default set", description: currentPreset.label });
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
      const posR = anchorsToPositions(sport, state.anchorsR, "R");
      const posL = anchorsToPositions(sport, state.anchorsL, "L");
      const { data, error } = await supabase.from("iq_defensive_alignments" as any).insert({
        sport, preset_key: key, label,
        anchors_vs_rhh: state.anchorsR, anchors_vs_lhh: state.anchorsL,
        positions_vs_rhh: posR, positions_vs_lhh: posL, positions: posR,
        range_radii: state.ranges, is_default: false,
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
      toast({ title: "Cannot delete Standard", variant: "destructive" }); return;
    }
    if (!window.confirm(`Delete "${currentPreset.label}"?`)) return;
    try {
      const { error } = await supabase.from("iq_defensive_alignments" as any)
        .delete().eq("id", currentPreset.id);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["iq-alignments", sport] });
      setPresetKey("standard");
    } catch (e: any) {
      toast({ title: "Delete failed", description: e?.message ?? "Try again", variant: "destructive" });
    }
  };

  const soloSelected: IqActorRole | null = selected.size === 1 ? Array.from(selected)[0] : null;
  const soloAnchor = soloSelected ? (currentAnchors as any)[soloSelected] as StepAnchor | undefined : undefined;

  const updateSoloAnchor = (patch: Partial<any>) => {
    if (!soloSelected) return;
    setCurrentAnchors((a) => {
      const cur = (a as any)[soloSelected] as StepAnchor;
      if (!cur) return a;
      return { ...a, [soloSelected]: { ...cur, ...patch } };
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/owner/iq/situations")}>
              Author situation
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/owner/iq/alignments/audit")}>
              <ShieldCheck className="h-4 w-4 mr-1" /> Audit
            </Button>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold">Defensive alignments</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Set anchors per handedness in coach language. Drag or type steps. Mirror one hand to the other with a single tap.
          </p>
        </div>

        {/* Sport + preset */}
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

          <Tabs value={hand} onValueChange={(v) => setHand(v as Handedness)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="R">vs RHH</TabsTrigger>
              <TabsTrigger value="L">vs LHH</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={handleSave} disabled={!dirty || saving}>
              <Save className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Save"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setState(savedState)} disabled={!dirty}>
              <RotateCcw className="h-4 w-4 mr-1" /> Revert
            </Button>
            <Button size="sm" variant="outline" onClick={mirrorToOpposite}>
              <FlipHorizontal className="h-4 w-4 mr-1" /> Mirror to {hand === "R" ? "LHH" : "RHH"}
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
            <Badge variant={offField.length ? "destructive" : "outline"} className="ml-auto">
              Coverage {coverage}%
            </Badge>
            {offField.length > 0 && (
              <Badge variant="destructive">Off-field: {offField.join(", ")}</Badge>
            )}
          </div>
        </Card>

        <Card className="p-3 flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <Switch checked={showRanges} onCheckedChange={setShowRanges} />
            <Eye className="h-4 w-4" /> Range disks
          </label>
          <Button size="sm" variant="ghost" onClick={resetHandToSeed}>Reset {hand}HH to seed</Button>
        </Card>

        {/* Field */}
        <div
          ref={wrapRef}
          className="relative touch-none select-none w-full aspect-square rounded-2xl overflow-hidden border"
          onPointerMove={onPointerMove}
          onPointerUp={stopDrag}
          onPointerLeave={stopDrag}
          onPointerDown={(e) => { if (e.target === e.currentTarget) clearSelection(); }}
        >
          <IqField sport={sport} />
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
            {showRanges && DEFENDER_ROLES.map((r) => {
              const p = positions[r]; if (!p) return null;
              const rad = state.ranges[r] ?? DEFAULT_RANGE_RADII[r] ?? 10;
              return (
                <circle key={`rng-${r}`} cx={p.x} cy={p.y} r={rad}
                  fill={OUTFIELD.has(r) ? "hsl(160 60% 45% / 0.15)" : "hsl(35 85% 55% / 0.15)"}
                  stroke="hsl(var(--iq-chalk) / 0.3)" strokeWidth="0.15" />
              );
            })}
          </svg>

          {DEFENDER_ROLES.map((r) => {
            const p = positions[r]; if (!p) return null;
            const sel = selected.has(r);
            const anchor = (currentAnchors as any)[r] as StepAnchor | undefined;
            const label = anchor ? describeAnchor(anchor, hand) : "";
            return (
              <div key={r}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
              >
                <button
                  type="button"
                  aria-label={`${ROLE_LABELS[r]} — ${label}`}
                  onPointerDown={(e) => onPuckPointerDown(e, r)}
                  onClick={(e) => { e.stopPropagation(); toggleSelect(r, e.shiftKey || e.metaKey || e.ctrlKey); }}
                  className="rounded-full font-bold shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing"
                  style={{
                    width: "clamp(30px, 5.5vw, 42px)",
                    height: "clamp(30px, 5.5vw, 42px)",
                    background: sel ? "hsl(var(--primary))" : "hsl(var(--iq-bag))",
                    color: "hsl(var(--iq-field))",
                    border: sel ? "3px solid hsl(var(--primary-foreground))" : "2px solid hsl(var(--iq-chalk) / 0.9)",
                    fontSize: "clamp(10px, 2.2vw, 13px)",
                    touchAction: "none",
                  }}
                >
                  {r}
                </button>
                {(sel || dragging === r) && label && (
                  <span className="mt-1 text-[9px] leading-tight px-1.5 py-0.5 rounded bg-background/95 border max-w-[140px] text-center">
                    {label}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Numeric Step Panel */}
        <Card className="p-3 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Step panel — {soloSelected ? `${soloSelected} (${ROLE_LABELS[soloSelected]})` : "select a defender to edit"}
          </div>

          {soloSelected && soloAnchor && soloAnchor.kind === "corner_bag" && (
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Steps toward 2B" value={soloAnchor.towardSecond}
                onChange={(v) => updateSoloAnchor({ towardSecond: v })} />
              <NumField label={`Steps back from ${soloAnchor.bag}`} value={soloAnchor.backFromBag}
                onChange={(v) => updateSoloAnchor({ backFromBag: v })} />
            </div>
          )}

          {soloSelected && soloAnchor && soloAnchor.kind === "middle_bag" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">From bag</Label>
                <Select value={soloAnchor.fromBag} onValueChange={(v) => updateSoloAnchor({ fromBag: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MIDDLE_BAG_OPTIONS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Toward bag</Label>
                <Select value={soloAnchor.towardBag} onValueChange={(v) => updateSoloAnchor({ towardBag: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MIDDLE_BAG_OPTIONS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <NumField label="Feet from-bag toward" value={soloAnchor.feetFromFromBag}
                onChange={(v) => updateSoloAnchor({ feetFromFromBag: v })} min={0} max={90} />
              <NumField label="Steps back from baseline" value={soloAnchor.backSteps}
                onChange={(v) => updateSoloAnchor({ backSteps: v })} />
            </div>
          )}

          {soloSelected && soloAnchor && soloAnchor.kind === "outfield" && (
            <div className="grid grid-cols-2 gap-3">
              <NumField label={`Steps right of 2B (vs ${hand}HH; − = left)`}
                value={soloAnchor.lateralStepsRightOfSecond}
                onChange={(v) => updateSoloAnchor({ lateralStepsRightOfSecond: v })}
                min={-60} max={60} />
              <NumField label="Steps back from home (depth)"
                value={soloAnchor.depthStepsFromHome}
                onChange={(v) => updateSoloAnchor({ depthStepsFromHome: v })}
                min={0} max={160} />
            </div>
          )}

          {soloSelected && soloAnchor && (soloAnchor.kind === "mound" || soloAnchor.kind === "plate") && (
            <p className="text-xs text-muted-foreground">
              {soloAnchor.kind === "mound" ? "Pitcher position is fixed on the rubber." : "Catcher position is fixed behind the plate."}
            </p>
          )}

          {soloSelected && (
            <div className="pt-2 border-t space-y-1">
              <Label className="text-xs">Range radius ({state.ranges[soloSelected] ?? DEFAULT_RANGE_RADII[soloSelected] ?? 10})</Label>
              <Slider value={[state.ranges[soloSelected] ?? DEFAULT_RANGE_RADII[soloSelected] ?? 10]}
                min={2} max={30} step={0.5}
                onValueChange={(v) => setState((s) => ({ ...s, ranges: { ...s.ranges, [soloSelected]: v[0] } }))} />
            </div>
          )}

          {!soloSelected && (
            <p className="text-xs text-muted-foreground">
              Tap a defender puck to edit their step anchors, or shift-click to multi-select then drag as a group.
            </p>
          )}
        </Card>

        {/* Live coach labels for all defenders */}
        <Card className="p-3 space-y-1.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Coach language — vs {hand}HH
          </div>
          {DEFENDER_ROLES.map((r) => {
            const a = (currentAnchors as any)[r] as StepAnchor | undefined;
            return (
              <button key={r}
                onClick={() => setSelected(new Set([r]))}
                className={`w-full text-left grid grid-cols-[3rem_1fr] items-center gap-2 rounded border px-2 py-1.5 text-xs ${
                  selected.has(r) ? "border-primary bg-primary/5" : "bg-card hover:bg-accent/50"}`}
              >
                <span className="font-bold">{r}</span>
                <span className="text-muted-foreground truncate">{a ? describeAnchor(a, hand) : "—"}</span>
              </button>
            );
          })}
        </Card>
      </div>
    </DashboardLayout>
  );
}

function NumField({
  label, value, onChange, min = -40, max = 40,
}: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="outline" onClick={() => onChange(value - 1)}>−</Button>
        <Input type="number" value={value} min={min} max={max}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v)) onChange(Math.max(min, Math.min(max, v)));
          }}
          className="h-9 text-center" />
        <Button size="sm" variant="outline" onClick={() => onChange(value + 1)}>+</Button>
      </div>
    </div>
  );
}
