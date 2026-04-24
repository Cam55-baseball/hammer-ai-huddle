import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Activity } from "lucide-react";
import { useFunctionHealth } from "@/hooks/useFunctionHealth";
import { formatDistanceToNow } from "date-fns";

export function FunctionReliabilityPanel() {
  const [open, setOpen] = useState(false);
  const { rows, loading } = useFunctionHealth();

  const totalRuns = rows.reduce((s, r) => s + r.total_runs, 0);
  const overallSuccess = totalRuns > 0
    ? +(rows.reduce((s, r) => s + r.success_count, 0) * 100 / totalRuns).toFixed(1)
    : null;

  const headerColor = overallSuccess === null
    ? "text-muted-foreground"
    : overallSuccess >= 99 ? "text-emerald-600 dark:text-emerald-400"
    : overallSuccess >= 95 ? "text-amber-600 dark:text-amber-400"
    : "text-destructive";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Function Reliability</CardTitle>
            {overallSuccess !== null && (
              <span className={`text-xs font-mono tabular-nums ${headerColor}`}>
                {overallSuccess}% / {totalRuns} runs (24h)
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(o => !o)}
            className="h-7 px-2"
          >
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {open && (
        <CardContent className="pt-0">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-9 bg-muted/40 rounded animate-pulse" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No function activity yet</p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b">
                    <th className="text-left font-medium py-2 px-2">Function</th>
                    <th className="text-right font-medium py-2 px-2">Success</th>
                    <th className="text-right font-medium py-2 px-2">Avg ms</th>
                    <th className="text-right font-medium py-2 px-2 hidden sm:table-cell">Runs</th>
                    <th className="text-right font-medium py-2 px-2">Last Error</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const rowClass = r.success_rate < 95
                      ? "bg-destructive/5"
                      : r.success_rate < 99 ? "bg-amber-500/5" : "";
                    const pillClass = r.success_rate < 95
                      ? "bg-destructive/15 text-destructive border-destructive/30"
                      : r.success_rate < 99
                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                      : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
                    return (
                      <tr key={r.function_name} className={`border-b border-border/40 ${rowClass}`}>
                        <td className="py-2 px-2 font-mono text-[11px] truncate max-w-[160px]">{r.function_name}</td>
                        <td className="py-2 px-2 text-right">
                          <Badge variant="outline" className={`tabular-nums ${pillClass}`}>
                            {r.success_rate}%
                          </Badge>
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums">
                          {r.avg_duration_ms ?? "—"}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums hidden sm:table-cell">
                          {r.total_runs}
                        </td>
                        <td className="py-2 px-2 text-right text-muted-foreground">
                          {r.last_error_at
                            ? formatDistanceToNow(new Date(r.last_error_at), { addSuffix: true })
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
