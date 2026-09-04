/**
 * AtBatPitchPanel — inline pitch logger for one at-bat.
 *
 * Parity with the Pitching tab: the same `StrikeZoneGrid` location picker,
 * the same sport-correct pitch-type list and the same optional velocity, all
 * written to `gp_pitches` with `perspective: 'hitter'` — including
 * `gp_pitches.location`, exactly as the pitcher path writes it.
 *
 * Fast path preserved: location and type are one tap each, velocity optional,
 * result buttons still log a pitch on their own.
 *
 * Strict additive read/write over `gp_pitches`. Replay-safe (one canonical
 * insert per tap, full lineage to AB via `at_bat_id`).
 */
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
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
}

const QUICK: ReadonlyArray<{ key: string; label: string; result: string; tone: string }> = [
  { key: "B", label: "Ball", result: "ball", tone: "bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300" },
  { key: "K", label: "Strike (no swing)", result: "called_strike", tone: "bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300" },
  { key: "W", label: "Swing & miss", result: "swinging_strike", tone: "bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300" },
  { key: "F", label: "Foul ball", result: "foul", tone: "bg-muted hover:bg-muted/70" },
  { key: "I", label: "Put in play", result: "in_play", tone: "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" },
  { key: "H", label: "Hit by pitch", result: "hbp", tone: "bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300" },
];

export function AtBatPitchPanel({ gameId, atBatId, inning, sport, onTerminal }: Props) {
  const { list, add, del, tally } = useAtBatPitches(gameId, atBatId);
  const firedRef = useRef(false);
  const PITCH_TYPES = pitchTypes(sport);

  const [zoneVal, setZoneVal] = useState<{ zone: Zone | null; outZone?: OutZone }>({ zone: null });
  const [pitchType, setPitchType] = useState<string>("");
  const [velo, setVelo] = useState<string>("");

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

  const log = (result: string) => {
    if (tally.terminated) {
      toast.info("This at-bat already ended. Start a new at-bat to keep logging.");
      return;
    }
    const location = zoneVal.zone != null || zoneVal.outZone ? zoneVal : null;
    add.mutate(
      {
        result: result as any,
        inning,
        count_balls: tally.balls,
        count_strikes: tally.strikes,
        pitch_type: pitchType || null,
        pitch_velo: velo === "" ? null : Number(velo),
        location: location as any,
      },
      {
        onSuccess: () => {
          toast.success(
            `Saved: ${describePitch({
              result,
              pitch_type_full: pitchType ? pitchTypeLabel(sport, pitchType) : null,
              zone: zoneVal.zone ?? zoneVal.outZone ?? null,
            })}`
          );
          // Keep type sticky (pitchers repeat), clear the one-off fields.
          setZoneVal({ zone: null });
          setVelo("");
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

  const rows = list.data ?? [];
  const missingLocation = rows.filter((p) => p.location?.zone == null && !p.location?.outZone).length;

  return (
    <div className="mt-2 space-y-3 border-t pt-3">
      <div className="space-y-1">
        <p className="text-xs font-medium">Pitch-by-pitch (optional)</p>
        <FieldHelp>
          Log each pitch you saw in this at-bat. Tap where the pitch crossed the plate,
          pick the type, then tap what happened. Four balls or three strikes closes the
          at-bat for you.
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

      <div className="flex flex-wrap gap-4">
        <div className="space-y-1">
          <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Where the pitch was
          </Label>
          <StrikeZoneGrid value={zoneVal} onChange={setZoneVal} size={150} />
          <FieldHelp>
            The square is the strike zone seen from behind the catcher. Outer bands are
            pitches that missed: UP (high), DN (low), IN (inside), OUT (outside).
          </FieldHelp>
        </div>

        <div className="space-y-2 min-w-[10rem] flex-1">
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Pitch type
            </Label>
            <div className="flex flex-wrap gap-1">
              {PITCH_TYPES.map((t) => (
                <Badge
                  key={t.value}
                  variant={pitchType === t.value ? "default" : "outline"}
                  className="cursor-pointer select-none text-[10px]"
                  title={t.full}
                  onClick={() => setPitchType(pitchType === t.value ? "" : t.value)}
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

      <div>
        <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
          What happened on the pitch
        </Label>
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

      {!rows.length && (
        <p className="text-[11px] text-muted-foreground text-center py-1">
          No pitches logged yet — the at-bat is already saved without them.
        </p>
      )}
    </div>
  );
}
