/**
 * DefenseLogger — defensive play entry. Position, shift (L/R/extreme/in/back),
 * play type, error flag, time-to-first, pop time, arm velo, notes.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
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

const POSITIONS = ["P","C","1B","2B","3B","SS","LF","CF","RF"];
const PLAY_TYPES = [
  "ground_ball","line_drive","fly_ball","pop_up","bunt","relay","cutoff",
  "double_play","triple_play","steal_attempt","pickoff","tag","force",
  "dive","wall_ball","collision","backup",
];
const SHIFTS = ["no_shift","left","right","extreme_left","extreme_right","in","back"];

export function DefenseLogger({ gameId }: { gameId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [show, setShow] = useState(false);

  const list = useQuery({
    queryKey: ["gp-def", gameId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("gp_defense_plays")
        .select("*")
        .eq("game_id", gameId)
        .order("inning", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const add = useMutation({
    mutationFn: async (row: Record<string, any>) => {
      const { error } = await (supabase as any)
        .from("gp_defense_plays")
        .insert({ ...row, user_id: user!.id, game_id: gameId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gp-def", gameId] });
      setShow(false);
      toast.success("Defensive play saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("gp_defense_plays").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gp-def", gameId] }),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {(list.data ?? []).length} play{(list.data ?? []).length === 1 ? "" : "s"}
        </p>
        <Button size="sm" onClick={() => setShow(true)} className="gap-1">
          <Plus className="h-3.5 w-3.5" /> New play
        </Button>
      </div>

      {show && <DefForm onCancel={() => setShow(false)} onSave={(r) => add.mutate(r)} />}

      <div className="space-y-2">
        {(list.data ?? []).map((p) => (
          <Card key={p.id} className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap text-sm">
                <Badge variant="outline">Inn {p.inning ?? "?"}</Badge>
                <Badge variant="secondary">{p.position}</Badge>
                <span className="font-medium">{p.play_type ?? "—"}</span>
                {p.shift && p.shift !== "no_shift" && (
                  <Badge variant="outline">shift: {p.shift}</Badge>
                )}
                {p.error_flag && <Badge variant="destructive">Error</Badge>}
                {p.result && <span className="text-muted-foreground">{p.result}</span>}
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600"
                onClick={() => del.mutate(p.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            {p.notes && <p className="text-xs text-muted-foreground mt-1.5">{p.notes}</p>}
          </Card>
        ))}
      </div>
    </div>
  );
}

function DefForm({ onSave, onCancel }: {
  onSave: (r: Record<string, any>) => void; onCancel: () => void;
}) {
  const [f, setF] = useState<Record<string, any>>({
    inning: 1, position: "SS", throwing_side: "R", play_type: "",
    shift: "no_shift", result: "", error_flag: false,
    time_to_first_sec: "", pop_time_sec: "", arm_velo: "", notes: "",
  });
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  return (
    <Card className="p-4 space-y-3 bg-muted/30">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <F label="Inning"><Input type="number" value={f.inning}
          onChange={(e) => set("inning", Number(e.target.value))} /></F>
        <F label="Position">
          <Select value={f.position} onValueChange={(v) => set("position", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{POSITIONS.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent>
          </Select>
        </F>
        <F label="Throwing side">
          <Select value={f.throwing_side} onValueChange={(v) => set("throwing_side", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="L">L</SelectItem><SelectItem value="R">R</SelectItem>
            </SelectContent>
          </Select>
        </F>
        <F label="Play type">
          <Select value={f.play_type} onValueChange={(v) => set("play_type", v)}>
            <SelectTrigger><SelectValue placeholder="Pick" /></SelectTrigger>
            <SelectContent>{PLAY_TYPES.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent>
          </Select>
        </F>
        <F label="Shift">
          <Select value={f.shift} onValueChange={(v) => set("shift", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{SHIFTS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
          </Select>
        </F>
        <F label="Result">
          <Input placeholder="out / hit / E6 / 6-4-3…" value={f.result}
            onChange={(e) => set("result", e.target.value)} />
        </F>
        <F label="Time to 1B (sec)">
          <Input type="number" step="0.01" value={f.time_to_first_sec}
            onChange={(e) => set("time_to_first_sec", e.target.value)} />
        </F>
        <F label="Pop time (sec)">
          <Input type="number" step="0.01" value={f.pop_time_sec}
            onChange={(e) => set("pop_time_sec", e.target.value)} />
        </F>
        <F label="Arm velo">
          <Input type="number" value={f.arm_velo}
            onChange={(e) => set("arm_velo", e.target.value)} />
        </F>
      </div>
      <div className="flex items-center gap-2">
        <input id="err" type="checkbox" checked={f.error_flag}
          onChange={(e) => set("error_flag", e.target.checked)} />
        <Label htmlFor="err" className="text-xs">Error</Label>
      </div>
      <F label="Notes"><Textarea rows={2} value={f.notes}
        onChange={(e) => set("notes", e.target.value)} /></F>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={() => {
          const payload: Record<string, any> = { ...f };
          ["time_to_first_sec", "pop_time_sec", "arm_velo"].forEach((k) => {
            payload[k] = payload[k] === "" ? null : Number(payload[k]);
          });
          if (!payload.play_type) payload.play_type = null;
          if (!payload.result) payload.result = null;
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
