/**
 * SplitTable — the only sanctioned way to render a game-ledger split.
 *
 * Hard rules baked in:
 *   - Every row shows its sample size (n).
 *   - Rows below the threshold render "not enough data yet" and NOTHING else.
 *   - A missing measure renders an em dash, never a zero, never a guess.
 */
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MIN_N, hasEnough } from "@/lib/games/reader";

export interface SplitCell {
  label: string;
  /** Already-formatted string, or null when the underlying value is missing. */
  value: string | null;
}

export interface SplitRowData {
  key: string;
  label: string;
  n: number;
  cells: SplitCell[];
}

export function NotEnoughData({ n, min = MIN_N }: { n?: number; min?: number }) {
  return (
    <span className="text-xs text-muted-foreground italic">
      Not enough data yet{typeof n === "number" ? ` — ${n} of ${min} reps` : ""}
    </span>
  );
}

export function SampleBadge({ n }: { n: number }) {
  return (
    <Badge variant="outline" className="text-[10px] font-mono shrink-0" title="Sample size">
      n={n}
    </Badge>
  );
}

export function SplitTable({
  title,
  description,
  rows,
  min = MIN_N,
  emptyLabel = "Nothing logged yet.",
}: {
  title: string;
  description?: string;
  rows: SplitRowData[];
  min?: number;
  emptyLabel?: string;
}) {
  const sorted = [...rows].sort((a, b) => b.n - a.n);

  return (
    <Card className="p-4 space-y-3">
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>

      {sorted.length === 0 && (
        <p className="text-xs text-muted-foreground italic">{emptyLabel}</p>
      )}

      <ul className="space-y-2">
        {sorted.map((r) => {
          const enough = hasEnough(r.n, min);
          return (
            <li
              key={r.key}
              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded border-l-2 border-l-primary/40 bg-muted/25 px-2.5 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium truncate">{r.label}</span>
                <SampleBadge n={r.n} />
              </div>
              {enough ? (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  {r.cells.map((c) => (
                    <span key={c.label} className="text-xs">
                      <span className="text-muted-foreground">{c.label} </span>
                      <span className="font-mono font-medium">{c.value ?? "—"}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <NotEnoughData n={r.n} min={min} />
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
