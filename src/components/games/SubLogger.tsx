/**
 * SubLogger — pinch hit / pinch run / defensive replacement / relief /
 * position swap / DH events.
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
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const TYPES = ["pinch_hit","pinch_run","def_replace","relief","position_swap","dh"];
const POSITIONS = ["P","C","1B","2B","3B","SS","LF","CF","RF","DH"];

export function SubLogger({ gameId }: { gameId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [show, setShow] = useState(false);

  const list = useQuery({
    queryKey: ["gp-sub", gameId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("gp_subs").select("*").eq("game_id", gameId)
        .order("inning", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const add = useMutation({
    mutationFn: async (row: Record<string, any>) => {
      const { error } = await (supabase as any)
        .from("gp_subs").insert({ ...row, user_id: user!.id, game_id: gameId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gp-sub", gameId] });
      setShow(false);
      toast.success("Sub logged");
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("gp_subs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gp-sub", gameId] }),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {(list.data ?? []).length} sub{(list.data ?? []).length === 1 ? "" : "s"}
        </p>
        <Button size="sm" onClick={() => setShow(true)} className="gap-1">
          <Plus className="h-3.5 w-3.5" /> New sub
        </Button>
      </div>

      {show && <SubForm onCancel={() => setShow(false)} onSave={(r) => add.mutate(r)} />}

      <div className="space-y-2">
        {(list.data ?? []).map((s) => (
          <Card key={s.id} className="p-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap text-sm">
              <Badge variant="outline">Inn {s.inning ?? "?"}</Badge>
              <Badge variant="secondary">{s.sub_type}</Badge>
              {s.out_position && <span className="text-muted-foreground">out: {s.out_position}</span>}
              {s.in_position && <span className="text-muted-foreground">in: {s.in_position}</span>}
              {s.notes && <span className="text-muted-foreground">— {s.notes}</span>}
            </div>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600"
              onClick={() => del.mutate(s.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SubForm({ onSave, onCancel }: {
  onSave: (r: Record<string, any>) => void; onCancel: () => void;
}) {
  const [f, setF] = useState<Record<string, any>>({
    inning: 1, sub_type: "def_replace", in_position: "", out_position: "", notes: "",
  });
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  return (
    <Card className="p-4 space-y-3 bg-muted/30">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <F label="Inning"><Input type="number" value={f.inning}
          onChange={(e) => set("inning", Number(e.target.value))} /></F>
        <F label="Type">
          <Select value={f.sub_type} onValueChange={(v) => set("sub_type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TYPES.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}</SelectContent>
          </Select>
        </F>
        <F label="Out position">
          <Select value={f.out_position} onValueChange={(v) => set("out_position", v)}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{POSITIONS.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent>
          </Select>
        </F>
        <F label="In position">
          <Select value={f.in_position} onValueChange={(v) => set("in_position", v)}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{POSITIONS.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent>
          </Select>
        </F>
      </div>
      <F label="Notes"><Input value={f.notes}
        onChange={(e) => set("notes", e.target.value)} /></F>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={() => {
          const payload: Record<string, any> = { ...f };
          if (!payload.in_position) payload.in_position = null;
          if (!payload.out_position) payload.out_position = null;
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
