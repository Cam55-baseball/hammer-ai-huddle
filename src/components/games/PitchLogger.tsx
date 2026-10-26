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

import { pitchTypes, armSlots } from "@/lib/games/sportRules";
import { pitchEntryPayload } from "@/lib/games/pitchEntry";
import { entrySourceLabel } from "@/lib/intelligence/entrySource";
import { pitchResultPlain } from "@/lib/games/glossary";
import { BUNT_TYPES, BUNT_WORDING } from '../../../supabase/functions/_shared/wic/buntingProgram';
import { DRAG_BUNT_GUIDANCE, twoStrikeBunt } from '../../../supabase/functions/_shared/wic/buntingMastery';

const CONTACTS = ["weak","medium","hard","barrel","mishit"];
const SPRAY = ["pull_air","pull_ground","center_air","center_ground","oppo_air","oppo_ground"];


const RESULTS = ["ball","called_strike","swinging_strike","foul","in_play","hbp","bunt_foul","bunt_in_play"];

export function PitchLogger({ gameId, sport }: { gameId: string; sport: string }) {
  const PITCH_TYPES = pitchTypes(sport);
  const ARM_SLOTS = armSlots(sport);
  const { list, add, del } = useGamePitches(gameId);
  const qc = useQueryClient();
  const [tab, setTab] = useState<"pitcher" | "hitter">("pitcher");
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
              sport={sport}
              perspective={tab}
              onCancel={() => setShow(false)}
              saving={add.isPending}
              onSave={async (row) => { await add.mutateAsync(row); setShow(false); }}
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
      title={p.pitch_type || "Pitch type not entered"}
      badges={[
        { label: `Logged by: ${entrySourceLabel(p.entry_source)}`, variant: "outline" as const },
        { label: `Inn ${p.inning ?? "?"}` },
        ...(p.pitch_no != null ? [{ label: `P${p.pitch_no}`, variant: "secondary" as const }] : []),
        ...(p.location?.zone != null ? [{ label: `Z${p.location.zone}` }] : []),
        ...(p.location?.outZone ? [{ label: p.location.outZone }] : []),
      ]}
      meta={
        <>
          {p.pitch_velo != null && <span>Pitch speed: {p.pitch_velo} mph</span>}
          {p.result && <span>Result: {pitchResultPlain(p.result) ?? p.result}</span>}
          {p.bunt_type && p.bunt_side && <span>{p.bunt_side === 'R' ? 'Right-handed' : 'Left-handed'}: {BUNT_WORDING[p.bunt_side][p.bunt_type]}</span>}
          {p.bunt_success != null && <span>Successful bunt: {p.bunt_success ? 'Yes' : 'No'}</span>}
          {twoStrikeBunt(p.result,p.count_strikes) && <span className="text-destructive">Two-strike bunt attempt — a foul bunt is a strikeout.</span>}
          {p.contact_quality && <span>Contact observed: {p.contact_quality}</span>}
          {p.spray_bucket && <span>Ball direction: {p.spray_bucket.replace(/_/g, " ")}</span>}
          {p.hard_hit != null && <span>Hard contact observed: {p.hard_hit ? "Yes" : "No"}</span>}
          {p.intent_location && <span>Intended location: {p.intent_location.zone != null ? `Zone ${p.intent_location.zone}` : p.intent_location.outZone}</span>}
          {p.opponent_hitter_name && <span>vs {p.opponent_hitter_name}</span>}
        </>
      }
      notes={p.notes}
      onDelete={onDelete}
    />
  );
}


function PitchForm({
  sport, perspective, onSave, onCancel, saving,
}: {
  sport: string;
  perspective: "pitcher" | "hitter";
  onSave: (row: any) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const PITCH_TYPES = pitchTypes(sport);
  const ARM_SLOTS = armSlots(sport);
  const [zoneVal, setZoneVal] = useState<{ zone: Zone | null; outZone?: OutZone }>({ zone: null });
  const [intentZone, setIntentZone] = useState<{ zone: Zone | null; outZone?: OutZone }>({ zone: null });
  const [showIntent, setShowIntent] = useState(false);
  const [f, setF] = useState<Record<string, any>>({
    inning: "",
    pitch_no: "",
    pitch_type: "",
    pitch_velo: "",
    result: "",
    pitcher_arm_slot: "",
    pitcher_throws: "",
    batter_handedness: "",
    opponent_hitter_name: "",
    count_balls: "",
    count_strikes: "",
    notes: "",
    contact: "",
    spray: "",
    hard_hit: "",
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
                Intended location (optional)
              </label>
              {showIntent && (
                <>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Intended location
                  </div>
                  <StrikeZoneGrid value={intentZone} onChange={setIntentZone} size={140} />
                </>
              )}
            </>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <F label="Inn"><NumberField value={f.inning}
            onValueChange={(v) => set("inning", v ?? "")} /></F>
          <F label="Pitch #"><NumberField value={f.pitch_no}
            onValueChange={(v) => set("pitch_no", v ?? "")} /></F>
          {isPitcher && <><F label="Batter opportunity #"><NumberField min={1} value={f.batter_opportunity??''} onValueChange={v=>set('batter_opportunity',v??'')} /></F><F label="Final batter result"><Select value={f.batter_result??'unknown'} onValueChange={v=>set('batter_result',v)}><SelectTrigger aria-label="Final batter result"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unknown">Still batting / not entered</SelectItem>{['K','BB','HBP','HR','out','hit','error','sacrifice','interference'].map(r=><SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></F></>}
          <F label="Type">
            <Select value={f.pitch_type} onValueChange={(v) => set("pitch_type", v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {PITCH_TYPES.map((t) => (<SelectItem key={t.value} value={t.value}>{t.full}</SelectItem>))}
              </SelectContent>
            </Select>
          </F>
          <F label="Velo"><NumberField value={f.pitch_velo}
            onChange={(e) => set("pitch_velo", e.target.value)} /></F>
          <F label="Result">
            <Select value={f.result} onValueChange={(v) => set("result", v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {RESULTS.map((r) => (<SelectItem key={r} value={r}>{pitchResultPlain(r) ?? r}</SelectItem>))}
              </SelectContent>
            </Select>
          </F>
          <F label="Balls"><NumberField min={0} max={4} value={f.count_balls}
            onValueChange={(v) => set("count_balls", v ?? "")} /></F>
          <F label="Strikes"><NumberField min={0} max={3} value={f.count_strikes}
            onValueChange={(v) => set("count_strikes", v ?? "")} /></F>
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
                {ARM_SLOTS.map((a) => (<SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>))}
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
              <F label="Ball direction">
                <Select value={f.spray} onValueChange={(v) => set("spray", v)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {SPRAY.map((s) => (<SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>))}
                  </SelectContent>
                </Select>
              </F>
              <F label="Hard contact observed?">
                <Select value={typeof f.hard_hit === "boolean" ? String(f.hard_hit) : "unknown"} onValueChange={(v) => set("hard_hit", v === "unknown" ? "" : v === "true")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unknown">Not entered</SelectItem>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </F>
            </>
          )}
          {!isPitcher && ['bunt_foul','bunt_in_play'].includes(f.result) && <>
            {f.bunt_type === 'drag' && <p className="col-span-2 sm:col-span-3 text-sm text-muted-foreground">{DRAG_BUNT_GUIDANCE}</p>}
            {twoStrikeBunt(f.result,f.count_strikes) && <p role="alert" className="col-span-2 sm:col-span-3 text-sm text-destructive">Two-strike bunt attempt — a foul bunt is a strikeout. The recorded result will stay as entered.</p>}
            <F label="Bunt batting side"><Select value={f.bunt_side ?? 'unknown'} onValueChange={v => set('bunt_side',v)}><SelectTrigger aria-label="Bunt batting side"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unknown">Not entered</SelectItem><SelectItem value="R">Right-handed</SelectItem><SelectItem value="L">Left-handed</SelectItem></SelectContent></Select></F>
            <F label="Bunt type"><Select value={f.bunt_type ?? 'unknown'} onValueChange={v=>set('bunt_type',v)}><SelectTrigger aria-label="Bunt type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unknown">Not entered</SelectItem>{BUNT_TYPES.map(type=><SelectItem key={type} value={type}>{BUNT_WORDING[f.bunt_side === 'L' ? 'L' : 'R'][type]}</SelectItem>)}</SelectContent></Select></F>
            <F label="Successful bunt"><Select value={typeof f.bunt_success === 'boolean' ? String(f.bunt_success) : 'unknown'} onValueChange={v=>set('bunt_success',v === 'unknown' ? null : v === 'true')}><SelectTrigger aria-label="Successful bunt"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unknown">Not entered</SelectItem><SelectItem value="true">Yes</SelectItem><SelectItem value="false">No</SelectItem></SelectContent></Select></F>
          </>}
          <F label="Notes" className="col-span-2 sm:col-span-3">
            <Input value={f.notes} onChange={(e) => set("notes", e.target.value)} />
          </F>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-3">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" disabled={saving} onClick={async () => {
          const payload = pitchEntryPayload(f, perspective, zoneVal, showIntent ? intentZone : undefined);
          try { await onSave(payload); } catch { /* Keep the unsaved form; the mutation reports the error. */ }
        }}>{saving ? "Saving…" : "Save pitch"}</Button>
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
