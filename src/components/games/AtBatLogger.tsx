/**
 * AtBatLogger — V1 hitter at-bat logger.
 * Captures every elite input: result, count, contact, exit direction,
 * pitch location/type/velo, inning, RBI/LOB, position, batting side,
 * home-to-first time, pinch-hit flag, free-text notes.
 * Persisted in gp_at_bats. Switch-hitter aware via batting_side.
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const RESULTS = [
  "1B", "2B", "3B", "HR", "BB", "HBP", "K_swinging", "K_looking",
  "FO", "GO", "LO", "PO", "FC", "SAC", "SF", "E", "ROE",
];
const CONTACT = ["barrel", "solid", "flare", "topped", "weak", "popup", "whiff", "foul"];
const PITCH_TYPES = ["FB", "2-seam", "CT", "SL", "CB", "CH", "SP", "KN", "rise", "drop", "screw"];
const DIRECTIONS = ["LF", "LCF", "CF", "RCF", "RF", "3B", "SS", "2B", "1B", "P", "C"];
const POSITIONS = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH", "PH"];

export function AtBatLogger({ gameId, sport }: { gameId: string; sport: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);

  const list = useQuery({
    queryKey: ["gp-ab", gameId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("gp_at_bats")
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
        .from("gp_at_bats")
        .insert({ ...row, user_id: user!.id, game_id: gameId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gp-ab", gameId] });
      setShowNew(false);
      toast.success("At-bat saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, any> }) => {
      const { error } = await (supabase as any)
        .from("gp_at_bats")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gp-ab", gameId] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("gp_at_bats")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gp-ab", gameId] }),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {(list.data ?? []).length} at-bat{(list.data ?? []).length === 1 ? "" : "s"} logged
        </p>
        <Button size="sm" onClick={() => setShowNew(true)} className="gap-1">
          <Plus className="h-3.5 w-3.5" />
          New at-bat
        </Button>
      </div>

      {showNew && (
        <AtBatForm
          sport={sport}
          onCancel={() => setShowNew(false)}
          onSave={(row) => add.mutate(row)}
        />
      )}

      <div className="space-y-2">
        {(list.data ?? []).map((ab) => (
          <Card key={ab.id} className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap text-sm">
                <Badge variant="outline">Inn {ab.inning ?? "?"}</Badge>
                {ab.batting_side && <Badge variant="secondary">{ab.batting_side}HB</Badge>}
                {ab.position_played && <Badge variant="outline">{ab.position_played}</Badge>}
                <span className="font-medium">{ab.result ?? "—"}</span>
                {ab.pitch_type && (
                  <span className="text-muted-foreground">on {ab.pitch_type}</span>
                )}
                {ab.is_pinch_hit && <Badge>PH</Badge>}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-rose-600"
                onClick={() => del.mutate(ab.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            {ab.notes && (
              <p className="text-xs text-muted-foreground mt-1.5">{ab.notes}</p>
            )}
          </Card>
        ))}
        {!list.isLoading && (list.data ?? []).length === 0 && !showNew && (
          <p className="text-xs text-muted-foreground text-center py-4">
            No at-bats yet. Tap "New at-bat" above.
          </p>
        )}
      </div>
    </div>
  );
}

function AtBatForm({
  sport,
  onSave,
  onCancel,
}: {
  sport: string;
  onSave: (row: Record<string, any>) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState<Record<string, any>>({
    inning: 1,
    batting_side: "R",
    position_played: "",
    result: "",
    count_balls: 0,
    count_strikes: 0,
    contact_quality: "",
    exit_direction: "",
    pitch_type: "",
    pitch_velo: "",
    runners_on: "",
    outs: 0,
    rbi: 0,
    lob: 0,
    h1_time_sec: "",
    is_pinch_hit: false,
    notes: "",
  });
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  return (
    <Card className="p-4 space-y-3 bg-muted/30">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Field label="Inning">
          <Input
            type="number"
            value={f.inning}
            onChange={(e) => set("inning", Number(e.target.value))}
          />
        </Field>
        <Field label="Side">
          <Select value={f.batting_side} onValueChange={(v) => set("batting_side", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="L">L</SelectItem>
              <SelectItem value="R">R</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Position">
          <Select value={f.position_played} onValueChange={(v) => set("position_played", v)}>
            <SelectTrigger><SelectValue placeholder="Pick" /></SelectTrigger>
            <SelectContent>
              {POSITIONS.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Result">
          <Select value={f.result} onValueChange={(v) => set("result", v)}>
            <SelectTrigger><SelectValue placeholder="Pick" /></SelectTrigger>
            <SelectContent>
              {RESULTS.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Balls">
          <Input type="number" min={0} max={4} value={f.count_balls}
            onChange={(e) => set("count_balls", Number(e.target.value))} />
        </Field>
        <Field label="Strikes">
          <Input type="number" min={0} max={3} value={f.count_strikes}
            onChange={(e) => set("count_strikes", Number(e.target.value))} />
        </Field>
        <Field label="Contact">
          <Select value={f.contact_quality} onValueChange={(v) => set("contact_quality", v)}>
            <SelectTrigger><SelectValue placeholder="Pick" /></SelectTrigger>
            <SelectContent>
              {CONTACT.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Direction">
          <Select value={f.exit_direction} onValueChange={(v) => set("exit_direction", v)}>
            <SelectTrigger><SelectValue placeholder="Pick" /></SelectTrigger>
            <SelectContent>
              {DIRECTIONS.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Pitch type">
          <Select value={f.pitch_type} onValueChange={(v) => set("pitch_type", v)}>
            <SelectTrigger><SelectValue placeholder="Pick" /></SelectTrigger>
            <SelectContent>
              {PITCH_TYPES.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Pitch velo">
          <Input type="number" value={f.pitch_velo}
            onChange={(e) => set("pitch_velo", e.target.value)} />
        </Field>
        <Field label="Outs">
          <Input type="number" min={0} max={2} value={f.outs}
            onChange={(e) => set("outs", Number(e.target.value))} />
        </Field>
        <Field label="Runners on">
          <Input placeholder="e.g. 1,3" value={f.runners_on}
            onChange={(e) => set("runners_on", e.target.value)} />
        </Field>
        <Field label="RBI">
          <Input type="number" min={0} value={f.rbi}
            onChange={(e) => set("rbi", Number(e.target.value))} />
        </Field>
        <Field label="LOB">
          <Input type="number" min={0} value={f.lob}
            onChange={(e) => set("lob", Number(e.target.value))} />
        </Field>
        <Field label="H1 time (sec)">
          <Input type="number" step="0.01" value={f.h1_time_sec}
            onChange={(e) => set("h1_time_sec", e.target.value)} />
        </Field>
      </div>
      <div className="flex items-center gap-2">
        <input
          id="ph"
          type="checkbox"
          checked={f.is_pinch_hit}
          onChange={(e) => set("is_pinch_hit", e.target.checked)}
        />
        <Label htmlFor="ph" className="text-xs">Pinch hit</Label>
      </div>
      <Field label="Notes (free text — describe it however you want)">
        <Textarea
          rows={2}
          value={f.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button
          size="sm"
          onClick={() => {
            const payload: Record<string, any> = { ...f };
            // Coerce numerics that should not be sent as ""
            ["pitch_velo", "h1_time_sec"].forEach((k) => {
              payload[k] = payload[k] === "" ? null : Number(payload[k]);
            });
            if (!payload.result) payload.result = null;
            if (!payload.position_played) payload.position_played = null;
            if (!payload.pitch_type) payload.pitch_type = null;
            if (!payload.contact_quality) payload.contact_quality = null;
            if (!payload.exit_direction) payload.exit_direction = null;
            onSave(payload);
          }}
        >
          Save at-bat
        </Button>
      </div>
    </Card>
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
