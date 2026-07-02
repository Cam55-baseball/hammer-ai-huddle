/**
 * AtBatLogger — V2 with inline pitch coupling + keyboard shortcuts + undo.
 *
 * - Each AB row expands to reveal an inline `AtBatPitchPanel` for
 *   pitch-by-pitch entry. Walks / strikeouts / HBP auto-populate the AB
 *   result via the panel's `onTerminal` callback.
 * - New-AB form supports single-key shortcuts: 1/2/3/4 → 1B/2B/3B/HR,
 *   K → K_swinging, B → BB, H → HBP, Enter → save.
 * - All inserts and deletes show a 10-second `sonner` undo toast.
 * - Empty state guides first-time users.
 *
 * Switch-hitter aware via `batting_side`. Position-open. Replay-safe writes
 * route through `gp("gp_at_bats")`.
 */
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { gp } from "@/lib/games/ledger";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { AtBatPitchPanel } from "./AtBatPitchPanel";
import type { AtBatPitchTally } from "@/hooks/useAtBatPitches";
import { RepCard, RepKeyboardHints } from "./RepCard";
import { AbSwingPanel } from "./AbSwingPanel";
import { usePitcherDossiers } from "@/hooks/useGameDossiers";
import { NumberField } from "@/components/games/NumberField";

const RESULTS = [
  "1B", "2B", "3B", "HR", "BB", "HBP", "K_swinging", "K_looking",
  "FO", "GO", "LO", "PO", "FC", "SAC", "SF", "E", "ROE",
];
const CONTACT = ["barrel", "solid", "flare", "topped", "weak", "popup", "whiff", "foul"];
const PITCH_TYPES = ["FB", "2-seam", "CT", "SL", "CB", "CH", "SP", "KN", "rise", "drop", "screw"];
const DIRECTIONS = ["LF", "LCF", "CF", "RCF", "RF", "3B", "SS", "2B", "1B", "P", "C"];
const POSITIONS = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH", "PH"];

/** Single-key shortcut → AB result code. */
const SHORTCUTS: Record<string, string> = {
  "1": "1B",
  "2": "2B",
  "3": "3B",
  "4": "HR",
  k: "K_swinging",
  b: "BB",
  h: "HBP",
  f: "FO",
  g: "GO",
};

export function AtBatLogger({ gameId, sport }: { gameId: string; sport: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const pitchers = usePitcherDossiers(sport);
  const pitcherOptions = pitchers.list.data ?? [];

  // Default pitcher from the game's probable pitcher (if set).
  const probable = useQuery({
    queryKey: ["gp-game-probable-pitcher", gameId],
    queryFn: async () => {
      const { data } = await gp("gp_games").select("probable_pitcher_dossier_id").eq("id", gameId).maybeSingle();
      return (data as any)?.probable_pitcher_dossier_id as string | null;
    },
  });


  const list = useQuery({
    queryKey: ["gp-ab", gameId],
    queryFn: async () => {
      const { data, error } = await gp("gp_at_bats")
        .select("*")
        .eq("game_id", gameId)
        .order("inning", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["gp-ab", gameId] });

  const add = useMutation({
    mutationFn: async (row: Record<string, any>) => {
      // Snapshot pitcher archetype so historical lookups stay stable even if dossier later changes.
      let pitcher_archetype_snapshot: string | null = null;
      if (row.opponent_pitcher_id) {
        const match = pitcherOptions.find((p: any) => p.id === row.opponent_pitcher_id);
        pitcher_archetype_snapshot = (match as any)?.archetype ?? null;
      }
      const { data, error } = await gp("gp_at_bats")
        .insert({ ...row, pitcher_archetype_snapshot, user_id: user!.id, game_id: gameId })
        .select("id")
        .single();
      if (error) throw error;
      return data?.id as string | undefined;
    },
    onSuccess: (id) => {
      invalidate();
      setShowNew(false);
      if (id) {
        setExpanded((prev) => new Set(prev).add(id));
      }
      toast.success("At-bat saved", {
        action: id
          ? {
              label: "Undo",
              onClick: async () => {
                await gp("gp_at_bats").delete().eq("id", id);
                invalidate();
              },
            }
          : undefined,
        duration: 10_000,
      });
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, any> }) => {
      const { error } = await gp("gp_at_bats").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const prev = (list.data ?? []).find((r) => r.id === id) ?? null;
      const { error } = await gp("gp_at_bats").delete().eq("id", id);
      if (error) throw error;
      return prev;
    },
    onSuccess: (prev) => {
      invalidate();
      toast.success("At-bat deleted", {
        action: prev
          ? {
              label: "Undo",
              onClick: async () => {
                const { id: _id, created_at: _ca, ...restore } = prev as any;
                await gp("gp_at_bats").insert(restore);
                invalidate();
              },
            }
          : undefined,
        duration: 10_000,
      });
    },
  });

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleTerminal = (abId: string, tally: AtBatPitchTally) => {
    if (!tally.suggestedResult) return;
    const row = (list.data ?? []).find((r) => r.id === abId);
    if (!row) return;
    if (row.result) return; // never overwrite an existing AB result
    update.mutate({
      id: abId,
      patch: {
        result: tally.suggestedResult,
        count_balls: tally.balls,
        count_strikes: tally.strikes,
      },
    });
    toast.message(`AB auto-closed: ${tally.suggestedResult}`, {
      description: "Tap to edit the result if needed.",
      duration: 6_000,
    });
  };

  const items = list.data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            {items.length} at-bat{items.length === 1 ? "" : "s"} logged
          </p>
          <RepKeyboardHints
            hints={[
              { key: "N", label: "new AB" },
              { key: "1·2·3·4", label: "1B/2B/3B/HR" },
              { key: "K·B·H", label: "K/BB/HBP" },
              { key: "Enter", label: "save" },
            ]}
          />
        </div>
        <Button size="sm" onClick={() => setShowNew(true)} className="gap-1">
          <Plus className="h-3.5 w-3.5" />
          New at-bat
        </Button>
      </div>

      {showNew && (
        <AtBatForm
          onCancel={() => setShowNew(false)}
          onSave={(row) => add.mutate(row)}
          submitting={add.isPending}
          pitcherOptions={pitcherOptions as any[]}
          defaultPitcherId={probable.data ?? null}
        />
      )}

      <div className="space-y-2">
        {items.map((ab, idx) => {
          const isOpen = expanded.has(ab.id);
          return (
            <RepCard
              key={ab.id}
              accent="hitting"
              repNumber={idx + 1}
              title={
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-left"
                  onClick={() => toggle(ab.id)}
                  aria-expanded={isOpen}
                >
                  {isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span>{ab.result ?? "in progress"}</span>
                </button>
              }
              badges={[
                { label: `Inn ${ab.inning ?? "?"}` },
                ...(ab.batting_side ? [{ label: `${ab.batting_side}HB`, variant: "secondary" as const }] : []),
                ...(ab.position_played ? [{ label: ab.position_played }] : []),
                ...(ab.pitch_type ? [{ label: `vs ${ab.pitch_type}` }] : []),
                ...(ab.is_pinch_hit ? [{ label: "PH", variant: "secondary" as const }] : []),
                ...(ab.count_balls != null && ab.count_strikes != null
                  ? [{ label: `${ab.count_balls}-${ab.count_strikes}`, variant: "outline" as const }]
                  : []),
              ]}
              meta={
                <>
                  {ab.contact_quality && <span>Contact: {ab.contact_quality}</span>}
                  {ab.exit_direction && <span>Dir: {ab.exit_direction}</span>}
                  {ab.pitch_velo != null && <span>Velo: {ab.pitch_velo}</span>}
                  {ab.rbi ? <span>RBI: {ab.rbi}</span> : null}
                </>
              }
              notes={ab.notes}
              onDelete={() => del.mutate(ab.id)}
            >
              {isOpen && (
                <>
                  <AtBatPitchPanel
                    gameId={gameId}
                    atBatId={ab.id}
                    inning={ab.inning ?? null}
                    onTerminal={(t) => handleTerminal(ab.id, t)}
                  />
                  <AbSwingPanel
                    abId={ab.id}
                    gameId={gameId}
                    dossierId={ab.opponent_pitcher_id ?? probable.data ?? null}
                  />
                </>
              )}
            </RepCard>
          );
        })}
        {!list.isLoading && items.length === 0 && !showNew && (
          <Card className="p-5 text-center bg-muted/20 border-dashed">
            <p className="text-sm font-medium">No at-bats yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Tap <span className="font-medium">New at-bat</span> above. Each AB is a rep;
              every pitch inside it is a child rep. Single-key shortcuts (1·2·3·4·K·B·H)
              log fast — walks and strikeouts auto-close the AB.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

function AtBatForm({
  onSave,
  onCancel,
  submitting,
  pitcherOptions = [],
  defaultPitcherId = null,
}: {
  onSave: (row: Record<string, any>) => void;
  onCancel: () => void;
  submitting?: boolean;
  pitcherOptions?: any[];
  defaultPitcherId?: string | null;
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
    opponent_pitcher_id: defaultPitcherId ?? "",
  });
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcuts — active when the form is open and the focus is not
  // inside an editable field (so we never steal typing in the notes box).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isField =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      if (isField) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === "Enter") {
        e.preventDefault();
        submit();
        return;
      }
      if (key === "Escape") {
        e.preventDefault();
        onCancel();
        return;
      }
      const result = SHORTCUTS[key];
      if (result) {
        e.preventDefault();
        setF((p) => ({ ...p, result }));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = () => {
    const payload: Record<string, any> = { ...f };
    ["pitch_velo", "h1_time_sec"].forEach((k) => {
      payload[k] = payload[k] === "" ? null : Number(payload[k]);
    });
    if (!payload.result) payload.result = null;
    if (!payload.position_played) payload.position_played = null;
    if (!payload.pitch_type) payload.pitch_type = null;
    if (!payload.contact_quality) payload.contact_quality = null;
    if (!payload.exit_direction) payload.exit_direction = null;
    if (!payload.opponent_pitcher_id) payload.opponent_pitcher_id = null;
    onSave(payload);
  };

  return (
    <Card ref={containerRef} className="p-4 space-y-3 bg-muted/30">
      <p className="text-[11px] text-muted-foreground">
        Shortcuts: <span className="font-mono">1·2·3·4</span> = 1B/2B/3B/HR ·{" "}
        <span className="font-mono">K</span> = strikeout · <span className="font-mono">B</span> = walk ·{" "}
        <span className="font-mono">H</span> = HBP · <span className="font-mono">Enter</span> to save ·{" "}
        <span className="font-mono">Esc</span> to cancel
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Field label="Pitcher faced">
          <Select value={f.opponent_pitcher_id || "__none"} onValueChange={(v) => set("opponent_pitcher_id", v === "__none" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Pick / none" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">— None / unknown —</SelectItem>
              {pitcherOptions.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name ?? "Pitcher"} {p.archetype ? `· ${p.archetype}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Inning">
          <NumberField
            value={f.inning}
            onValueChange={(v) => set("inning", v ?? 0)}
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
          <NumberField min={0} max={4} value={f.count_balls}
            onValueChange={(v) => set("count_balls", v ?? 0)} />
        </Field>
        <Field label="Strikes">
          <NumberField min={0} max={3} value={f.count_strikes}
            onValueChange={(v) => set("count_strikes", v ?? 0)} />
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
          <NumberField value={f.pitch_velo}
            onChange={(e) => set("pitch_velo", e.target.value)} />
        </Field>
        <Field label="Outs">
          <NumberField min={0} max={2} value={f.outs}
            onValueChange={(v) => set("outs", v ?? 0)} />
        </Field>
        <Field label="Runners on">
          <Input placeholder="e.g. 1,3" value={f.runners_on}
            onChange={(e) => set("runners_on", e.target.value)} />
        </Field>
        <Field label="RBI">
          <NumberField min={0} value={f.rbi}
            onValueChange={(v) => set("rbi", v ?? 0)} />
        </Field>
        <Field label="LOB">
          <NumberField min={0} value={f.lob}
            onValueChange={(v) => set("lob", v ?? 0)} />
        </Field>
        <Field label="H1 time (sec)">
          <NumberField step="0.01" value={f.h1_time_sec}
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
        <Button size="sm" onClick={submit} disabled={submitting}>
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
