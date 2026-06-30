/**
 * AtBatPitchPanel — inline pitch logger for one at-bat.
 *
 * Embedded under an expanded at-bat row in AtBatLogger. Provides:
 *   - Live count chip (B-S)
 *   - 6-button rapid entry (Ball, Called K, Swing K, Foul, In play, HBP)
 *   - Optional zone tag (defaults to "5" — middle)
 *   - Auto-close hint when ball-4 / strike-3 / in-play / HBP is reached;
 *     parent decides what to do with the suggestion (auto-populate AB result).
 *
 * Strict additive read/write over `gp_pitches`. Replay-safe (one canonical
 * insert per tap, full lineage to AB via `at_bat_id`).
 */
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { useAtBatPitches } from "@/hooks/useAtBatPitches";
import type { AtBatPitchTally } from "@/hooks/useAtBatPitches";
import { toast } from "sonner";

interface Props {
  gameId: string;
  atBatId: string;
  inning: number | null;
  onTerminal?: (tally: AtBatPitchTally) => void;
}

const QUICK: ReadonlyArray<{ key: string; label: string; result: string; tone: string }> = [
  { key: "B", label: "Ball", result: "ball", tone: "bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300" },
  { key: "K", label: "Called K", result: "called_strike", tone: "bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300" },
  { key: "W", label: "Swing K", result: "swinging_strike", tone: "bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300" },
  { key: "F", label: "Foul", result: "foul", tone: "bg-muted hover:bg-muted/70" },
  { key: "I", label: "In play", result: "in_play", tone: "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" },
  { key: "H", label: "HBP", result: "hbp", tone: "bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300" },
];

export function AtBatPitchPanel({ gameId, atBatId, inning, onTerminal }: Props) {
  const { list, add, del, tally } = useAtBatPitches(gameId, atBatId);
  const firedRef = useRef(false);

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
      toast.info("This at-bat already ended. Start a new AB to keep logging.");
      return;
    }
    add.mutate({
      result: result as any,
      inning,
      count_balls: tally.balls,
      count_strikes: tally.strikes,
    });
  };

  const handleDelete = (id: string) => {
    del.mutate(id, {
      onSuccess: () => {
        toast.success("Pitch removed");
      },
    });
  };

  return (
    <div className="mt-2 space-y-2 border-t pt-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="outline" className="font-mono text-sm">
            {tally.balls}-{tally.strikes}
          </Badge>
          <span className="text-muted-foreground">
            {(list.data ?? []).length} pitch{(list.data ?? []).length === 1 ? "" : "es"}
          </span>
          {tally.terminated && (
            <Badge variant="secondary" className="text-[10px]">
              ended · {tally.terminalReason}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
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

      {(list.data ?? []).length > 0 && (
        <ul className="space-y-1 mt-2">
          {(list.data ?? []).map((p, idx) => (
            <li
              key={p.id}
              className="flex items-center justify-between text-[11px] text-muted-foreground bg-muted/40 rounded px-2 py-1"
            >
              <span>
                <span className="font-mono mr-2">#{p.pitch_no ?? idx + 1}</span>
                {p.result ?? "—"}
                {p.pitch_type ? ` · ${p.pitch_type}` : ""}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(p.id)}
                className="text-rose-500 hover:text-rose-600"
                aria-label="Delete pitch"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!list.data?.length && (
        <p className="text-[11px] text-muted-foreground text-center py-1">
          No pitches yet — tap a result above. Walks and strikeouts auto-close the AB.
        </p>
      )}
    </div>
  );
}
