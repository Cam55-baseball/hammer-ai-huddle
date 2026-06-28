/**
 * CorrelationExplorer — user picks X and Y from a topic-whitelisted set,
 * sees a scatter + plain-language reading. Hidden when not enough data.
 */
import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { pearson, type NumericPoint } from "@/lib/progress/correlations";

export interface ExplorerVariable {
  readonly key: string;
  readonly label: string;
  /** date -> numeric value */
  readonly series: ReadonlyMap<string, number>;
}

interface Props {
  readonly variables: ReadonlyArray<ExplorerVariable>;
}

export function CorrelationExplorer({ variables }: Props) {
  const [xKey, setXKey] = useState(variables[0]?.key ?? "");
  const [yKey, setYKey] = useState(variables[1]?.key ?? variables[0]?.key ?? "");

  const x = variables.find((v) => v.key === xKey);
  const y = variables.find((v) => v.key === yKey);

  const points = useMemo<NumericPoint[]>(() => {
    if (!x || !y) return [];
    const out: NumericPoint[] = [];
    for (const [date, xv] of x.series.entries()) {
      const yv = y.series.get(date);
      if (typeof yv === "number") out.push({ x: xv, y: yv, date });
    }
    return out;
  }, [x, y]);

  const result = useMemo(() => pearson(points), [points]);

  if (variables.length < 2) return null;

  return (
    <div className="space-y-3 rounded-md border border-border/50 p-3 bg-muted/10">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] uppercase text-muted-foreground">X axis</label>
          <Select value={xKey} onValueChange={setXKey}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {variables.map((v) => (
                <SelectItem key={v.key} value={v.key} className="text-xs">
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[10px] uppercase text-muted-foreground">Y axis</label>
          <Select value={yKey} onValueChange={setYKey}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {variables.map((v) => (
                <SelectItem key={v.key} value={v.key} className="text-xs">
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {result ? (
        <>
          <div className="h-48 w-full">
            <ResponsiveContainer>
              <ScatterChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  type="number"
                  dataKey="x"
                  name={x?.label}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name={y?.label}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                <Scatter data={points as unknown as Record<string, unknown>[]} fill="hsl(var(--primary))" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground">{result.reading}</p>
        </>
      ) : (
        <p className="text-xs text-muted-foreground italic">
          Not enough overlapping data points yet (need {">"}= 5 shared days).
        </p>
      )}
    </div>
  );
}
