/**
 * BaserunLogger — steals, dirtball reads, pickoffs, advances, tag-ups.
 * Captures lead steps, pitcher time-to-home, catcher pop, arm side,
 * pitch type ran on, run time, success.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Check, X as XIcon, Footprints } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { showUndoToast } from "@/lib/games/undoToast";
import { RepCard, RepKeyboardHints } from "./RepCard";


const EVENT_TYPES = ["steal","dirtball_read","pickoff","advance","caught","tag_up"];
const PITCH_TYPES = ["FB","2-seam","CT","SL","CB","CH","SP","KN","rise","drop","screw"];

export function BaserunLogger({ gameId }: { gameId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [show, setShow] = useState(false);

  const list = useQuery({
    queryKey: ["gp-run", gameId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("gp_baserun_events").select("*").eq("game_id", gameId)
        .order("inning", { ascending: true }).order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["gp-run", gameId] });

  const add = useMutation({
    mutationFn: async (row: Record<string, any>) => {
      const { data, error } = await (supabase as any)
        .from("gp_baserun_events")
        .insert({ ...row, user_id: user!.id, game_id: gameId })
        .select("id")
        .single();
      if (error) throw error;
      return data?.id as string | undefined;
    },
    onSuccess: (id) => {
      invalidate();
      setShow(false);
      showUndoToast({
        label: "Baserun event saved",
        undo: async () => {
          if (id) {
            await (supabase as any).from("gp_baserun_events").delete().eq("id", id);
            invalidate();
          }
        },
      });
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const prev = (list.data ?? []).find((r: any) => r.id === id) ?? null;
      const { error } = await (supabase as any)
        .from("gp_baserun_events").delete().eq("id", id);
      if (error) throw error;
      return prev;
    },
    onSuccess: (prev) => {
      invalidate();
      showUndoToast({
        label: "Baserun event deleted",
        undo: async () => {
          if (!prev) return;
          const { id: _i, created_at: _c, ...restore } = prev as any;
          await (supabase as any).from("gp_baserun_events").insert(restore);
          invalidate();
        },
      });
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            {(list.data ?? []).length} baserun event{(list.data ?? []).length === 1 ? "" : "s"}
          </p>
          <RepKeyboardHints hints={[{ key: "N", label: "new event" }]} />
        </div>
        <Button size="sm" onClick={() => setShow(true)} className="gap-1">
          <Plus className="h-3.5 w-3.5" /> New event
        </Button>
      </div>

      {show && <RunForm onCancel={() => setShow(false)} onSave={(r) => add.mutate(r)} />}

      {(list.data ?? []).length === 0 && !show && (
        <Card className="p-5 text-center bg-muted/20 border-dashed">
          <Footprints className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">No baserun events yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Each baserunning event is a rep. Press <kbd className="px-1 rounded bg-muted">N</kbd> to add.
          </p>
        </Card>
      )}

      <div className="space-y-2">
        {(list.data ?? []).map((r, idx) => (
          <RepCard
            key={r.id}
            accent="baserun"
            repNumber={idx + 1}
            title={
              <span className="flex items-center gap-1.5">
                {r.event_type}
                {r.success === true && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                {r.success === false && <XIcon className="h-3.5 w-3.5 text-rose-600" />}
              </span>
            }
            badges={[
              { label: `Inn ${r.inning ?? "?"}` },
              ...(r.base_from != null && r.base_to != null
                ? [{ label: `${r.base_from}→${r.base_to}`, variant: "secondary" as const }]
                : []),
              ...(r.is_pinch_run ? [{ label: "PR" }] : []),
            ]}
            meta={
              <>
                {r.lead_steps != null && <span>Lead: {r.lead_steps} steps</span>}
                {r.pitcher_time_to_home_sec != null && <span>P→H: {r.pitcher_time_to_home_sec}s</span>}
                {r.catcher_pop_time_sec != null && <span>Pop: {r.catcher_pop_time_sec}s</span>}
                {r.pitcher_arm_side && <span>Arm: {r.pitcher_arm_side}</span>}
                {r.pitch_type_ran_on && <span>Pitch: {r.pitch_type_ran_on}</span>}
                {r.run_time_sec != null && <span>Run: {r.run_time_sec}s</span>}
              </>
            }
            notes={r.notes}
            onDelete={() => del.mutate(r.id)}
          />
        ))}
      </div>
    </div>
  );

}

function RunForm({ onSave, onCancel }: {
  onSave: (r: Record<string, any>) => void; onCancel: () => void;
}) {
  const [f, setF] = useState<Record<string, any>>({
    inning: 1, event_type: "steal", base_from: 1, base_to: 2,
    success: true, lead_steps: "", pitcher_arm_side: "R",
    pitcher_time_to_home_sec: "", catcher_pop_time_sec: "",
    pitch_type_ran_on: "", run_time_sec: "", is_pinch_run: false, notes: "",
  });
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  return (
    <Card className="p-4 space-y-3 bg-muted/30">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <F label="Inning"><Input type="number" value={f.inning}
          onChange={(e) => set("inning", Number(e.target.value))} /></F>
        <F label="Event">
          <Select value={f.event_type} onValueChange={(v) => set("event_type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{EVENT_TYPES.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent>
          </Select>
        </F>
        <F label="Success">
          <Select value={String(f.success)} onValueChange={(v) => set("success", v === "true")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Safe / read it</SelectItem>
              <SelectItem value="false">Caught / missed</SelectItem>
            </SelectContent>
          </Select>
        </F>
        <F label="From"><Input type="number" min={0} max={4} value={f.base_from}
          onChange={(e) => set("base_from", Number(e.target.value))} /></F>
        <F label="To"><Input type="number" min={0} max={4} value={f.base_to}
          onChange={(e) => set("base_to", Number(e.target.value))} /></F>
        <F label="Lead (steps)">
          <Input type="number" step="0.5" value={f.lead_steps}
            onChange={(e) => set("lead_steps", e.target.value)} />
        </F>
        <F label="Pitcher arm">
          <Select value={f.pitcher_arm_side} onValueChange={(v) => set("pitcher_arm_side", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="L">L</SelectItem><SelectItem value="R">R</SelectItem>
            </SelectContent>
          </Select>
        </F>
        <F label="P → H (sec)">
          <Input type="number" step="0.01" value={f.pitcher_time_to_home_sec}
            onChange={(e) => set("pitcher_time_to_home_sec", e.target.value)} />
        </F>
        <F label="Pop time (sec)">
          <Input type="number" step="0.01" value={f.catcher_pop_time_sec}
            onChange={(e) => set("catcher_pop_time_sec", e.target.value)} />
        </F>
        <F label="Pitch type">
          <Select value={f.pitch_type_ran_on} onValueChange={(v) => set("pitch_type_ran_on", v)}>
            <SelectTrigger><SelectValue placeholder="Pick" /></SelectTrigger>
            <SelectContent>{PITCH_TYPES.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent>
          </Select>
        </F>
        <F label="My run (sec)">
          <Input type="number" step="0.01" value={f.run_time_sec}
            onChange={(e) => set("run_time_sec", e.target.value)} />
        </F>
      </div>
      <div className="flex items-center gap-2">
        <input id="pr" type="checkbox" checked={f.is_pinch_run}
          onChange={(e) => set("is_pinch_run", e.target.checked)} />
        <Label htmlFor="pr" className="text-xs">Pinch runner</Label>
      </div>
      <F label="Notes"><Textarea rows={2} value={f.notes}
        onChange={(e) => set("notes", e.target.value)} /></F>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={() => {
          const payload: Record<string, any> = { ...f };
          ["lead_steps","pitcher_time_to_home_sec","catcher_pop_time_sec","run_time_sec"].forEach((k) => {
            payload[k] = payload[k] === "" ? null : Number(payload[k]);
          });
          if (!payload.pitch_type_ran_on) payload.pitch_type_ran_on = null;
          onSave(payload);
        }}>Save</Button>
      </div>
    </Card>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
