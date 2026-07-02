/**
 * PitchLogger — pitch-by-pitch entry for both perspectives.
 *
 * Tabs: As Pitcher (perspective='pitcher') / As Hitter (perspective='hitter').
 * Tap the 9-zone grid to set location.zone, or the surrounding out-bands.
 */
import { useState } from "react";
import { Plus } from "lucide-react";
import { useGamePitches, type GpPitchRow } from "@/hooks/useGamePitches";
import { StrikeZoneGrid, type Zone, type OutZone } from "./StrikeZoneGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RepCard, RepKeyboardHints } from "./RepCard";
import { showUndoToast } from "@/lib/games/undoToast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { NumberField } from "@/components/games/NumberField";

const CONTACTS = ["weak","medium","hard","barrel","mishit"];
const SPRAY = ["pull_air","pull_ground","center_air","center_ground","oppo_air","oppo_ground"];


const PITCH_TYPES = ["FB","2-seam","CT","SL","CB","CH","SP","KN","rise","drop","screw"];
const RESULTS = ["ball","called_strike","swinging_strike","foul","in_play","hbp","bunt_foul","bunt_in_play"];
const ARM_SLOTS = ["over_top","high_three_quarter","three_quarter","low_three_quarter","side_arm","submarine","windmill"];

export function PitchLogger({ gameId, sport }: { gameId: string; sport: string }) {
  const { list, add, del } = useGamePitches(gameId);
  const qc = useQueryClient();
  const [tab, setTab] = useState<"pitcher" | "hitter">("hitter");
  const [show, setShow] = useState(false);

  const rows = (list.data ?? []).filter((p) => p.perspective === tab);

  const handleDelete = async (p: GpPitchRow) => {
    await del.mutateAsync(p.id);
    showUndoToast({
      label: "Pitch removed",
      undo: async () => {
        const { id: _i, created_at: _c, ...rest } = p as any;
        await (supabase as any).from("gp_pitches").insert(rest);
        qc.invalidateQueries({ queryKey: ["gp-pitches", gameId] });
      },
    });
  };

  return (
    <div className="space-y-3">
      <Tabs value={tab} onValueChange={(v) => { setTab(v as any); setShow(false); }}>
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="hitter">As hitter</TabsTrigger>
          <TabsTrigger value="pitcher">As pitcher</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="pt-3 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs text-muted-foreground">
              {rows.length} pitch{rows.length === 1 ? "" : "es"} logged
            </p>
            <Button size="sm" onClick={() => setShow(true)} className="gap-1">
              <Plus className="h-3.5 w-3.5" /> New pitch
            </Button>
          </div>
          <RepKeyboardHints
            hints={[
              { key: "B", label: "ball" },
              { key: "C", label: "called strike" },
              { key: "S", label: "swing strike" },
              { key: "F", label: "foul" },
              { key: "I", label: "in play" },
            ]}
          />

          {show && (
            <PitchForm
              perspective={tab}
              onCancel={() => setShow(false)}
              onSave={(row) => { add.mutate(row); setShow(false); }}
            />
          )}

          <div className="space-y-2">
            {rows.map((p, idx) => (
              <PitchCard key={p.id} p={p} idx={idx + 1} onDelete={() => handleDelete(p)} />
            ))}
            {!list.isLoading && rows.length === 0 && !show && (
              <p className="text-xs text-muted-foreground text-center py-4">
                No pitches yet. Tap "New pitch" above.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PitchCard({ p, idx, onDelete }: { p: GpPitchRow; idx: number; onDelete: () => void }) {
  return (
    <RepCard
      accent="pitching"
      repNumber={idx}
      title={p.pitch_type || "—"}
      badges={[
        { label: `Inn ${p.inning ?? "?"}` },
        ...(p.pitch_no != null ? [{ label: `P${p.pitch_no}`, variant: "secondary" as const }] : []),
        ...(p.location?.zone != null ? [{ label: `Z${p.location.zone}` }] : []),
        ...(p.location?.outZone ? [{ label: p.location.outZone }] : []),
      ]}
      meta={
        <>
          {p.pitch_velo != null && <span>{p.pitch_velo} mph</span>}
          {p.result && <span>{p.result}</span>}
          {p.opponent_hitter_name && <span>vs {p.opponent_hitter_name}</span>}
        </>
      }
      notes={p.notes}
      onDelete={onDelete}
    />
  );
}


function PitchForm({
  perspective, onSave, onCancel,
}: {
  perspective: "pitcher" | "hitter";
  onSave: (row: any) => void;
  onCancel: () => void;
}) {
  const [zoneVal, setZoneVal] = useState<{ zone: Zone | null; outZone?: OutZone }>({ zone: 5 });
  const [intentZone, setIntentZone] = useState<{ zone: Zone | null; outZone?: OutZone }>({ zone: 5 });
  const [showIntent, setShowIntent] = useState(false);
  const [f, setF] = useState<Record<string, any>>({
    inning: 1,
    pitch_no: 1,
    pitch_type: "",
    pitch_velo: "",
    result: "",
    pitcher_arm_slot: "",
    pitcher_throws: "R",
    batter_handedness: "R",
    opponent_hitter_name: "",
    count_balls: 0,
    count_strikes: 0,
    notes: "",
    contact: "",
    spray: "",
    hard_hit: false,
  });
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));
  const isPitcher = perspective === "pitcher";
  const showHitterOutcomes = f.result === "in_play" || f.result === "bunt_in_play";

  return (
    <Card className="p-4 bg-muted/30 border-l-4 border-l-sky-500">
      <div className="grid grid-cols-1 sm:grid-cols-[auto,1fr] gap-4">
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Actual location
          </div>
          <StrikeZoneGrid value={zoneVal} onChange={setZoneVal} size={200} />
          {isPitcher && (
            <>
              <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Checkbox
                  checked={showIntent}
                  onCheckedChange={(v) => setShowIntent(Boolean(v))}
                />
                Log intent zone
              </label>
              {showIntent && (
                <>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Intent
                  </div>
                  <StrikeZoneGrid value={intentZone} onChange={setIntentZone} size={140} />
                </>
              )}
            </>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <F label="Inn"><NumberField value={f.inning}
            onValueChange={(v) => set("inning", v ?? 0)} /></F>
          <F label="Pitch #"><NumberField value={f.pitch_no}
            onValueChange={(v) => set("pitch_no", v ?? 0)} /></F>
          <F label="Type">
            <Select value={f.pitch_type} onValueChange={(v) => set("pitch_type", v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {PITCH_TYPES.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
              </SelectContent>
            </Select>
          </F>
          <F label="Velo"><NumberField value={f.pitch_velo}
            onChange={(e) => set("pitch_velo", e.target.value)} /></F>
          <F label="Result">
            <Select value={f.result} onValueChange={(v) => set("result", v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {RESULTS.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
              </SelectContent>
            </Select>
          </F>
          <F label="Balls"><NumberField min={0} max={4} value={f.count_balls}
            onValueChange={(v) => set("count_balls", v ?? 0)} /></F>
          <F label="Strikes"><NumberField min={0} max={3} value={f.count_strikes}
            onValueChange={(v) => set("count_strikes", v ?? 0)} /></F>
          <F label="Pitcher throws">
            <Select value={f.pitcher_throws} onValueChange={(v) => set("pitcher_throws", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="L">L</SelectItem><SelectItem value="R">R</SelectItem>
              </SelectContent>
            </Select>
          </F>
          <F label="Arm slot">
            <Select value={f.pitcher_arm_slot} onValueChange={(v) => set("pitcher_arm_slot", v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {ARM_SLOTS.map((a) => (<SelectItem key={a} value={a}>{a.replace(/_/g, " ")}</SelectItem>))}
              </SelectContent>
            </Select>
          </F>
          <F label="Batter">
            <Select value={f.batter_handedness} onValueChange={(v) => set("batter_handedness", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="L">L</SelectItem>
                <SelectItem value="R">R</SelectItem>
                <SelectItem value="S">S</SelectItem>
              </SelectContent>
            </Select>
          </F>
          <F label={perspective === "hitter" ? "Pitcher name" : "Hitter name"}>
            <Input value={f.opponent_hitter_name}
              onChange={(e) => set("opponent_hitter_name", e.target.value)} />
          </F>
          {isPitcher && showHitterOutcomes && (
            <>
              <F label="Contact">
                <Select value={f.contact} onValueChange={(v) => set("contact", v)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {CONTACTS.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                  </SelectContent>
                </Select>
              </F>
              <F label="Spray">
                <Select value={f.spray} onValueChange={(v) => set("spray", v)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {SPRAY.map((s) => (<SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>))}
                  </SelectContent>
                </Select>
              </F>
              <F label="Hard hit?">
                <label className="flex items-center gap-2 h-9">
                  <Checkbox
                    checked={f.hard_hit}
                    onCheckedChange={(v) => set("hard_hit", Boolean(v))}
                  />
                  <span className="text-xs text-muted-foreground">≥ hard / barrel</span>
                </label>
              </F>
            </>
          )}
          <F label="Notes" className="col-span-2 sm:col-span-3">
            <Input value={f.notes} onChange={(e) => set("notes", e.target.value)} />
          </F>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-3">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={() => {
          const extras: string[] = [];
          if (isPitcher && showIntent && (intentZone.zone || intentZone.outZone)) {
            const intentLabel = intentZone.zone ?? intentZone.outZone;
            const actualLabel = zoneVal.zone ?? zoneVal.outZone ?? "—";
            extras.push(`intent:${intentLabel}→actual:${actualLabel}`);
          }
          if (isPitcher && showHitterOutcomes) {
            if (f.contact) extras.push(`contact:${f.contact}`);
            if (f.spray) extras.push(`spray:${f.spray}`);
            if (f.hard_hit) extras.push("hard_hit");
          }
          const mergedNotes = extras.length
            ? [f.notes, `[${extras.join(" · ")}]`].filter(Boolean).join(" ")
            : f.notes;
          const payload: Record<string, any> = {
            ...f,
            perspective,
            pitch_velo: f.pitch_velo === "" ? null : Number(f.pitch_velo),
            pitch_type: f.pitch_type || null,
            result: f.result || null,
            pitcher_arm_slot: f.pitcher_arm_slot || null,
            opponent_hitter_name: f.opponent_hitter_name || null,
            notes: mergedNotes || null,
            location: zoneVal.zone || zoneVal.outZone ? zoneVal : null,
          };
          delete payload.contact;
          delete payload.spray;
          delete payload.hard_hit;
          onSave(payload);
        }}>Save pitch</Button>
      </div>
    </Card>
  );
}

function F({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={"space-y-1 " + (className ?? "")}>
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
