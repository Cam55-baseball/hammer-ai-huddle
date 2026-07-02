/**
 * HitterDossierDrawer — quick notes on opponent hitters you've faced.
 */
import { useEffect, useState } from "react";
import { useOpponentHitters, type OpponentHitter } from "@/hooks/useGameDossiers";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PregamePlanPanel } from "./PregamePlanPanel";
import { NumberField } from "@/components/games/NumberField";

export function HitterDossierDrawer({
  open, onOpenChange, sport, dossier,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sport: string;
  dossier: OpponentHitter | null;
}) {
  const { upsert } = useOpponentHitters();
  const [f, setF] = useState<Partial<OpponentHitter>>({});
  useEffect(() => {
    if (open) setF(dossier ?? { sport });
  }, [open, dossier, sport]);
  const set = (k: keyof OpponentHitter, v: any) => setF((p) => ({ ...p, [k]: v }));
  const t: any = f.tendencies ?? {};
  const setT = (k: string, v: any) => set("tendencies", { ...t, [k]: v });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{dossier ? "Edit hitter" : "New hitter dossier"}</SheetTitle>
          <SheetDescription>How they swing, where they chase, where to attack.</SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="profile" className="mt-4">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="plan" disabled={!dossier?.id}>Plan & Intel</TabsTrigger>
          </TabsList>
          <TabsContent value="profile" className="mt-3">
        <div className="space-y-3 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name">
              <Input value={f.name ?? ""} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="Team">
              <Input value={f.team ?? ""} onChange={(e) => set("team", e.target.value)} />
            </Field>
            <Field label="Bats">
              <Select value={f.bats ?? ""} onValueChange={(v) => set("bats", v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="L">L</SelectItem>
                  <SelectItem value="R">R</SelectItem>
                  <SelectItem value="S">Switch</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Spray tendency">
              <Select value={t.spray ?? ""} onValueChange={(v) => setT("spray", v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pull">Pull</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="oppo">Oppo</SelectItem>
                  <SelectItem value="all_fields">All fields</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Chases">
              <Select value={t.chases ?? ""} onValueChange={(v) => setT("chases", v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="in">In</SelectItem>
                  <SelectItem value="out">Away</SelectItem>
                  <SelectItem value="none">Disciplined</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="First-pitch swing %">
              <NumberField min={0} max={100} value={t.first_pitch_swing_pct ?? ""}
                onChange={(e) => setT("first_pitch_swing_pct", Number(e.target.value))} />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea rows={4} value={f.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              disabled={!f.name}
              onClick={() => upsert.mutate(
                { ...(f as any), sport: f.sport ?? sport, name: f.name! },
                { onSuccess: () => onOpenChange(false) },
              )}
            >
              {dossier ? "Save" : "Create"}
            </Button>
          </div>
        </div>
          </TabsContent>
          <TabsContent value="plan" className="mt-3">
            <PregamePlanPanel
              role="hitter"
              dossierId={dossier?.id ?? null}
              sport={(f.sport as string) ?? sport}
              archetype={(dossier as any)?.archetype ?? null}
              videoUrls={(dossier as any)?.video_urls ?? []}
            />
          </TabsContent>
        </Tabs>
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
