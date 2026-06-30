/**
 * SubLogger — pinch hit / pinch run / defensive replacement / relief /
 * position swap / DH events.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { showUndoToast } from "@/lib/games/undoToast";
import { RepCard, RepKeyboardHints } from "./RepCard";


const TYPES = ["pinch_hit","pinch_run","def_replace","relief","position_swap","dh"];
const POSITIONS = ["P","C","1B","2B","3B","SS","LF","CF","RF","DH"];
const LEVERAGE = ["low","medium","high","critical"];

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

  const invalidate = () => qc.invalidateQueries({ queryKey: ["gp-sub", gameId] });

  const add = useMutation({
    mutationFn: async (row: Record<string, any>) => {
      const { data, error } = await (supabase as any)
        .from("gp_subs").insert({ ...row, user_id: user!.id, game_id: gameId })
        .select("id").single();
      if (error) throw error;
      return data?.id as string | undefined;
    },
    onSuccess: (id) => {
      invalidate();
      setShow(false);
      showUndoToast({
        label: "Sub logged",
        undo: async () => {
          if (id) {
            await (supabase as any).from("gp_subs").delete().eq("id", id);
            invalidate();
          }
        },
      });
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const prev = (list.data ?? []).find((s: any) => s.id === id) ?? null;
      const { error } = await (supabase as any).from("gp_subs").delete().eq("id", id);
      if (error) throw error;
      return prev;
    },
    onSuccess: (prev) => {
      invalidate();
      showUndoToast({
        label: "Sub removed",
        undo: async () => {
          if (!prev) return;
          const { id: _i, created_at: _c, ...restore } = prev as any;
          await (supabase as any).from("gp_subs").insert(restore);
          invalidate();
        },
      });
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs text-muted-foreground">
          {(list.data ?? []).length} sub{(list.data ?? []).length === 1 ? "" : "s"}
        </p>
        <Button size="sm" onClick={() => setShow(true)} className="gap-1">
          <Plus className="h-3.5 w-3.5" /> New sub
        </Button>
      </div>
      <RepKeyboardHints
        hints={[
          { key: "O", label: "offensive" },
          { key: "D", label: "defensive" },
          { key: "P", label: "pitching" },
          { key: "R", label: "reason" },
        ]}
      />

      {show && <SubForm onCancel={() => setShow(false)} onSave={(r) => add.mutate(r)} />}

      {(list.data ?? []).length === 0 && !show && (
        <Card className="p-5 text-center bg-muted/20 border-dashed">
          <Users className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">No subs recorded</p>
          <p className="text-xs text-muted-foreground mt-1">
            Log pinch hits, defensive replacements, relief, and position swaps so usage data stays aligned with at-bats and defensive plays.
          </p>
        </Card>
      )}

      <div className="space-y-2">
        {(list.data ?? []).map((s, idx) => (
          <RepCard
            key={s.id}
            accent="sub"
            repNumber={idx + 1}
            title={s.sub_type}
            badges={[{ label: `Inn ${s.inning ?? "?"}` }]}
            meta={
              <>
                {s.out_position && <span>out: {s.out_position}</span>}
                {s.in_position && <span>in: {s.in_position}</span>}
              </>
            }
            notes={s.notes}
            onDelete={() => del.mutate(s.id)}
          />
        ))}
      </div>
    </div>
  );
}


function SubForm({ onSave, onCancel }: {
  onSave: (r: Record<string, any>) => void; onCancel: () => void;
}) {
  const [f, setF] = useState<Record<string, any>>({
    inning: 1, sub_type: "def_replace",
    in_position: "", out_position: "",
    in_player: "", out_player: "",
    reason: "", leverage: "",
    notes: "",
  });
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  return (
    <Card className="p-4 space-y-3 bg-muted/30 border-l-4 border-l-slate-500">
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
        <F label="Player out">
          <Input value={f.out_player} placeholder="name"
            onChange={(e) => set("out_player", e.target.value)} />
        </F>
        <F label="Player in">
          <Input value={f.in_player} placeholder="name"
            onChange={(e) => set("in_player", e.target.value)} />
        </F>
        <F label="Reason">
          <Input value={f.reason} placeholder="matchup / fatigue / injury"
            onChange={(e) => set("reason", e.target.value)} />
        </F>
        <F label="Leverage">
          <Select value={f.leverage} onValueChange={(v) => set("leverage", v)}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{LEVERAGE.map((l) => (<SelectItem key={l} value={l}>{l}</SelectItem>))}</SelectContent>
          </Select>
        </F>
      </div>
      <F label="Notes"><Input value={f.notes}
        onChange={(e) => set("notes", e.target.value)} /></F>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={() => {
          const extras: string[] = [];
          if (f.out_player) extras.push(`out:${f.out_player}`);
          if (f.in_player) extras.push(`in:${f.in_player}`);
          if (f.reason) extras.push(`why:${f.reason}`);
          if (f.leverage) extras.push(`lev:${f.leverage}`);
          const mergedNotes = extras.length
            ? [f.notes, `[${extras.join(" · ")}]`].filter(Boolean).join(" ")
            : f.notes;
          const payload: Record<string, any> = {
            inning: f.inning,
            sub_type: f.sub_type,
            in_position: f.in_position || null,
            out_position: f.out_position || null,
            notes: mergedNotes || null,
          };
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
