/**
 * AtBatPitchPanel — the single place a pitch gets recorded for an at-bat.
 *
 * Pitch information lives in `gp_pitches` only. The at-bat form no longer
 * asks for pitch type / speed / location; whatever an at-bat shows about
 * pitches is derived from the rows logged here (and from legacy at-bat-level
 * values that were migrated into a single pitch row).
 *
 * Two honest paths, one data shape:
 *   - "Log every pitch"      → one `gp_pitches` row per pitch.
 *   - "Just the pitch I hit" → exactly one `gp_pitches` row, marked in play.
 *
 * The entry sequence is explicit: 1 where, 2 what, 3 what happened. The
 * pending pitch is always visible before it saves, carried-over values are
 * labelled and clearable, and anything not selected is reported as not
 * recorded rather than guessed.
 */
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, X } from "lucide-react";
import { useAtBatPitches } from "@/hooks/useAtBatPitches";
import type { AtBatPitchTally } from "@/hooks/useAtBatPitches";
import { showUndoToast } from "@/lib/games/undoToast";
import { toast } from "sonner";
import { StrikeZoneGrid, type Zone, type OutZone } from "./StrikeZoneGrid";
import { NumberField } from "@/components/games/NumberField";
import { Label } from "@/components/ui/label";
import { pitchTypes, pitchTypeLabel } from "@/lib/games/sportRules";
import { describePitch, pitchResultPlain } from "@/lib/games/glossary";
import { FieldHelp } from "./TabIntro";

interface Props {
  gameId: string;
  atBatId: string;
  inning: number | null;
  sport: string;
  onTerminal?: (tally: AtBatPitchTally) => void;
  /** Fires whenever the pitch-derived count changes, terminal or not. */
  onTally?: (tally: AtBatPitchTally) => void;
}

const QUICK: ReadonlyArray<{ key: string; label: string; result: string; tone: string }> = [
  { key: "B", label: "Ball", result: "ball", tone: "bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300" },
  { key: "K", label: "Strike (no swing)", result: "called_strike", tone: "bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300" },
  { key: "W", label: "Swing & miss", result: "swinging_strike", tone: "bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300" },
  { key: "F", label: "Foul ball", result: "foul", tone: "bg-muted hover:bg-muted/70" },
  { key: "I", label: "Put in play", result: "in_play", tone: "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" },
  { key: "H", label: "Hit by pitch", result: "hbp", tone: "bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300" },
];

function StepLabel({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
        {n}
      </span>
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{children}</Label>
    </div>
  );
}

export function AtBatPitchPanel({ gameId, atBatId, inning, sport, onTerminal, onTally }: Props) {
  const { list, add, del, tally } = useAtBatPitches(gameId, atBatId);
  const firedRef = useRef(false);
  const PITCH_TYPES = pitchTypes(sport);

  const [zoneVal, setZoneVal] = useState<{ zone: Zone | null; outZone?: OutZone }>({ zone: null });
  const [pitchType, setPitchType] = useState<string>("");
  const [velo, setVelo] = useState<string>("");
  /** True once a pitch has saved and the type stayed selected for the next one. */
  const [typeCarriedOver, setTypeCarriedOver] = useState(false);
  const [mode, setMode] = useState<"all" | "one" | null>(null);

  const rows = list.data ?? [];
  const effectiveMode: "all" | "one" | null = mode ?? (rows.length > 0 ? "all" : null);

  // Fire onTerminal exactly once per terminal transition.
  useEffect(() => {
    if (tally.terminated && !firedRef.current) {
      firedRef.current = true;
      onTerminal?.(tally);
    }
    if (!tally.terminated && firedRef.current) {
      firedRef.current = false;
    }
  }, [tally, onTerminal]);

  // Count always syncs upward — result and count are separate concerns.
  useEffect(() => {
    if (!list.data) return;
    onTally?.(tally);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tally.balls, tally.strikes, list.data]);

  const hasLocation = zoneVal.zone != null || !!zoneVal.outZone;
  const locationText = zoneVal.zone != null
    ? `zone ${zoneVal.zone}`
    : zoneVal.outZone
    ? `missed ${zoneVal.outZone}`
    : null;

  const log = (result: string) => {
    if (tally.terminated) {
      toast.info("This at-bat already ended. Start a new at-bat to keep logging.");
      return;
    }
    const location = hasLocation ? zoneVal : null;
    const usedType = pitchType;
    add.mutate(
      {
        result: result as any,
        inning,
        count_balls: tally.balls,
        count_strikes: tally.strikes,
        pitch_type: usedType || null,
        pitch_velo: velo === "" ? null : Number(velo),
        location: location as any,
      },
      {
        onSuccess: () => {
          const missing: string[] = [];
          if (!location) missing.push("location");
          if (!usedType) missing.push("pitch type");
          toast.success(
            `Saved: ${describePitch({
              result,
              pitch_type_full: usedType ? pitchTypeLabel(sport, usedType) : null,
              zone: zoneVal.zone ?? zoneVal.outZone ?? null,
            })}`,
            missing.length
              ? { description: `Not recorded on this pitch: ${missing.join(" and ")}.` }
              : undefined
          );
          // Keep type sticky (pitchers repeat), clear the one-off fields.
          setZoneVal({ zone: null });
          setVelo("");
          setTypeCarriedOver(!!usedType);
        },
      }
    );
  };

  const handleDelete = (id: string) => {
    const prev = (list.data ?? []).find((p) => p.id === id) ?? null;
    del.mutate(id, {
      onSuccess: () => {
        showUndoToast({
          label: "Pitch removed",
          undo: async () => {
            if (!prev) return;
            const { id: _id, created_at: _ca, pitch_no: _pn, ...restore } = prev as any;
            await add.mutateAsync(restore);
          },
        });
      },
    });
  };

  const missingLocation = rows.filter((p) => p.location?.zone == null && !p.location?.outZone).length;

  const zoneAndType = (
    <div className="flex flex-wrap gap-4">
      <div className="space-y-1">
        <StepLabel n={1}>Where the pitch was</StepLabel>
        <StrikeZoneGrid value={zoneVal} onChange={setZoneVal} size={150} />
        <FieldHelp>
          The square is the strike zone seen from behind the catcher. Outer bands are
          pitches that missed: UP (high), DN (low), IN (inside), OUT (outside).
        </FieldHelp>
      </div>

      <div className="space-y-2 min-w-[10rem] flex-1">
        <div className="space-y-1">
          <StepLabel n={2}>What the pitch was</StepLabel>
          <div className="flex flex-wrap gap-1">
            {PITCH_TYPES.map((t) => (
              <Badge
                key={t.value}
                variant={pitchType === t.value ? "default" : "outline"}
                className="cursor-pointer select-none text-[10px]"
                title={t.full}
                onClick={() => {
                  setPitchType(pitchType === t.value ? "" : t.value);
                  setTypeCarriedOver(false);
                }}
              >
                {t.full}
              </Badge>
            ))}
          </div>
          <FieldHelp>What the pitcher threw. One tap. Leave blank if you don't know.</FieldHelp>
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Pitch speed (mph) — optional
          </Label>
          <NumberField
            value={velo}
            onChange={(e) => setVelo(e.target.value)}
            placeholder="e.g. 82"
          />
        </div>
      </div>
    </div>
  );

  const pendingCard = (
    <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">This pitch</p>
      <p className="text-xs">
        {locationText ?? <span className="text-muted-foreground">location not chosen</span>}
        {" · "}
        {pitchType ? (
          pitchTypeLabel(sport, pitchType)
        ) : (
          <span className="text-muted-foreground">type not chosen</span>
        )}
        {" · "}
        {velo !== "" ? `${velo} mph` : <span className="text-muted-foreground">speed not entered</span>}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {typeCarriedOver && pitchType && (
          <Badge variant="secondary" className="text-[10px] gap-1">
            Carried over from the last pitch: {pitchTypeLabel(sport, pitchType)}
            <button
              type="button"
              aria-label="Clear carried-over pitch type"
              onClick={() => {
                setPitchType("");
                setTypeCarriedOver(false);
              }}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
        {(hasLocation || pitchType || velo !== "") && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[11px]"
            onClick={() => {
              setZoneVal({ zone: null });
              setPitchType("");
              setVelo("");
              setTypeCarriedOver(false);
            }}
          >
            Clear all three
          </Button>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Nothing is saved until you tap what happened below. Anything left blank is recorded
        as not known — never guessed.
      </p>
    </div>
  );

  return (
    <div className="mt-2 space-y-3 border-t pt-3">
      <div className="space-y-1">
        <p className="text-xs font-medium">Pitches in this at-bat (optional)</p>
        <FieldHelp>
          This is the only place pitch information is recorded. Everything the at-bat shows
          about pitches — the count, and the pitch you hit — comes from what you log here.
        </FieldHelp>
      </div>

      <div className="flex items-center gap-2 text-xs flex-wrap">
        <Badge variant="outline" className="font-mono text-sm">
          {tally.balls}-{tally.strikes}
        </Badge>
        <span className="text-muted-foreground">
          {tally.balls} ball{tally.balls === 1 ? "" : "s"}, {tally.strikes} strike
          {tally.strikes === 1 ? "" : "s"} · {rows.length} pitch{rows.length === 1 ? "" : "es"} saved
        </span>
        {tally.terminated && (
          <Badge variant="secondary" className="text-[10px]">
            at-bat ended · {tally.terminalReason?.replace(/_/g, " ")}
          </Badge>
        )}
      </div>

      {effectiveMode === null && (
        <div className="rounded-md border border-dashed p-3 space-y-2">
          <p className="text-xs font-medium">How much do you want to log?</p>
          <FieldHelp>
            Both choices save the same kind of record — one saves every pitch, one saves only
            the pitch you put in play.
          </FieldHelp>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => setMode("all")}>
              Log every pitch
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setMode("one")}>
              Just the pitch I hit
            </Button>
          </div>
        </div>
      )}

      {effectiveMode === "one" && (
        <div className="space-y-3">
          {zoneAndType}
          {pendingCard}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={add.isPending || tally.terminated}
              onClick={() => log("in_play")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Save the pitch I hit
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setMode("all")}>
              Actually, log every pitch
            </Button>
          </div>
        </div>
      )}

      {effectiveMode === "all" && (
        <div className="space-y-3">
          {zoneAndType}
          {pendingCard}
          <div>
            <StepLabel n={3}>What happened on the pitch — this saves it</StepLabel>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-1">
              {QUICK.map((q) => (
                <Button
                  key={q.key}
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={tally.terminated || add.isPending}
                  onClick={() => log(q.result)}
                  className={`h-9 text-xs font-medium ${q.tone}`}
                >
                  <span className="opacity-50 mr-1.5 font-mono">{q.key}</span>
                  {q.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <>
          <ul className="space-y-1 mt-2">
            {rows.map((p, idx) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-2 text-xs bg-muted/30 rounded px-2 py-1.5 border-l-2 border-l-sky-500"
              >
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <span className="inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded bg-sky-500/15 px-1 text-[10px] font-semibold text-sky-700 dark:text-sky-300 font-mono">
                    #{p.pitch_no ?? idx + 1}
                  </span>
                  <span>{pitchResultPlain(p.result) ?? "Result not recorded"}</span>
                  <span className="text-muted-foreground">
                    {p.pitch_type ? pitchTypeLabel(sport, p.pitch_type) : "type not recorded"}
                  </span>
                  <span className="text-muted-foreground">
                    {p.location?.zone != null
                      ? `zone ${p.location.zone}`
                      : p.location?.outZone
                      ? `missed ${p.location.outZone}`
                      : "location not recorded"}
                  </span>
                  {p.pitch_velo != null && (
                    <span className="text-muted-foreground">{p.pitch_velo} mph</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  className="text-rose-500 hover:text-rose-600 shrink-0"
                  aria-label="Delete pitch"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
          {missingLocation > 0 && (
            <p className="text-[11px] text-muted-foreground">
              {missingLocation} of {rows.length} pitches have no location saved. Location is
              optional, but it's what powers your hot/cold zone maps.
            </p>
          )}
        </>
      )}

      {!rows.length && effectiveMode !== null && (
        <p className="text-[11px] text-muted-foreground text-center py-1">
          No pitches logged yet — the at-bat is already saved without them.
        </p>
      )}
    </div>
  );
}
