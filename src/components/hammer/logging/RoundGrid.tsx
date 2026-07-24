import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import type { RoundField } from "./logTemplates";

export type Round = Record<string, string>;

interface Props {
  fields: RoundField[];
  rounds: Round[];
  onChange: (rounds: Round[]) => void;
  minRounds?: number;
  maxRounds?: number;
}

export function RoundGrid({ fields, rounds, onChange, minRounds = 1, maxRounds = 20 }: Props) {
  const setCell = (idx: number, key: string, value: string) => {
    const next = rounds.map((r, i) => (i === idx ? { ...r, [key]: value } : r));
    onChange(next);
  };

  const addRound = () => {
    if (rounds.length >= maxRounds) return;
    const last = rounds[rounds.length - 1] ?? {};
    onChange([...rounds, { ...last }]);
  };

  const removeRound = () => {
    if (rounds.length <= minRounds) return;
    onChange(rounds.slice(0, -1));
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
          {fields.map((f) => (
            <Input
              key={f.key}
              inputMode="decimal"
              type="text"
              value={round[f.key] ?? ""}
              placeholder="—"
              onChange={(e) => setCell(idx, f.key, e.target.value.replace(/[^\d.]/g, ""))}
              className="h-9 text-sm px-2"
            />
          ))}
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
