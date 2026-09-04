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
import { pitchTypes } from "@/lib/games/sportRules";
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
import { QuickAtBatBar } from "./QuickAtBatBar";
import { FieldDirectionPicker } from "./FieldDirectionPicker";
import { FieldHelp } from "./TabIntro";
import {
  AB_RESULTS,
  CONTACT_QUALITY,
  DIRECTIONS,
  describeAtBat,
  abResultPlain,
  abResultHelp,
  directionPlain,
  detailStatus,
} from "@/lib/games/glossary";


const RESULTS = AB_RESULTS;
const CONTACT = CONTACT_QUALITY;
const DIRECTION_CODES = DIRECTIONS;

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
    onSuccess: (id, row) => {
      invalidate();
      setShowNew(false);
      if (id) {
        setExpanded((prev) => new Set(prev).add(id));
      }
      toast.success(`Saved: ${describeAtBat(row as any)}`, {
        description: "You can add more detail to this at-bat any time — it's already recorded.",
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

  /**
   * The count always comes from the logged pitches — it is derived data, not
   * a user opinion, so it syncs whether or not a result is already set. The
   * result is the only thing we refuse to overwrite.
   */
  const syncCount = (abId: string, tally: AtBatPitchTally) => {
    const row = (list.data ?? []).find((r) => r.id === abId);
    if (!row) return;
    if (row.count_balls === tally.balls && row.count_strikes === tally.strikes) return;
    update.mutate({
      id: abId,
      patch: { count_balls: tally.balls, count_strikes: tally.strikes },
    });
  };

  const handleTerminal = (abId: string, tally: AtBatPitchTally) => {
    syncCount(abId, tally);
    if (!tally.suggestedResult) return;
    const row = (list.data ?? []).find((r) => r.id === abId);
    if (!row) return;
    if (row.result) return; // never overwrite an existing AB result
    update.mutate({ id: abId, patch: { result: tally.suggestedResult } });
    toast.message(
      `At-bat closed automatically: ${abResultPlain(tally.suggestedResult) ?? tally.suggestedResult}`,
      {
        description: abResultHelp(tally.suggestedResult) ?? "Tap the at-bat to change the result.",
        duration: 6_000,
      }
    );

  };

  const items = list.data ?? [];

  /** Highest inning already used in this game — the honest starting point. */
  const latestInning = items.reduce(
    (max, r) => (typeof r.inning === "number" && r.inning > max ? r.inning : max),
    1
  );

  /** How many at-bats in a row are already saved to a given inning. */
  const streakIn = (inning: number) => {
    let n = 0;
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i].inning === inning) n++;
      else break;
    }
    return n;
  };

  const saveAtBat = (row: Record<string, any>) => {
    const inning = Number(row.inning);
    if (Number.isFinite(inning) && streakIn(inning) >= 2) {
      const ok = window.confirm(
        `This would be at-bat ${streakIn(inning) + 1} in a row in inning ${inning}. ` +
          `That is unusual — most hitters bat once per inning.\n\n` +
          `OK to save it in inning ${inning} anyway, or Cancel to change the inning first.`
      );
      if (!ok) return;
    }
    add.mutate(row);
  };

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

      {/* Quick mode is the default path: inning + result, one tap. Detail is
          opt-in via "Add detail", never required to record the rep. */}
      {!showNew && (
        <QuickAtBatBar
          onQuickSave={saveAtBat}
          onOpenFullForm={() => setShowNew(true)}
          submitting={add.isPending}
          defaultInning={latestInning}
        />
      )}

      {showNew && (
        <AtBatForm
          sport={sport}
          onCancel={() => setShowNew(false)}
          onSave={saveAtBat}
          submitting={add.isPending}
          defaultInning={latestInning}

          pitcherOptions={pitcherOptions as any[]}
          defaultPitcherId={probable.data ?? null}
        />
      )}


      <div className="space-y-2">
        {items.map((ab, idx) => {
          const isOpen = expanded.has(ab.id);
          const status = detailStatus(ab);
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
                  <span>{describeAtBat(ab)}</span>
                </button>
              }
              badges={[
                { label: `Inning ${ab.inning ?? "not set"}` },
                ...(ab.result ? [{ label: ab.result, variant: "outline" as const }] : []),
                ...(ab.batting_side
                  ? [{ label: `Batted ${ab.batting_side === "L" ? "left" : "right"}-handed`, variant: "secondary" as const }]
                  : []),
                ...(ab.position_played ? [{ label: `Played ${ab.position_played}` }] : []),
                ...(ab.is_pinch_hit ? [{ label: "Pinch hit (PH)", variant: "secondary" as const }] : []),
                ...(ab.count_balls != null && ab.count_strikes != null
                  ? [{ label: `Count ${ab.count_balls}-${ab.count_strikes}`, variant: "outline" as const }]
                  : []),
              ]}
              meta={
                <>
                  {ab.contact_quality && <span>How you hit it: {ab.contact_quality}</span>}
                  {ab.exit_direction && <span>Ball went to: {directionPlain(ab.exit_direction)}</span>}
                  {ab.pitch_velo != null && <span>Pitch speed: {ab.pitch_velo} mph</span>}
                  {ab.rbi ? <span>Runs driven in: {ab.rbi}</span> : null}
                  <span>
                    Extra detail: {status.filled.length} of {status.total} filled in
                  </span>
                </>
              }
              notes={ab.notes}
              onDelete={() => del.mutate(ab.id)}
            >
              {isOpen && (
                <>
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="font-medium">Inning:</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-6 w-6"
                      aria-label="Move this at-bat one inning earlier"
                      disabled={(ab.inning ?? 1) <= 1}
                      onClick={() =>
                        update.mutate({ id: ab.id, patch: { inning: Math.max(1, (ab.inning ?? 1) - 1) } })
                      }
                    >
                      –
                    </Button>
                    <span className="font-mono font-semibold">{ab.inning ?? "not set"}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-6 w-6"
                      aria-label="Move this at-bat one inning later"
                      onClick={() =>
                        update.mutate({ id: ab.id, patch: { inning: Math.min(30, (ab.inning ?? 0) + 1) } })
                      }
                    >
                      +
                    </Button>
                    <span className="text-muted-foreground">
                      Wrong inning? Fix it here — nothing else changes.
                    </span>
                  </div>
                  {status.empty.length > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      Still empty (all optional): {status.empty.map((f) => f.label).join(", ")}.
                    </p>
                  )}
                  <AtBatPitchPanel
                    gameId={gameId}
                    atBatId={ab.id}
                    inning={ab.inning ?? null}
                    sport={sport}
                    onTerminal={(t) => handleTerminal(ab.id, t)}
                    onTally={(t) => syncCount(ab.id, t)}
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
  sport,
  onSave,
  onCancel,
  submitting,
  pitcherOptions = [],
  defaultPitcherId = null,
  defaultInning = 1,
}: {
  sport: string;
  onSave: (row: Record<string, any>) => void;
  onCancel: () => void;
  submitting?: boolean;
  pitcherOptions?: any[];
  defaultPitcherId?: string | null;
  defaultInning?: number;
}) {
  const [f, setF] = useState<Record<string, any>>({
    inning: defaultInning,
    batting_side: "R",
    position_played: "",
    result: "",
    count_balls: 0,
    count_strikes: 0,
    contact_quality: "",
    exit_direction: "",
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
      <div className="space-y-1">
        <p className="text-sm font-medium">Full at-bat form — every field is optional except the result</p>
        <FieldHelp>
          Fill in as much or as little as you want. Anything you skip stays empty rather than
          being guessed.
        </FieldHelp>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Shortcuts: <span className="font-mono">1·2·3·4</span> = single/double/triple/home run ·{" "}
        <span className="font-mono">K</span> = strikeout · <span className="font-mono">B</span> = walk ·{" "}
        <span className="font-mono">H</span> = hit by pitch · <span className="font-mono">Enter</span> to save ·{" "}
        <span className="font-mono">Esc</span> to cancel
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Field label="Pitcher you faced" help="Only if you've saved a scouting profile for them.">
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
        <Field label="Inning" help="Which inning you batted in.">
          <NumberField
            value={f.inning}
            onValueChange={(v) => set("inning", v ?? 0)}
          />
        </Field>
        <Field label="Which side of the plate you batted from" help="Left-handed or right-handed for this at-bat.">
          <Select value={f.batting_side} onValueChange={(v) => set("batting_side", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="L">L — batted left-handed</SelectItem>
              <SelectItem value="R">R — batted right-handed</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Position you were playing" help="Where you were in the field this game.">
          <Select value={f.position_played} onValueChange={(v) => set("position_played", v)}>
            <SelectTrigger><SelectValue placeholder="Pick" /></SelectTrigger>
            <SelectContent>
              {POSITIONS.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
            </SelectContent>
          </Select>
        </Field>
        <Field
          label="How the at-bat ended"
          help={abResultHelp(f.result) ?? "Pick what happened — each option is spelled out."}
        >
          <Select value={f.result} onValueChange={(v) => set("result", v)}>
            <SelectTrigger><SelectValue placeholder="Pick" /></SelectTrigger>
            <SelectContent>
              {RESULTS.map((r) => (
                <SelectItem key={r.code} value={r.code}>
                  {r.code} — {r.plain}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Balls in the count" help="How many balls the pitcher threw you.">
          <NumberField min={0} max={4} value={f.count_balls}
            onValueChange={(v) => set("count_balls", v ?? 0)} />
        </Field>
        <Field label="Strikes in the count" help="How many strikes you had against you.">
          <NumberField min={0} max={3} value={f.count_strikes}
            onValueChange={(v) => set("count_strikes", v ?? 0)} />
        </Field>
        <Field label="How well you hit it" help="Contact quality — how cleanly the ball came off the bat.">
          <Select value={f.contact_quality} onValueChange={(v) => set("contact_quality", v)}>
            <SelectTrigger><SelectValue placeholder="Pick" /></SelectTrigger>
            <SelectContent>
              {CONTACT.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.plain}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Pitch type you hit (or last saw)" help="What the pitcher threw.">
          <Select value={f.pitch_type} onValueChange={(v) => set("pitch_type", v)}>
            <SelectTrigger><SelectValue placeholder="Pick" /></SelectTrigger>
            <SelectContent>
              {PITCH_TYPES.map((p) => (<SelectItem key={p.value} value={p.value}>{p.full}</SelectItem>))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Pitch speed (mph)" help="How fast the pitch was, if you know it.">
          <NumberField value={f.pitch_velo}
            onChange={(e) => set("pitch_velo", e.target.value)} />
        </Field>
        <Field label="Outs when you came up" help="How many outs the team already had (0, 1 or 2).">
          <NumberField min={0} max={2} value={f.outs}
            onValueChange={(v) => set("outs", v ?? 0)} />
        </Field>
        <Field
          label="Which bases had runners on them"
          help="Type the base numbers, e.g. 1,3 means a runner on first base and a runner on third base. Leave blank if the bases were empty."
        >
          <Input placeholder="e.g. 1,3" value={f.runners_on}
            onChange={(e) => set("runners_on", e.target.value)} />
        </Field>
        <Field label="Runs you drove in (RBI)" help="How many teammates scored because of your at-bat.">
          <NumberField min={0} value={f.rbi}
            onValueChange={(v) => set("rbi", v ?? 0)} />
        </Field>
        <Field
          label="Runners you left on base (LOB)"
          help="Runners who were still standing on base when your at-bat ended without scoring."
        >
          <NumberField min={0} value={f.lob}
            onValueChange={(v) => set("lob", v ?? 0)} />
        </Field>
        <Field
          label="Home-to-first run time (seconds)"
          help="How long it took you to run from home plate to first base, if someone timed it."
        >
          <NumberField step="0.01" value={f.h1_time_sec}
            onChange={(e) => set("h1_time_sec", e.target.value)} />
        </Field>
      </div>

      <div className="space-y-1">
        <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Where the ball went
        </Label>
        <FieldDirectionPicker
          value={f.exit_direction || null}
          onChange={(code) => set("exit_direction", code ?? "")}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="ph"
          type="checkbox"
          checked={f.is_pinch_hit}
          onChange={(e) => set("is_pinch_hit", e.target.checked)}
        />
        <Label htmlFor="ph" className="text-xs">
          Pinch hit (PH) — you batted in place of a teammate
        </Label>
      </div>
      <Field label="Your own notes" help="Anything you want to remember, in your own words.">
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

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
      {help && <FieldHelp>{help}</FieldHelp>}
    </div>
  );
}

