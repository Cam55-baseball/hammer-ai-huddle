import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Minus, FlipHorizontal } from "lucide-react";
import type { RoundField } from "./logTemplates";

export type Round = Record<string, string>;

interface Props {
  fields: RoundField[];
  rounds: Round[];
  onChange: (rounds: Round[]) => void;
  minRounds?: number;
  maxRounds?: number;
  /** Flag rounds missing a side (unilateral movements). */
  highlightMissingSide?: boolean;
}

const QUALITY_SCALE = [1, 2, 3, 4, 5] as const;
const SIDES = ["L", "R"] as const;

export function RoundGrid({
  rounds,
  fields,
  onChange,
  minRounds = 1,
  maxRounds = 24,
  highlightMissingSide = false,
}: Props) {
  const hasSide = fields.some((f) => f.kind === "side");

  const setCell = (idx: number, key: string, value: string) => {
    const next = rounds.map((r, i) => (i === idx ? { ...r, [key]: value } : r));
    onChange(next);
  };

  const addRound = () => {
    if (rounds.length >= maxRounds) return;
    const last = rounds[rounds.length - 1] ?? {};
    const next = { ...last };
    if (hasSide) next.side = last.side === "L" ? "R" : "L";
    onChange([...rounds, next]);
  };

  const removeRound = () => {
    if (rounds.length <= minRounds) return;
    onChange(rounds.slice(0, -1));
  };

  /** Copy every logged round to the opposite side — one tap for side two. */
  const mirrorSides = () => {
    const sided = rounds.filter((r) => r.side === "L" || r.side === "R");
    if (!sided.length) return;
    const from = sided[0].side;
    const source = sided.filter((r) => r.side === from);
    const target = from === "L" ? "R" : "L";
    const mirrored = source.map((r) => ({ ...r, side: target }));
    onChange([...rounds.filter((r) => r.side === from), ...mirrored].slice(0, maxRounds));
  };


  return (
    <div className="space-y-2">
      <div
        className="grid gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground px-1"
        style={{ gridTemplateColumns: `28px repeat(${fields.length}, minmax(0, 1fr))` }}
      >
        <div />
        {fields.map((f) => (
          <div key={f.key} className="truncate">
            {f.label}
            {f.unit && <span className="ml-1 opacity-60">({f.unit})</span>}
            {f.optional && <span className="ml-1 opacity-50">·opt</span>}
          </div>
        ))}
      </div>

      {rounds.map((round, idx) => (
        <div
          key={idx}
          className="grid gap-1.5 items-center"
          style={{ gridTemplateColumns: `28px repeat(${fields.length}, minmax(0, 1fr))` }}
        >
          <div className="text-[11px] font-medium text-muted-foreground text-center">{idx + 1}</div>
          {fields.map((f) => {
            const value = round[f.key] ?? "";
            if (f.kind === "quality") {
              return (
                <div key={f.key} className="flex gap-0.5">
                  {QUALITY_SCALE.map((n) => {
                    const active = value === String(n);
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setCell(idx, f.key, active ? "" : String(n))}
                        className={`h-8 flex-1 min-w-0 rounded-md border text-xs transition-colors ${
                          active ? "border-primary bg-primary text-primary-foreground" : "bg-muted/30 hover:bg-accent"
                        }`}
                        aria-label={`${f.label} ${n}`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              );
            }
            if (f.kind === "side") {
              const missing = highlightMissingSide && value !== "L" && value !== "R";
              return (
                <div
                  key={f.key}
                  className={`flex gap-1 rounded-md ${missing ? "ring-1 ring-destructive/60" : ""}`}
                  aria-label="Side"
                >
                  {SIDES.map((s) => {
                    const active = value === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setCell(idx, f.key, active ? "" : s)}
                        className={`h-9 flex-1 rounded-md border text-xs font-medium transition-colors ${
                          active ? "border-primary bg-primary text-primary-foreground" : "bg-muted/30 hover:bg-accent"
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              );
            }

            return (
              <Input
                key={f.key}
                inputMode="decimal"
                type="text"
                value={value}
                placeholder="—"
                onChange={(e) => setCell(idx, f.key, e.target.value.replace(/[^\d.]/g, ""))}
                className="h-9 text-sm px-2"
              />
            );
          })}
        </div>
      ))}

      <div className="flex items-center gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={addRound} disabled={rounds.length >= maxRounds} className="h-7 gap-1 text-xs">
          <Plus className="h-3 w-3" /> Round
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={removeRound} disabled={rounds.length <= minRounds} className="h-7 gap-1 text-xs">
          <Minus className="h-3 w-3" /> Remove
        </Button>
        <div className="text-[10px] text-muted-foreground ml-auto">{rounds.length} round{rounds.length === 1 ? "" : "s"}</div>
      </div>
    </div>
  );
}
