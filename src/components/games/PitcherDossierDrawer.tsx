/**
 * PitcherDossierDrawer — create/edit a pitcher dossier.
 * Embeds the StrikeZonePlanner so the user can mark attack/avoid/take zones.
 */
import { useEffect, useState } from "react";
import { usePitcherDossiers, type PitcherDossier } from "@/hooks/useGameDossiers";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { StrikeZonePlanner } from "./StrikeZonePlanner";

const ARM_SLOTS = ["over_top","high_three_quarter","three_quarter","low_three_quarter","side_arm","submarine","windmill"];
const PITCH_TYPES = ["FB","2-seam","CT","SL","CB","CH","SP","KN","rise","drop","screw"];

export function PitcherDossierDrawer({
  open, onOpenChange, sport, dossier,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sport: string;
  dossier: PitcherDossier | null;
}) {
  const { upsert } = usePitcherDossiers();
  const [f, setF] = useState<Partial<PitcherDossier>>({});
  useEffect(() => {
    if (open) setF(dossier ?? { sport });
  }, [open, dossier, sport]);
  const set = (k: keyof PitcherDossier, v: any) => setF((p) => ({ ...p, [k]: v }));

  const repertoire = f.repertoire ?? [];
  const addPitch = () => set("repertoire", [...repertoire, { pitch: "FB", usage: 50 }]);
  const setPitch = (i: number, patch: any) =>
    set("repertoire", repertoire.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const delPitch = (i: number) =>
    set("repertoire", repertoire.filter((_, idx) => idx !== i));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{dossier ? "Edit pitcher" : "New pitcher dossier"}</SheetTitle>
          <SheetDescription>
            Pregame plan + postgame notes live forever. Reuse across games.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name">
              <Input value={f.name ?? ""} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="Team">
              <Input value={f.team ?? ""} onChange={(e) => set("team", e.target.value)} />
            </Field>
            <Field label="Throws">
              <Select value={f.throws ?? ""} onValueChange={(v) => set("throws", v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="L">L</SelectItem><SelectItem value="R">R</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Arm slot">
              <Select value={f.arm_slot ?? ""} onValueChange={(v) => set("arm_slot", v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {ARM_SLOTS.map((s) => (<SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Repertoire</Label>
              <Button size="sm" variant="outline" onClick={addPitch} className="gap-1 h-7">
                <Plus className="h-3 w-3" /> Add pitch
              </Button>
            </div>
            <div className="space-y-1.5">
              {repertoire.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select value={p.pitch} onValueChange={(v) => setPitch(i, { pitch: v })}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PITCH_TYPES.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number" min={0} max={100} placeholder="usage %"
                    value={p.usage ?? ""} onChange={(e) => setPitch(i, { usage: Number(e.target.value) })}
                    className="w-24"
                  />
                  <Input
                    type="number" placeholder="velo"
                    value={p.velo ?? ""} onChange={(e) => setPitch(i, { velo: Number(e.target.value) })}
                    className="w-24"
                  />
                  <Input
                    placeholder="notes"
                    value={p.notes ?? ""} onChange={(e) => setPitch(i, { notes: e.target.value })}
                    className="flex-1"
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600"
                    onClick={() => delPitch(i)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              {repertoire.length === 0 && (
                <p className="text-xs text-muted-foreground">No pitches yet.</p>
              )}
            </div>
          </div>

          <Card className="p-3 space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Strike-zone plan</Label>
            <StrikeZonePlanner
              value={f.strike_zone_plan ?? null}
              onChange={(v) => set("strike_zone_plan", v)}
            />
            <div className="flex gap-2 flex-wrap text-[11px]">
              <Badge variant="outline" className="border-emerald-500 text-emerald-700">attack</Badge>
              <Badge variant="outline" className="border-rose-500 text-rose-700">avoid</Badge>
              <Badge variant="outline" className="border-amber-500 text-amber-700">take</Badge>
            </div>
          </Card>

          <Field label="Pre-game notes">
            <Textarea rows={3} value={f.notes_pregame ?? ""}
              onChange={(e) => set("notes_pregame", e.target.value)} />
          </Field>
          <Field label="Post-game notes">
            <Textarea rows={3} value={f.notes_postgame ?? ""}
              onChange={(e) => set("notes_postgame", e.target.value)} />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              disabled={!f.name}
              onClick={() => {
                upsert.mutate(
                  { ...(f as any), sport: f.sport ?? sport, name: f.name! },
                  { onSuccess: () => onOpenChange(false) },
                );
              }}
            >
              {dossier ? "Save" : "Create dossier"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
