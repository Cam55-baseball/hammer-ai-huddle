/**
 * DefenseLogger — defensive play entry. Position, shift (L/R/extreme/in/back),
 * play type, error flag, time-to-first, pop time, arm velo, notes.
 */
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Shield } from "lucide-react";
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

  const invalidate = () => qc.invalidateQueries({ queryKey: ["gp-def", gameId] });

  const add = useMutation({
    mutationFn: async (row: Record<string, any>) => {
      const { data, error } = await (supabase as any)
        .from("gp_defense_plays")
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
        label: "Defensive play saved",
        undo: async () => {
          if (id) {
            await (supabase as any).from("gp_defense_plays").delete().eq("id", id);
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
        .from("gp_defense_plays").delete().eq("id", id);
      if (error) throw error;
      return prev;
    },
    onSuccess: (prev) => {
      invalidate();
      showUndoToast({
        label: "Defensive play deleted",
        undo: async () => {
          if (!prev) return;
          const { id: _i, created_at: _c, ...restore } = prev as any;
          await (supabase as any).from("gp_defense_plays").insert(restore);
          invalidate();
        },
      });
    },
  });

  // Single-key shortcuts (only when no input/textarea/select is focused).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (t && t.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "n") { setShow(true); e.preventDefault(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            {(list.data ?? []).length} play{(list.data ?? []).length === 1 ? "" : "s"}
          </p>
          <RepKeyboardHints hints={[{ key: "N", label: "new play" }]} />
        </div>
        <Button size="sm" onClick={() => setShow(true)} className="gap-1">
          <Plus className="h-3.5 w-3.5" /> New play
        </Button>
      </div>

      {show && <DefForm onCancel={() => setShow(false)} onSave={(r) => add.mutate(r)} />}

      {(list.data ?? []).length === 0 && !show && (
        <Card className="p-5 text-center bg-muted/20 border-dashed">
          <Shield className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">No defensive plays logged yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Each fielding chance is a rep. Press <kbd className="px-1 rounded bg-muted">N</kbd> to add.
          </p>
        </Card>
      )}

      <div className="space-y-2">
        {(list.data ?? []).map((p, idx) => (
          <RepCard
            key={p.id}
            accent="defense"
            repNumber={idx + 1}
            title={p.play_type ?? "—"}
            badges={[
              { label: `Inn ${p.inning ?? "?"}` },
              { label: p.position, variant: "secondary" },
              ...(p.shift && p.shift !== "no_shift" ? [{ label: `shift: ${p.shift}` }] : []),
              ...(p.error_flag ? [{ label: "Error", variant: "destructive" as const }] : []),
            ]}
            meta={
              <>
                {p.result && <span>Result: {p.result}</span>}
                {p.time_to_first_sec != null && <span>To 1B: {p.time_to_first_sec}s</span>}
                {p.pop_time_sec != null && <span>Pop: {p.pop_time_sec}s</span>}
                {p.arm_velo != null && <span>Arm: {p.arm_velo}</span>}
              </>
            }
            notes={p.notes}
            onDelete={() => del.mutate(p.id)}
          />
        ))}
      </div>
    </div>
  );
}


/** Position groupings drive which fields appear — keeps the rep sheet
 *  scoped to what's relevant for the role (C / IF / OF). All founder-protected
 *  metrics remain available; they're just gated to the position that uses them.
 */
const INFIELD = new Set(["P", "1B", "2B", "3B", "SS"]);
const OUTFIELD = new Set(["LF", "CF", "RF"]);
const DIRECTIONS = ["LF", "LCF", "CF", "RCF", "RF", "3B", "SS", "2B", "1B", "P", "C"];
const THROW_BASES = ["1B", "2B", "3B", "H", "cutoff", "no_throw"];
const ROUTE_QUALITY = ["direct", "rounded", "drifted", "broke_late", "dove"];
const IF_REP_TYPES = ["routine", "clean_pick", "backhand", "in_charge", "slow_roller", "double_play", "turn_only", "feed_only"];

function DefForm({ onSave, onCancel }: {
  onSave: (r: Record<string, any>) => void; onCancel: () => void;
}) {
  const [f, setF] = useState<Record<string, any>>({
    inning: 1, position: "SS", throwing_side: "R", play_type: "",
    shift: "no_shift", result: "", error_flag: false, assist: false, putout: false,
    time_to_first_sec: "", pop_time_sec: "", arm_velo: "",
    spray_direction: "", batted_ball_type: "",
    // UI-only extras folded into notes on save (column doesn't exist yet):
    throw_base: "", route_quality: "", infield_rep_type: "", blocked: false,
    notes: "",
  });
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  const isCatcher = f.position === "C";
  const isInfield = INFIELD.has(f.position);
  const isOutfield = OUTFIELD.has(f.position);

  return (
    <Card className="p-4 space-y-3 bg-muted/30 border-l-4 border-l-emerald-500">
      <p className="text-[11px] text-muted-foreground">
        Fields adjust to the position so you only see what matters for{" "}
        <span className="font-medium">{f.position}</span>.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Always shown */}
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

        {/* Play direction — every fielding chance */}
        <F label="Play direction">
          <Select value={f.spray_direction} onValueChange={(v) => set("spray_direction", v)}>
            <SelectTrigger><SelectValue placeholder="Pick" /></SelectTrigger>
            <SelectContent>{DIRECTIONS.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}</SelectContent>
          </Select>
        </F>

        {/* Catcher-only */}
        {isCatcher && (
          <>
            <F label="Pop time (sec)">
              <Input type="number" step="0.01" value={f.pop_time_sec}
                onChange={(e) => set("pop_time_sec", e.target.value)} />
            </F>
            <F label="Throw base">
              <Select value={f.throw_base} onValueChange={(v) => set("throw_base", v)}>
                <SelectTrigger><SelectValue placeholder="Pick" /></SelectTrigger>
                <SelectContent>{THROW_BASES.map((b) => (<SelectItem key={b} value={b}>{b}</SelectItem>))}</SelectContent>
              </Select>
            </F>
            <F label="Arm velo">
              <Input type="number" value={f.arm_velo}
                onChange={(e) => set("arm_velo", e.target.value)} />
            </F>
          </>
        )}

        {/* Infield-only */}
        {isInfield && (
          <>
            <F label="Infield rep type">
              <Select value={f.infield_rep_type} onValueChange={(v) => set("infield_rep_type", v)}>
                <SelectTrigger><SelectValue placeholder="Pick" /></SelectTrigger>
                <SelectContent>{IF_REP_TYPES.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}</SelectContent>
              </Select>
            </F>
            <F label="Time to 1B (sec)">
              <Input type="number" step="0.01" value={f.time_to_first_sec}
                onChange={(e) => set("time_to_first_sec", e.target.value)} />
            </F>
            <F label="Arm velo">
              <Input type="number" value={f.arm_velo}
                onChange={(e) => set("arm_velo", e.target.value)} />
            </F>
          </>
        )}

        {/* Outfield-only */}
        {isOutfield && (
          <>
            <F label="Route quality">
              <Select value={f.route_quality} onValueChange={(v) => set("route_quality", v)}>
                <SelectTrigger><SelectValue placeholder="Pick" /></SelectTrigger>
                <SelectContent>{ROUTE_QUALITY.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}</SelectContent>
              </Select>
            </F>
            <F label="Throw base">
              <Select value={f.throw_base} onValueChange={(v) => set("throw_base", v)}>
                <SelectTrigger><SelectValue placeholder="Pick" /></SelectTrigger>
                <SelectContent>{THROW_BASES.map((b) => (<SelectItem key={b} value={b}>{b}</SelectItem>))}</SelectContent>
              </Select>
            </F>
            <F label="Arm velo">
              <Input type="number" value={f.arm_velo}
                onChange={(e) => set("arm_velo", e.target.value)} />
            </F>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={f.error_flag}
            onChange={(e) => set("error_flag", e.target.checked)} /> Error
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={f.assist}
            onChange={(e) => set("assist", e.target.checked)} /> Assist
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={f.putout}
            onChange={(e) => set("putout", e.target.checked)} /> Putout
        </label>
        {isCatcher && (
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={f.blocked}
              onChange={(e) => set("blocked", e.target.checked)} /> Blocked in dirt
          </label>
        )}
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
          if (!payload.spray_direction) payload.spray_direction = null;
          // Fold UI-only extras into notes so we never lose them, since the
          // dedicated columns aren't part of the canonical schema yet.
          const extras: string[] = [];
          if (payload.throw_base) extras.push(`throw→${payload.throw_base}`);
          if (payload.route_quality) extras.push(`route:${payload.route_quality}`);
          if (payload.infield_rep_type) extras.push(`rep:${payload.infield_rep_type}`);
          if (payload.blocked) extras.push("blocked");
          if (extras.length) {
            payload.notes = [payload.notes, `[${extras.join(" · ")}]`].filter(Boolean).join(" ");
          }
          delete payload.throw_base;
          delete payload.route_quality;
          delete payload.infield_rep_type;
          delete payload.blocked;
          onSave(payload);
        }}>Save rep</Button>
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
